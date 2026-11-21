<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\SubscriptionCancellationRequest;
use App\Models\SubscriptionRenewalChange;
use App\Models\User;
use Illuminate\Database\Capsule\Manager as DB;
use RuntimeException;

final class SubscriptionCancellationService
{
    public function cancelImmediately(User $user): Subscription
    {
        if (PaymentsFeature::isEnabled() || !StripeSandboxFeature::enabledFor($user)) {
            throw new RuntimeException('Преминаването към безплатен план не е достъпно.');
        }

        $local = Subscription::query()
            ->where('user_id', $user->id)
            ->where('plan', PaidPlanService::PLAN_KEY)
            ->whereIn('status', ['active', 'trialing'])
            ->where('current_period_end', '>', date('Y-m-d H:i:s'))
            ->latest('id')
            ->first();
        if (!$local) {
            $latest = Subscription::query()
                ->where('user_id', $user->id)
                ->where('plan', PaidPlanService::PLAN_KEY)
                ->latest('id')
                ->first();
            if ($latest) {
                $user->setAutoRenewal(false);
                return $latest;
            }
            throw new RuntimeException('Няма активен платен абонамент.');
        }
        if (!str_starts_with((string) $local->stripe_subscription_id, 'sub_')) {
            throw new RuntimeException('Платеният абонамент няма валиден Stripe идентификатор.');
        }

        $request = DB::connection()->transaction(function () use ($user, $local): SubscriptionCancellationRequest {
            $locked = Subscription::query()->whereKey($local->id)->lockForUpdate()->firstOrFail();
            $pendingCancellation = SubscriptionCancellationRequest::query()
                ->where('stripe_subscription_id', $locked->stripe_subscription_id)
                ->whereIn('status', ['pending', 'provider_applied'])
                ->exists();
            if ($pendingCancellation) {
                throw new RuntimeException('Преминаването към безплатен план още се синхронизира.');
            }
            $pendingRenewal = SubscriptionRenewalChange::query()
                ->where('stripe_subscription_id', $locked->stripe_subscription_id)
                ->whereIn('status', ['pending', 'provider_applied'])
                ->exists();
            if ($pendingRenewal) {
                throw new RuntimeException('Промяна на автоматичното подновяване още се синхронизира.');
            }

            return SubscriptionCancellationRequest::query()->create([
                'request_id' => bin2hex(random_bytes(16)),
                'user_id' => $user->id,
                'subscription_id' => $locked->id,
                'stripe_subscription_id' => $locked->stripe_subscription_id,
                'status' => 'pending',
            ]);
        });

        try {
            $provider = (new StripeSubscriptionClient())->cancelImmediately(
                (string) $local->stripe_subscription_id
            );
            if (($provider['status'] ?? null) !== 'canceled') {
                throw new RuntimeException('Stripe не потвърди прекратяването на абонамента.');
            }
        } catch (\Throwable $error) {
            $request->fill(['status' => 'provider_failed', 'error_code' => 'provider_cancel_failed'])->save();
            throw $error instanceof RuntimeException
                ? $error
                : new RuntimeException('Stripe не можа да прекрати абонамента.');
        }

        try {
            return DB::connection()->transaction(function () use ($user, $provider, $request): Subscription {
                $subscription = (new SubscriptionService())->persistProviderSubscription((int) $user->id, $provider);
                $user->setAutoRenewal(false);
                $request->fill(['status' => 'completed', 'error_code' => null])->save();
                return $subscription;
            });
        } catch (\Throwable) {
            try {
                $request->fill(['status' => 'provider_applied', 'error_code' => 'local_persist_failed'])->save();
            } catch (\Throwable) {
                // The durable request already records that cancellation began.
            }
            throw new RuntimeException('Stripe прекрати абонамента, но локалното състояние още се синхронизира. Обновете след малко.');
        }
    }
}
