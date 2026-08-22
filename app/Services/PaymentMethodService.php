<?php

namespace App\Services;

use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Database\QueryException;
use RuntimeException;

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

    public function save(User $user, string $number, int $expMonth, int $expYear, ?string $holderName): PaymentMethod
    {
        $pan = preg_replace('/\D+/', '', $number) ?? '';

        if (!$this->isValidPan($pan)) {
            throw new RuntimeException('Невалиден номер на карта.');
        }

        if ($expMonth < 1 || $expMonth > 12) {
            throw new RuntimeException('Невалиден месец на валидност.');
        }

        $nowYear = (int) date('Y');
        $nowMonth = (int) date('n');

        if ($expYear < $nowYear || ($expYear === $nowYear && $expMonth < $nowMonth)) {
            throw new RuntimeException('Картата е с изтекла валидност.');
        }

        $brand = $this->detectBrand($pan);
        $last4 = substr($pan, -4);
        $holder = $holderName !== null ? trim($holderName) : null;

        if ($holder === '') {
            $holder = null;
        }

        $existing = PaymentMethod::query()
            ->where('user_id', $user->id)
            ->where('brand', $brand)
            ->where('last4', $last4)
            ->where('exp_month', $expMonth)
            ->where('exp_year', $expYear)
            ->first();

        if ($existing) {
            $existing->pan_ciphertext = $this->encryptPan($pan);
            $existing->holder_name = $holder ?? $existing->holder_name;
            $existing->save();

            return $existing;
        }

        $isFirst = PaymentMethod::query()->where('user_id', $user->id)->doesntExist();

        try {
            return PaymentMethod::create([
                'user_id' => $user->id,
                'brand' => $brand,
                'last4' => $last4,
                'exp_month' => $expMonth,
                'exp_year' => $expYear,
                'holder_name' => $holder,
                'pan_ciphertext' => $this->encryptPan($pan),
                'is_default' => $isFirst,
            ]);
        } catch (QueryException $exception) {
            throw new RuntimeException('Картата не можа да бъде запазена.');
        }
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

    private function isValidPan(string $pan): bool
    {
        $length = strlen($pan);

        if ($length < 13 || $length > 19) {
            return false;
        }

        $sum = 0;
        $alternate = false;

        for ($i = $length - 1; $i >= 0; $i--) {
            $digit = (int) $pan[$i];

            if ($alternate) {
                $digit *= 2;
                if ($digit > 9) {
                    $digit -= 9;
                }
            }

            $sum += $digit;
            $alternate = !$alternate;
        }

        return $sum % 10 === 0;
    }

    private function detectBrand(string $pan): string
    {
        if (preg_match('/^4/', $pan) === 1) {
            return 'visa';
        }

        if (preg_match('/^5[1-5]/', $pan) === 1 || preg_match('/^2(2[2-9]|[3-6]|7[01]|720)/', $pan) === 1) {
            return 'mastercard';
        }

        if (preg_match('/^3[47]/', $pan) === 1) {
            return 'amex';
        }

        if (preg_match('/^6(?:011|5)/', $pan) === 1) {
            return 'discover';
        }

        return 'card';
    }

    private function encryptPan(string $pan): string
    {
        $key = $this->encryptionKey();
        $iv = random_bytes(12);
        $tag = '';
        $cipher = openssl_encrypt($pan, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);

        if ($cipher === false || $tag === '') {
            throw new RuntimeException('Картата не можа да бъде шифрована.');
        }

        return base64_encode($iv . $tag . $cipher);
    }

    private function encryptionKey(): string
    {
        $raw = (string) (
            $_ENV['CARD_ENCRYPTION_KEY']
            ?? getenv('CARD_ENCRYPTION_KEY')
            ?: $_ENV['REALTIME_INTERNAL_SECRET']
            ?? getenv('REALTIME_INTERNAL_SECRET')
        );

        if ($raw === '') {
            throw new RuntimeException('Липсва ключ за шифроване на карти.');
        }

        return hash('sha256', $raw, true);
    }
}
