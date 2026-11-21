<?php

namespace App\Services;

use App\Models\PaidPlan;
use App\Models\PaidPlanPriceChange;
use App\Models\User;
use Illuminate\Database\Capsule\Manager as DB;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

final class PaidPlanService
{
    public const PLAN_KEY = 'paid';
    public const PLAN_NAME = 'Ето ме — Платен план';

    public function __construct(
        private readonly StripeCatalogue $catalogue,
        private readonly PaidPlanPricePolicy $pricePolicy = new PaidPlanPricePolicy()
    ) {
    }

    public static function make(): self
    {
        return new self(new StripeCatalogueClient());
    }

    public function current(): ?PaidPlan
    {
        return PaidPlan::query()
            ->where('plan_key', self::PLAN_KEY)
            ->where('is_active', true)
            ->first();
    }

    public function configured(): ?PaidPlan
    {
        return PaidPlan::query()->where('plan_key', self::PLAN_KEY)->first();
    }

    public function publicData(?PaidPlan $plan = null): array
    {
        $plan ??= $this->configured();
        if (!$plan) {
            return [
                'configured' => false,
                'plan' => self::PLAN_KEY,
                'name' => self::PLAN_NAME,
                'currency' => PaidPlanPricePolicy::CURRENCY,
                'interval' => PaidPlanPricePolicy::INTERVAL,
                'interval_count' => PaidPlanPricePolicy::INTERVAL_COUNT,
                'is_active' => false,
                'version' => 0,
            ];
        }

        return [
            'configured' => $plan->stripe_price_id !== null
                && $plan->interval_unit === PaidPlanPricePolicy::INTERVAL
                && (int) $plan->interval_count === PaidPlanPricePolicy::INTERVAL_COUNT,
            'plan' => self::PLAN_KEY,
            'name' => $plan->name,
            'amount_cents' => (int) $plan->amount_cents,
            'currency' => $plan->currency,
            'interval' => $plan->interval_unit,
            'interval_count' => (int) $plan->interval_count,
            'is_active' => (bool) $plan->is_active,
            'stripe_mode' => $plan->stripe_mode,
            'stripe_account_id' => $plan->stripe_account_id,
            'stripe_product_id' => $plan->stripe_product_id,
            'stripe_price_id' => $plan->stripe_price_id,
            'version' => (int) $plan->version,
            'updated_at' => $plan->updated_at?->toISOString(),
        ];
    }

