<?php

require __DIR__ . '/../vendor/autoload.php';

use App\Services\LiveStreamService;

$failures = 0;

function check(string $name, mixed $expected, mixed $actual): void
{
    global $failures;

    if ($expected !== $actual) {
        $failures++;
        fwrite(STDERR, "FAIL {$name}\n  expected: " . var_export($expected, true) . "\n  actual:   " . var_export($actual, true) . "\n");
        return;
    }

    echo "OK {$name}\n";
}

check('heart reaction', true, LiveStreamService::isValidReaction('heart'));
check('unknown reaction', false, LiveStreamService::isValidReaction('gift'));
check('join is known action', true, in_array('join', LiveStreamService::ACTIONS, true));
check('end is known action', true, in_array('end', LiveStreamService::ACTIONS, true));

if ($failures > 0) {
    exit(1);
}
