<?php

require __DIR__ . '/../vendor/autoload.php';

use App\Models\Video;
use App\Services\BunnyStreamProvider;

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

$_ENV['BUNNY_STREAM_LIBRARY_ID'] = '12345';
$_ENV['BUNNY_STREAM_API_KEY'] = 'unit-api-key';
$_ENV['BUNNY_STREAM_TOKEN_SECURITY_KEY'] = 'unit-token-key';
$_ENV['BUNNY_STREAM_CDN_HOST_NAME'] = 'vz-abc.b-cdn.net';
$_ENV['BUNNY_STREAM_READ_ONLY_API_KEY'] = 'unit-read-only-key';
putenv('BUNNY_STREAM_LIBRARY_ID=12345');
putenv('BUNNY_STREAM_API_KEY=unit-api-key');
putenv('BUNNY_STREAM_TOKEN_SECURITY_KEY=unit-token-key');
putenv('BUNNY_STREAM_CDN_HOST_NAME=vz-abc.b-cdn.net');
putenv('BUNNY_STREAM_READ_ONLY_API_KEY=unit-read-only-key');

$provider = new BunnyStreamProvider();
$video = new Video([
    'bunny_library_id' => 12345,
    'bunny_video_guid' => 'guid-123',
]);

check('provider key', 'bunny', $provider->key());
check('configured', true, $provider->isConfigured());
check('upload authorization maps provider service', 12345, $provider->uploadAuthorization('guid-123')['library_id']);
check('upload authorization keeps remote id', 'guid-123', $provider->uploadAuthorization('guid-123')['video_id']);
check('playback delegates to Bunny signing', true, str_starts_with($provider->playbackUrl($video), 'https://vz-abc.b-cdn.net/'));

$rawBody = '{"VideoGuid":"guid-123","Status":4}';
$signature = hash_hmac('sha256', $rawBody, 'unit-read-only-key');
check('callback verification delegates to Bunny', true, $provider->verifyCallback($rawBody, $signature, 'v1', 'hmac-sha256'));
check('invalid callback signature rejected', false, $provider->verifyCallback($rawBody, 'invalid', 'v1', 'hmac-sha256'));

if ($failures > 0) {
    fwrite(STDERR, "{$failures} failing assertion(s)\n");
    exit(1);
}

echo "All assertions passed.\n";
