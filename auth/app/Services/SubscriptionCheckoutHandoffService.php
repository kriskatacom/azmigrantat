<?php

namespace App\Services;

use App\Models\PaidPlan;
use App\Models\Subscription;
use App\Models\SubscriptionCheckoutHandoff;
use App\Models\User;
use Illuminate\Database\Capsule\Manager as DB;
use RuntimeException;

final class SubscriptionCheckoutHandoffService
{
    public function create(User $user): string
    {
        if (!StripeSandboxFeature::enabledFor($user)) {
            throw new RuntimeException('Тестовите плащания не са разрешени за този профил.');
        }

        $plan = PaidPlan::query()->where('plan_key', PaidPlanService::PLAN_KEY)->where('is_active', true)->first();
        if (!$plan || !$plan->stripe_price_id || $plan->stripe_mode !== 'test') {
            throw new RuntimeException('Платеният план още не е конфигуриран.');
        }

        return DB::connection()->transaction(function () use ($user, $plan): string {
            $lockedUser = User::query()->whereKey($user->id)->lockForUpdate()->first();
            if (!$lockedUser || !StripeSandboxFeature::enabledFor($lockedUser)) {
                throw new RuntimeException('Тестовите плащания не са разрешени за този профил.');
            }

            $alreadySubscribed = Subscription::query()
                ->where('user_id', $lockedUser->id)
                ->where('plan', PaidPlanService::PLAN_KEY)
                ->whereIn('status', ['active', 'trialing', 'past_due'])
                ->exists();
            if ($alreadySubscribed) {
                throw new RuntimeException('Този профил вече има активен или изискващ внимание платен абонамент.');
            }

            $token = bin2hex(random_bytes(32));
            $pendingCheckout = SubscriptionCheckoutHandoff::query()
                ->where('user_id', $lockedUser->id)
                ->whereIn('status', ['created', 'checkout_created'])
                ->where('expires_at', '>', date('Y-m-d H:i:s'))
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();
            if ($pendingCheckout) {
                $pendingCheckout->token_hash = hash('sha256', $token);
                $pendingCheckout->save();
                return $this->startUrl($token);
            }

            if ($lockedUser->wantsAutoRenewal()) {
                $lockedUser->setAutoRenewal(false);
            }

            SubscriptionCheckoutHandoff::query()->create([
                'public_id' => bin2hex(random_bytes(16)),
                'token_hash' => hash('sha256', $token),
                'user_id' => $lockedUser->id,
                'plan_key' => PaidPlanService::PLAN_KEY,
                'status' => 'created',
                'stripe_account_id' => $plan->stripe_account_id,
                'stripe_price_id' => $plan->stripe_price_id,
                'play_external_transaction_token' => null,
                'expires_at' => date('Y-m-d H:i:s', time() + 600),
            ]);

            return $this->startUrl($token);
        });
    }

    public function start(string $token): string
    {
        if (!StripeSandboxFeature::enabled()) {
            throw new RuntimeException('Тестовите плащания са изключени.');
        }

        $handoff = SubscriptionCheckoutHandoff::query()
            ->where('token_hash', hash('sha256', $token))
            ->first();
        if (!$handoff || $handoff->expires_at->isPast()) {
            throw new RuntimeException('Линкът за плащане е изтекъл.');
        }
        if ($handoff->status === 'checkout_created' && $handoff->stripe_session_id) {
            $session = (new StripeCheckoutClient())->retrieveSubscriptionSession(
                (string) $handoff->stripe_session_id,
                (int) $handoff->user_id,
                (string) $handoff->public_id
            );
            if ($session['status'] === 'open') {
                $this->consumeResumeToken($handoff, $token);
                return $session['url'];
            }
            if ($session['status'] === 'complete') {
                throw new RuntimeException('Плащането вече е завършено и се обработва.');
            }

            DB::connection()->transaction(function () use ($handoff): void {
                $locked = SubscriptionCheckoutHandoff::query()->whereKey($handoff->id)->lockForUpdate()->firstOrFail();
                if ($locked->status === 'checkout_created') {
                    $locked->fill([
                        'status' => 'expired',
                        'token_hash' => hash('sha256', random_bytes(32)),
                        'expires_at' => date('Y-m-d H:i:s'),
                    ])->save();
                }
            });
            throw new RuntimeException('Stripe Checkout сесията е изтекла. Натиснете бутона в приложението отново.');
        }
        if ($handoff->status !== 'created') {
            throw new RuntimeException('Линкът за плащане вече не е активен.');
        }

        $user = User::query()->find($handoff->user_id);
        if (!$user || !StripeSandboxFeature::enabledFor($user)) {
            throw new RuntimeException('Тестовото плащане не е разрешено.');
        }

        $session = (new StripeCheckoutClient())->createSubscriptionSession(
            (string) $handoff->stripe_price_id,
            (string) $user->email,
            (int) $user->id,
            (string) $handoff->public_id
        );

        DB::connection()->transaction(function () use ($handoff, $session): void {
            $locked = SubscriptionCheckoutHandoff::query()->whereKey($handoff->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== 'created') {
                throw new RuntimeException('Линкът за плащане вече е използван.');
            }
            $locked->fill([
                'status' => 'checkout_created',
                'stripe_session_id' => $session['id'],
                'token_hash' => hash('sha256', random_bytes(32)),
                'expires_at' => date('Y-m-d H:i:s', time() + 1800),
            ])->save();
        });

        return $session['url'];
    }

    private function startUrl(string $token): string
    {
        $businessUrl = rtrim((string) ($_ENV['BUSINESS_PUBLIC_URL'] ?? 'https://business.azmigrantat.com'), '/');
        return $businessUrl . '/subscriptions/start?token=' . rawurlencode($token);
    }

    private function consumeResumeToken(SubscriptionCheckoutHandoff $handoff, string $token): void
    {
        $tokenHash = hash('sha256', $token);
        DB::connection()->transaction(function () use ($handoff, $tokenHash): void {
            $locked = SubscriptionCheckoutHandoff::query()->whereKey($handoff->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== 'checkout_created'
                || !hash_equals((string) $locked->token_hash, $tokenHash)) {
                throw new RuntimeException('Линкът за плащане вече е използван.');
            }
            $locked->token_hash = hash('sha256', random_bytes(32));
            $locked->save();
        });
    }

    public function status(?string $sessionId, ?string $publicId): array
    {
        $query = SubscriptionCheckoutHandoff::query();
        if ($sessionId && str_starts_with($sessionId, 'cs_test_')) {
            $query->where('stripe_session_id', $sessionId);
        } elseif ($publicId && preg_match('/^[a-f0-9]{32}$/', $publicId)) {
            $query->where('public_id', $publicId);
        } else {
            throw new RuntimeException('Невалиден checkout идентификатор.');
        }

        $handoff = $query->first();
        if (!$handoff) {
            throw new RuntimeException('Checkout сесията не е намерена.');
        }

        return [
            'status' => $handoff->status,
            'completed' => $handoff->status === 'completed',
            'return_url' => 'chatapp://subscription-result?status=' . ($handoff->status === 'completed' ? 'success' : $handoff->status),
        ];
    }
}
