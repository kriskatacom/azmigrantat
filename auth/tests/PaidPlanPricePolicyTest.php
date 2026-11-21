<?php

require __DIR__ . '/../vendor/autoload.php';

use App\Services\PaidPlanPricePolicy;
$policy = new PaidPlanPricePolicy();
$failures = 0;

$check = static function (string $name, bool $condition) use (&$failures): void {
    if (!$condition) {
        $failures++;
        fwrite(STDERR, "FAIL {$name}\n");
        return;
    }
    echo "OK {$name}\n";
};

$check('minimum comma amount', $policy->parseEuroAmount('0,50') === 50);
$check('whole euro amount', $policy->parseEuroAmount('5') === 500);
$check('one decimal amount', $policy->parseEuroAmount('12.3') === 1230);
$check('maximum amount', $policy->parseEuroAmount('1000.00') === 100000);
$check('billing interval is days', PaidPlanPricePolicy::INTERVAL === 'day');
$check('billing period is exactly 30 days', PaidPlanPricePolicy::INTERVAL_COUNT === 30);

foreach (['0.49', '1000.01', '-1', '1.999', '1e2', 'NaN', ''] as $invalid) {
    try {
        $policy->parseEuroAmount($invalid);
        $check("rejects {$invalid}", false);
    } catch (\InvalidArgumentException) {
        $check("rejects {$invalid}", true);
    }
}

if ($failures > 0) {
    fwrite(STDERR, "{$failures} failing assertion(s)\n");
    exit(1);
}

echo "All assertions passed.\n";
