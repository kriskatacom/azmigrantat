<?php

require __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../app/Config/helper.php';

use App\Models\Video;
use App\Services\DedicatedVideoProvider;
use App\Services\VideoStorageProviderFactory;

$failures = 0;

function check(string $name, bool $condition): void
{
    global $failures;
    if (!$condition) {
        $failures++;
        fwrite(STDERR, "FAIL {$name}\n");
        return;
    }
    echo "OK {$name}\n";
}

$_ENV['VIDEO_STORAGE_PROVIDER'] = 'bunny';
$_ENV['VIDEO_SERVICE_URL'] = 'http://127.0.0.1:3100';
$_ENV['VIDEO_SERVICE_PUBLIC_URL'] = 'https://media.example.invalid';
$_ENV['VIDEO_SERVICE_TOKEN_SECRET'] = 'unit-upload-secret';
$_ENV['VIDEO_SERVICE_ADMIN_SECRET'] = 'unit-delete-secret';
$_ENV['VIDEO_SERVICE_CALLBACK_SECRET'] = 'unit-callback-secret';
$_ENV['VIDEO_SERVICE_MAX_UPLOAD_BYTES'] = '2147483648';
$_ENV['VIDEO_SERVICE_TOKEN_TTL_SECONDS'] = '900';
putenv('VIDEO_STORAGE_PROVIDER=bunny');
putenv('VIDEO_SERVICE_URL=http://127.0.0.1:3100');
putenv('VIDEO_SERVICE_TOKEN_SECRET=unit-upload-secret');
putenv('VIDEO_SERVICE_ADMIN_SECRET=unit-delete-secret');
putenv('VIDEO_SERVICE_CALLBACK_SECRET=unit-callback-secret');
putenv('VIDEO_SERVICE_MAX_UPLOAD_BYTES=2147483648');
putenv('VIDEO_SERVICE_TOKEN_TTL_SECONDS=900');

$provider = new DedicatedVideoProvider();
$video = new Video([
    'id' => 42,
    'user_id' => 7,
    'provider' => 'oneprovider',
    'mime_type' => 'video/mp4',
    'file_size' => 1024,
    'title' => 'Тестово видео',
]);
$video->id = 42;
$video->exists = true;
$prepared = $provider->createUpload('Тестово видео', $video);
$upload = $prepared['provider_data'];
$parts = explode('.', (string) $upload['authorization_token']);
$claims = json_decode(base64_decode(strtr($parts[1], '-_', '+/') . str_repeat('=', (4 - strlen($parts[1]) % 4) % 4)), true);

check('Dedicated provider key', $provider->key() === 'oneprovider');
check('Dedicated provider configured', $provider->isConfigured());
check('token has three signed parts', count($parts) === 3);
check('token binds upload id', ($claims['upload_id'] ?? null) === $prepared['storage_id']);
check('token binds user id', ($claims['user_id'] ?? null) === 7);
check('token binds video id', ($claims['video_id'] ?? null) === 42);
check('token binds MIME type', ($claims['mime_type'] ?? null) === 'video/mp4');
check('upload endpoint matches Task 3', $upload['endpoint'] === 'http://127.0.0.1:3100/v1/uploads');
check('delete contract uses a separate admin secret', str_contains((string) file_get_contents(__DIR__ . '/../app/Services/DedicatedVideoProvider.php'), "VIDEO_SERVICE_ADMIN_SECRET"));
check('delete contract uses Bearer authorization', str_contains((string) file_get_contents(__DIR__ . '/../app/Services/DedicatedVideoProvider.php'), "Authorization: Bearer "));

$rawBody = json_encode(['video_id' => 42, 'user_id' => 7, 'upload_id' => $prepared['storage_id'], 'status' => 'processing'], JSON_THROW_ON_ERROR);
$timestamp = (string) time();
$signature = hash_hmac('sha256', $timestamp . '.' . $rawBody, 'unit-callback-secret');
check('callback signature accepted', $provider->verifySignedCallback($rawBody, $signature, $timestamp));
check('stale callback rejected', !$provider->verifySignedCallback($rawBody, $signature, (string) (time() - 301)));
check('wrong callback signature rejected', !$provider->verifySignedCallback($rawBody, 'invalid', $timestamp));

putenv('VIDEO_SERVICE_ADMIN_SECRET');
unset($_ENV['VIDEO_SERVICE_ADMIN_SECRET']);
check('Dedicated activation fails closed without delete secret', !(new DedicatedVideoProvider())->isConfigured());
putenv('VIDEO_SERVICE_ADMIN_SECRET=unit-delete-secret');
$_ENV['VIDEO_SERVICE_ADMIN_SECRET'] = 'unit-delete-secret';

check('Bunny remains default provider', VideoStorageProviderFactory::forNewUpload()->key() === 'bunny');
$legacyVideo = new Video(['provider' => null]);
$dedicatedVideo = new Video(['provider' => 'oneprovider']);
check('legacy video selects Bunny provider', VideoStorageProviderFactory::forVideo($legacyVideo)->key() === 'bunny');
check('stored Dedicated video selects Dedicated provider', VideoStorageProviderFactory::forVideo($dedicatedVideo)->key() === 'oneprovider');
putenv('VIDEO_STORAGE_PROVIDER=oneprovider');
$_ENV['VIDEO_STORAGE_PROVIDER'] = 'oneprovider';
check('new upload provider can switch to Dedicated', VideoStorageProviderFactory::forNewUpload()->key() === 'oneprovider');
putenv('VIDEO_STORAGE_PROVIDER=bunny');
$_ENV['VIDEO_STORAGE_PROVIDER'] = 'bunny';

if ($failures > 0) {
    fwrite(STDERR, "{$failures} failing assertion(s)\n");
    exit(1);
}

echo "All assertions passed.\n";
