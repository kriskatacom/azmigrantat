<?php

namespace App\Services;

use App\Models\BillingEvent;
use App\Models\PaidPlan;
use App\Models\PaidPlanPriceChange;
use App\Models\Subscription;
use App\Models\SubscriptionCheckoutHandoff;
use App\Models\SubscriptionCancellationRequest;
use App\Models\SubscriptionRenewalChange;
use App\Models\User;
use Illuminate\Database\Capsule\Manager as DB;
use Illuminate\Database\QueryException;
use RuntimeException;

final class SubscriptionService
{
    public function plans(): array
    {
        $paid = PaidPlan::query()->where('plan_key', PaidPlanService::PLAN_KEY)->first();
        $available = $paid !== null
            && (bool) $paid->is_active
            && $paid->stripe_price_id !== null
            && $paid->interval_unit === PaidPlanPricePolicy::INTERVAL
            && (int) $paid->interval_count === PaidPlanPricePolicy::INTERVAL_COUNT
            && $paid->stripe_mode === 'test';

        return [
            'free' => [
                'name' => 'Безплатен план',
                'price_cents' => 0,
                'currency' => 'eur',
                'interval' => null,
                'configured' => true,
            ],
            'paid' => [
                'name' => PaidPlanService::PLAN_NAME,
                'price_cents' => $paid ? (int) $paid->amount_cents : null,
                'currency' => $paid?->currency ?? 'eur',
                'interval' => $paid?->interval_unit ?? PaidPlanPricePolicy::INTERVAL,
                'interval_count' => $paid ? (int) $paid->interval_count : PaidPlanPricePolicy::INTERVAL_COUNT,
                'active' => $paid !== null && (bool) $paid->is_active,
                'configured' => $available,
            ],
        ];
    }

    public function createCheckout(User $user, string $plan): string
    {
        if ($plan !== PaidPlanService::PLAN_KEY) {
            throw new RuntimeException('Избраният план не е конфигуриран за плащане.');
        }
        return (new SubscriptionCheckoutHandoffService())->create($user);
    }

    public function current(User $user): ?Subscription
    {
        $entitled = Subscription::query()
            ->where('user_id', $user->id)
            ->where('plan', PaidPlanService::PLAN_KEY)
            ->whereIn('status', ['active', 'trialing'])
            ->where('current_period_end', '>', date('Y-m-d H:i:s'))
            ->orderByDesc('current_period_end')
            ->first();
        return $entitled ?? Subscription::query()->where('user_id', $user->id)->latest('id')->first();
    }

    public function hasPaidEntitlement(User $user): bool
    {
        $subscription = $this->current($user);
        return $subscription !== null
            && $subscription->plan === PaidPlanService::PLAN_KEY
            && in_array($subscription->status, ['active', 'trialing'], true)
            && $subscription->current_period_end !== null
            && $subscription->current_period_end->isFuture();
    }

    public function handleWebhook(string $payload, string $signature): void
    {
        if (PaymentsFeature::isEnabled() || !StripeSandboxFeature::enabled()) {
            throw new RuntimeException('Разрешени са само Stripe Sandbox събития.');
        }
        $event = json_decode($payload, true);
        if (!is_array($event) || !isset($event['id'], $event['type'], $event['data']['object'])) {
            throw new RuntimeException('Невалиден Stripe webhook.');
        }
        if (StripeSandboxFeature::enabled() && !PaymentsFeature::isEnabled() && ($event['livemode'] ?? true) !== false) {
            throw new RuntimeException('Live Stripe събитие не е разрешено в Sandbox режим.');
        }
        $this->verifySignature($payload, $signature);
        DB::connection()->transaction(function () use ($event) {
            try {
                BillingEvent::create([
                    'stripe_event_id' => $event['id'],
                    'event_type' => $event['type'],
                    'processed_at' => date('Y-m-d H:i:s'),
                ]);
            } catch (QueryException $error) {
                if (BillingEvent::query()->where('stripe_event_id', $event['id'])->exists()) return;
                throw $error;
            }

            $object = $event['data']['object'];
            $type = $event['type'];
            if (in_array($type, ['checkout.session.completed', 'checkout.session.async_payment_succeeded'], true)) {
                $this->sync(
                    $object['subscription'] ?? null,
                    $object['customer'] ?? null,
                    $object['metadata'] ?? [],
                    null,
                    (int) ($event['created'] ?? 0),
                    (string) $event['id']
                );
                $this->completeHandoff($object);
            } elseif ($type === 'checkout.session.async_payment_failed') {
                $this->failHandoff($object);
            } elseif (str_starts_with($type, 'customer.subscription.')) {
                $this->sync(
                    $object['id'] ?? null,
                    $object['customer'] ?? null,
                    $object['metadata'] ?? [],
                    $object,
                    (int) ($event['created'] ?? 0),
                    (string) $event['id']
                );
            }
        });
    }