    public function changePrice(
        User $actor,
        int $amountCents,
        string $requestId,
        int $expectedVersion
    ): PaidPlan {
        $this->assertAdministrator($actor);
        $this->pricePolicy->assertAmountCents($amountCents);
        if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9._:-]{15,63}$/', $requestId)) {
            throw new InvalidArgumentException('Невалиден идентификатор на заявката.');
        }
        if ($expectedVersion < 0) {
            throw new InvalidArgumentException('Невалидна версия на настройката.');
        }

        $existingChange = PaidPlanPriceChange::query()->where('request_id', $requestId)->first();
        if ($existingChange) {
            if ($existingChange->status === 'completed') {
                $current = $this->configured();
                if ($current && $current->stripe_price_id === $existingChange->new_stripe_price_id) {
                    return $current;
                }
                throw new RuntimeException('Тази ценова промяна е завършена, но вече е заменена от по-нова версия.');
            }
            throw new RuntimeException('Тази промяна вече е обработена или се обработва.');
        }

        $snapshot = $this->configured();
        $snapshotVersion = $snapshot ? (int) $snapshot->version : 0;
        if ($snapshotVersion !== $expectedVersion) {
            throw new RuntimeException('Цената е променена от друг администратор. Презаредете страницата.');
        }

        $change = PaidPlanPriceChange::query()->create([
            'paid_plan_id' => $snapshot?->id,
            'actor_user_id' => $actor->id,
            'request_id' => $requestId,
            'old_amount_cents' => $snapshot?->amount_cents,
            'new_amount_cents' => $amountCents,
            'old_stripe_account_id' => $snapshot?->stripe_account_id,
            'old_stripe_product_id' => $snapshot?->stripe_product_id,
            'old_stripe_price_id' => $snapshot?->stripe_price_id,
            'stripe_mode' => 'test',
            'status' => 'pending',
        ]);

        try {
            $account = $this->catalogue->account();
            if ($account['livemode']) {
                throw new RuntimeException('За тази операция е разрешен само Stripe Sandbox.');
            }

            $sameAccount = $snapshot?->stripe_account_id === $account['account_id'];
            $product = $this->catalogue->ensureProduct(
                $sameAccount ? $snapshot?->stripe_product_id : null,
                self::PLAN_NAME
            );
            $price = $this->catalogue->createRecurringPrice(
                $product['id'],
                $amountCents,
                $requestId
            );

            $change->fill([
                'new_stripe_account_id' => $account['account_id'],
                'new_stripe_product_id' => $product['id'],
                'new_stripe_price_id' => $price['id'],
            ])->save();

            $plan = DB::connection()->transaction(function () use (
                $actor,
                $amountCents,
                $expectedVersion,
                $account,
                $product,
                $price,
                $change
            ): PaidPlan {
                $locked = PaidPlan::query()
                    ->where('plan_key', self::PLAN_KEY)
                    ->lockForUpdate()
                    ->first();
                $actualVersion = $locked ? (int) $locked->version : 0;
                if ($actualVersion !== $expectedVersion) {
                    throw new RuntimeException('Цената е променена от друг администратор.');
                }

                $values = [
                    'plan_key' => self::PLAN_KEY,
                    'name' => self::PLAN_NAME,
                    'amount_cents' => $amountCents,
                    'currency' => PaidPlanPricePolicy::CURRENCY,
                    'interval_unit' => PaidPlanPricePolicy::INTERVAL,
                    'interval_count' => PaidPlanPricePolicy::INTERVAL_COUNT,
                    'stripe_account_id' => $account['account_id'],
                    'stripe_product_id' => $product['id'],
                    'stripe_price_id' => $price['id'],
                    'stripe_mode' => 'test',
                    'version' => $actualVersion + 1,
                    'is_active' => $locked ? (bool) $locked->is_active : true,
                ];

                if ($locked) {
                    $locked->fill($values)->save();
                } else {
                    $locked = PaidPlan::query()->create($values);
                }

                $change->fill([
                    'paid_plan_id' => $locked->id,
                    'status' => 'completed',
                    'error_code' => null,
                ])->save();

                return $locked->fresh();
            });

            if ($snapshot?->stripe_price_id
                && $snapshot->stripe_account_id === $account['account_id']
                && $snapshot->stripe_price_id !== $price['id']) {
                try {
                    $this->catalogue->archivePrice($snapshot->stripe_price_id);
                } catch (Throwable) {
                    // The active mapping is already safe. A later reconciliation may archive it.
                }
            }

            return $plan;
        } catch (Throwable $error) {
            $change->fill([
                'status' => 'failed',
                'error_code' => $this->safeErrorCode($error),
            ])->save();
            throw $error;
        }
    }

    public function setAvailability(User $actor, bool $isActive, int $expectedVersion): PaidPlan
    {
        $this->assertAdministrator($actor);
        if ($expectedVersion < 1) {
            throw new InvalidArgumentException('Първо задайте цена на платения план.');
        }

        return DB::connection()->transaction(function () use ($isActive, $expectedVersion): PaidPlan {
            $plan = PaidPlan::query()
                ->where('plan_key', self::PLAN_KEY)
                ->lockForUpdate()
                ->first();
            if (!$plan || !$plan->stripe_price_id) {
                throw new InvalidArgumentException('Първо задайте цена на платения план.');
            }
            if ((int) $plan->version !== $expectedVersion) {
                throw new RuntimeException('Настройката е променена от друг администратор. Презаредете страницата.');
            }
            if ((bool) $plan->is_active === $isActive) {
                return $plan;
            }

            $plan->fill([
                'is_active' => $isActive,
                'version' => $expectedVersion + 1,
            ])->save();

            return $plan->fresh();
        });
    }

    private function assertAdministrator(User $user): void
    {
        if ($user->role !== User::ROLE_ADMIN || !$user->is_active) {
            throw new RuntimeException('Нямате права за промяна на абонаментния план.');
        }
    }

    private function safeErrorCode(Throwable $error): string
    {
        return match (true) {
            $error instanceof InvalidArgumentException => 'invalid_input',
            str_contains($error->getMessage(), 'друг администратор') => 'version_conflict',
            default => 'provider_or_storage_failure',
        };
    }
}
