<?php

namespace App\Services;

use App\Models\PaymentMethod;
use App\Models\User;

final class PaymentMethodService
{
    public function listFor(User $user)
    {
        return PaymentMethod::query()
            ->where('user_id', $user->id)
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->get();
    }

    public function setDefault(User $user, int $id): ?PaymentMethod
    {
        $method = PaymentMethod::query()
            ->where('user_id', $user->id)
            ->where('id', $id)
            ->first();

        if (!$method) {
            return null;
        }

        PaymentMethod::query()
            ->where('user_id', $user->id)
            ->update(['is_default' => false]);

        $method->is_default = true;
        $method->save();

        return $method;
    }

    public function delete(User $user, int $id): bool
    {
        $method = PaymentMethod::query()
            ->where('user_id', $user->id)
            ->where('id', $id)
            ->first();

        if (!$method) {
            return false;
        }

        $wasDefault = $method->is_default;
        $method->delete();

        if ($wasDefault) {
            $next = PaymentMethod::query()
                ->where('user_id', $user->id)
                ->orderByDesc('id')
                ->first();

            if ($next) {
                $next->is_default = true;
                $next->save();
            }
        }

        return true;
    }

    public function serialize(PaymentMethod $method): array
    {
        return [
            'id' => (int) $method->id,
            'brand' => $method->brand,
            'last4' => $method->last4,
            'exp_month' => (int) $method->exp_month,
            'exp_year' => (int) $method->exp_year,
            'holder_name' => $method->holder_name,
            'is_default' => (bool) $method->is_default,
            'created_at' => $method->created_at?->toISOString(),
        ];
    }

}