    private function completeHandoff(array $session): void
    {
        $publicId = (string) ($session['metadata']['checkout_handoff'] ?? '');
        $userId = (int) ($session['metadata']['user_id'] ?? 0);
        $sessionId = (string) ($session['id'] ?? '');
        $subscriptionId = (string) ($session['subscription'] ?? '');
        if (!preg_match('/^[a-f0-9]{32}$/', $publicId)
            || $userId <= 0
            || !str_starts_with($sessionId, 'cs_')
            || !str_starts_with($subscriptionId, 'sub_')) {
            return;
        }

        $handoff = SubscriptionCheckoutHandoff::query()
            ->where('public_id', $publicId)
            ->where('user_id', $userId)
            ->where('stripe_session_id', $sessionId)
            ->first();
        if (!$handoff || $handoff->status === 'completed') {
            return;
        }

        $handoff->fill([
            'status' => 'completed',
            'stripe_subscription_id' => $subscriptionId,
            'completed_at' => date('Y-m-d H:i:s'),
        ])->save();
    }

    private function failHandoff(array $session): void
    {
        $sessionId = (string) ($session['id'] ?? '');
        if (!str_starts_with($sessionId, 'cs_')) {
            return;
        }
        SubscriptionCheckoutHandoff::query()
            ->where('stripe_session_id', $sessionId)
            ->where('status', 'checkout_created')
            ->update(['status' => 'payment_failed', 'updated_at' => date('Y-m-d H:i:s')]);
    }

    private function sync(
        ?string $subscriptionId,
        ?string $customerId,
        array $metadata,
        ?array $subscription,
        int $eventCreated,
        string $eventId
    ): void
    {
        $userId = (int) ($metadata['user_id'] ?? 0);
        if (!$userId && $customerId) $userId = (int) (Subscription::query()->where('stripe_customer_id', $customerId)->value('user_id') ?? 0);
        if (!$userId || !$subscriptionId || $eventCreated <= 0 || !str_starts_with($eventId, 'evt_')) {
            throw new RuntimeException('Stripe събитието не съдържа валидна връзка към абонамент.');
        }
        $existing = Subscription::query()->where('stripe_subscription_id', $subscriptionId)->first();
        if ($existing && (int) $existing->last_stripe_event_created_at > $eventCreated) return;
        // Always read the provider's current object so delayed webhook payloads
        // cannot overwrite newer subscription state.
        $subscription = (new StripeSubscriptionClient())->retrieve($subscriptionId);
        $user = User::query()->find($userId);
        if (!$user || !$user->is_active) {
            throw new RuntimeException('Stripe абонаментът няма активен локален потребител.');
        }
        $this->assertExactPaidPrice($subscription);

        $pending = SubscriptionRenewalChange::query()
            ->where('stripe_subscription_id', $subscriptionId)
            ->whereIn('status', ['pending', 'provider_applied'])
            ->latest('id')
            ->first();
        $pendingCancellation = SubscriptionCancellationRequest::query()
            ->where('stripe_subscription_id', $subscriptionId)
            ->whereIn('status', ['pending', 'provider_applied'])
            ->latest('id')
            ->first();
        $desiredAutoRenewal = $existing
            ? ($pending ? (bool) $pending->requested_auto_renewal : $user->wantsAutoRenewal())
            : false;
        $providerIsActive = in_array((string) ($subscription['status'] ?? ''), ['active', 'trialing'], true);
        if ($providerIsActive) {
            $providerAutoRenewal = !((bool) ($subscription['cancel_at_period_end'] ?? false));
            if ($desiredAutoRenewal !== $providerAutoRenewal) {
                $subscription = (new StripeSubscriptionClient())->setAutoRenewal(
                    $subscriptionId,
                    $desiredAutoRenewal
                );
            }
        } else {
            $desiredAutoRenewal = false;
        }
        if (!$existing || $pending || !$providerIsActive) {
            $user->setAutoRenewal($desiredAutoRenewal);
        }
        $this->persistProviderSubscription(
            $userId,
            $subscription,
            PaidPlanService::PLAN_KEY,
            $customerId,
            $eventCreated,
            $eventId
        );
        if ($pending) $pending->fill(['status' => 'completed', 'error_code' => null])->save();
        if ($pendingCancellation) {
            $pendingCancellation->fill(['status' => 'completed', 'error_code' => null])->save();
        }
    }

