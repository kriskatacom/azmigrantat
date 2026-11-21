<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\SubscriptionRenewalChange;
use App\Models\User;
use Illuminate\Database\Capsule\Manager as DB;
use RuntimeException;

final class SubscriptionRenewalService
{
    public function update(User $user, bool $enabled): Subscription
    {
        if (PaymentsFeature::isEnabled() || !StripeSandboxFeature::enabledFor($user)) {
            throw new RuntimeException('Управлението на подновяването не е достъпно.');
        }

        $local = Subscription::query()
            ->where('user_id', $user->id)
            ->where('plan', PaidPlanService::PLAN_KEY)
            ->whereIn('status', ['active', 'trialing'])
            ->where('current_period_end', '>', date('Y-m-d H:i:s'))
            ->latest('id')
            ->first();
        if (!$local || !str_starts_with((string) $local->stripe_subscription_id, 'sub_')) {
            throw new RuntimeException('Няма активен платен абонамент.');
        }

        $change = DB::connection()->transaction(function () use ($user, $local, $enabled): SubscriptionRenewalChange {
            $locked = Subscription::query()->whereKey($local->id)->lockForUpdate()->firstOrFail();
            $pending = SubscriptionRenewalChange::query()
                ->where('stripe_subscription_id', $locked->stripe_subscription_id)
                ->whereIn('status', ['pending', 'provider_applied'])
                ->exists();
            if ($pending) {
                throw new RuntimeException('Предишна промяна на подновяването още се синхронизира.');
            }
            return SubscriptionRenewalChange::query()->create([
                'request_id' => bin2hex(random_bytes(16)),
                'user_id' => $user->id,
                'subscription_id' => $locked->id,
                'stripe_subscription_id' => $locked->stripe_subscription_id,
                'previous_auto_renewal' => !(bool) $locked->cancel_at_period_end,
                'requested_auto_renewal' => $enabled,
                'status' => 'pending',
            ]);
        });

        try {
            $provider = (new StripeSubscriptionClient())->setAutoRenewal(
                (string) $local->stripe_subscription_id,
                $enabled
            );
            if ((bool) ($provider['cancel_at_period_end'] ?? false) === $enabled) {
                throw new RuntimeException('Stripe не потвърди настройката за подновяване.');
            }
        } catch (\Throwable $error) {
            $change->fill(['status' => 'provider_failed', 'error_code' => 'provider_update_failed'])->save();
            throw $error instanceof RuntimeException
                ? $error
                : new RuntimeException('Настройката не можа да бъде потвърдена от Stripe.');
        }

        try {
            return DB::connection()->transaction(function () use ($user, $enabled, $provider, $change): Subscription {
                $user->setAutoRenewal($enabled);
                $subscription = (new SubscriptionService())->persistProviderSubscription((int) $user->id, $provider);
                $change->fill(['status' => 'completed', 'error_code' => null])->save();
                return $subscription;
            });
        } catch (\Throwable) {
            try {
                $change->fill(['status' => 'provider_applied', 'error_code' => 'local_persist_failed'])->save();
            } catch (\Throwable) {
                // The durable pending row already records the requested provider state.
            }
            throw new RuntimeException('Stripe потвърди промяната, но локалното състояние още се синхронизира. Обновете след малко.');
        }
    }
}
