<?php

namespace App\Services;

use InvalidArgumentException;

final class PaidPlanPricePolicy
{
    public const CURRENCY = 'eur';
    public const INTERVAL = 'day';
    public const INTERVAL_COUNT = 30;
    public const MIN_AMOUNT_CENTS = 50;
    public const MAX_AMOUNT_CENTS = 100000;

    public function parseEuroAmount(string $input): int
    {
        $normalized = str_replace(',', '.', trim($input));

        if (!preg_match('/^(?:0|[1-9]\d{0,3})(?:\.\d{1,2})?$/', $normalized)) {
            throw new InvalidArgumentException('Въведете валидна цена в евро с най-много два знака след десетичната запетая.');
        }

        [$euros, $fraction] = array_pad(explode('.', $normalized, 2), 2, '');
        $cents = ((int) $euros * 100) + (int) str_pad($fraction, 2, '0');

        $this->assertAmountCents($cents);

        return $cents;
    }

    public function assertAmountCents(int $amountCents): void
    {
        if ($amountCents < self::MIN_AMOUNT_CENTS || $amountCents > self::MAX_AMOUNT_CENTS) {
            throw new InvalidArgumentException('Цената за 30 дни трябва да бъде между 0,50 € и 1 000,00 €.');
        }
    }
}
