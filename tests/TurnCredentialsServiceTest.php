<?php

require __DIR__ . '/../vendor/autoload.php';

use App\Services\TurnCredentialsService;

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

$_ENV['TURN_STATIC_AUTH_SECRET'] = 'unit-test-secret';
$_ENV['TURN_HOST'] = 'turn.azmigrantat.com';
$_ENV['TURN_TTL_SECONDS'] = '3600';
putenv('TURN_STATIC_AUTH_SECRET=unit-test-secret');
putenv('TURN_HOST=turn.azmigrantat.com');
putenv('TURN_TTL_SECONDS=3600');

$service = new TurnCredentialsService();
$now = 1_700_000_000;
$issued = $service->issue(42, $now);
$username = ($now + 3600) . ':42';
$credential = $service->credential($username, 'unit-test-secret');

check('has secret', true, $service->hasTurnSecret());
check('expires_at', $now + 3600, $issued['expires_at']);
check('ttl', 3600, $issued['ttl']);
check('ice server count', 2, count($issued['iceServers']));
check('stun urls', ['stun:stun.l.google.com:19302'], $issued['iceServers'][0]['urls']);
check('turn username', $username, $issued['iceServers'][1]['username']);
check('turn credential hmac', $credential, $issued['iceServers'][1]['credential']);
check(
    'turn urls',
    [
        'turn:turn.azmigrantat.com:3478?transport=udp',
        'turn:turn.azmigrantat.com:3478?transport=tcp',
    ],
    $issued['iceServers'][1]['urls'],
);
check('response does not include static secret', false, array_key_exists('static-auth-secret', $issued));
check(
    'hmac matches coturn REST formula',
    base64_encode(hash_hmac('sha1', $username, 'unit-test-secret', true)),
    $credential,
);

unset($_ENV['TURN_STATIC_AUTH_SECRET']);
putenv('TURN_STATIC_AUTH_SECRET');
$withoutSecret = new TurnCredentialsService();
$stunOnly = $withoutSecret->issue(42, $now);
check('missing secret has no turn', false, $withoutSecret->hasTurnSecret());
check('missing secret stun only', 1, count($stunOnly['iceServers']));

if ($failures > 0) {
    fwrite(STDERR, "{$failures} failing assertion(s)\n");
    exit(1);
}

echo "All assertions passed.\n";