    public function persistProviderSubscription(
        int $userId,
        array $subscription,
        string $plan = PaidPlanService::PLAN_KEY,
        ?string $customerId = null,
        ?int $eventCreated = null,
        ?string $eventId = null
    ): Subscription {
        $subscriptionId = (string) ($subscription['id'] ?? '');
        if ($userId <= 0 || !str_starts_with($subscriptionId, 'sub_')) {
            throw new RuntimeException('Невалидни данни за Stripe абонамент.');
        }
        $item = $subscription['items']['data'][0] ?? [];
        $this->assertExactPaidPrice($subscription);
        $priceId = $item['price']['id'] ?? null;
        $customerId ??= is_string($subscription['customer'] ?? null)
            ? $subscription['customer']
            : null;
        $periodStart = $subscription['current_period_start'] ?? $item['current_period_start'] ?? null;
        $periodEnd = $subscription['current_period_end'] ?? $item['current_period_end'] ?? null;

        $existing = Subscription::query()
            ->where('stripe_subscription_id', $subscriptionId)
            ->lockForUpdate()
            ->first();
        if ($existing && $eventCreated !== null
            && (int) $existing->last_stripe_event_created_at > $eventCreated) {
            return $existing;
        }
        $values = [
            'user_id' => $userId, 'plan' => $plan, 'stripe_customer_id' => $customerId,
            'stripe_price_id' => $priceId, 'status' => $subscription['status'] ?? 'unknown',
            'cancel_at_period_end' => (bool) ($subscription['cancel_at_period_end'] ?? false),
            'current_period_start' => $this->date($periodStart),
            'current_period_end' => $this->date($periodEnd),
        ];
        if ($eventCreated !== null) {
            $values['last_stripe_event_created_at'] = $eventCreated;
            $values['last_stripe_event_id'] = $eventId;
        }
        if ($existing) {
            $existing->fill($values)->save();
            return $existing->fresh();
        }
        return Subscription::query()->create(['stripe_subscription_id' => $subscriptionId] + $values);
    }

    private function verifySignature(string $payload, string $header): void
    {
        $secret = trim((string) ($_ENV['STRIPE_TEST_WEBHOOK_SECRET'] ?? getenv('STRIPE_TEST_WEBHOOK_SECRET') ?: ''));
        if ($secret === '') throw new RuntimeException('Липсва Stripe webhook secret.');
        $parts = [];
        foreach (explode(',', $header) as $part) { [$key, $value] = array_pad(explode('=', $part, 2), 2, ''); $parts[$key][] = $value; }
        $timestamp = (int) ($parts['t'][0] ?? 0);
        $expected = $timestamp > 0
            ? hash_hmac('sha256', $timestamp . '.' . $payload, $secret)
            : '';
        $valid = false;
        foreach ($parts['v1'] ?? [] as $candidate) {
            if ($expected !== '' && hash_equals($expected, $candidate)) {
                $valid = true;
                break;
            }
        }
        if (!$timestamp || abs(time() - $timestamp) > 300 || !$valid) {
            throw new RuntimeException('Невалиден Stripe webhook подпис.');
        }
    }

    private function assertExactPaidPrice(array $subscription): void
    {
        $item = $subscription['items']['data'][0] ?? null;
        $price = is_array($item) ? ($item['price'] ?? null) : null;
        $priceId = is_array($price) ? (string) ($price['id'] ?? '') : '';
        $recurring = is_array($price) ? ($price['recurring'] ?? null) : null;
        $known = PaidPlan::query()->where('stripe_price_id', $priceId)->exists()
            || PaidPlanPriceChange::query()
                ->where('new_stripe_price_id', $priceId)
                ->where('status', 'completed')
                ->exists();
        if (!$known
            || !is_array($recurring)
            || ($recurring['interval'] ?? null) !== PaidPlanPricePolicy::INTERVAL
            || (int) ($recurring['interval_count'] ?? 0) !== PaidPlanPricePolicy::INTERVAL_COUNT) {
            throw new RuntimeException('Stripe абонаментът не използва одобрена 30-дневна цена.');
        }
        $start = $subscription['current_period_start'] ?? $item['current_period_start'] ?? null;
        $end = $subscription['current_period_end'] ?? $item['current_period_end'] ?? null;
        if ($start && $end && (int) $end - (int) $start !== 30 * 86400) {
            throw new RuntimeException('Stripe периодът не е точно 30 дни.');
        }
    }
    private function date($timestamp): ?string { return $timestamp ? date('Y-m-d H:i:s', (int) $timestamp) : null; }
}
