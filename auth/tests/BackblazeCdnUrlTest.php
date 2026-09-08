<?php

require __DIR__ . '/../vendor/autoload.php';

use App\Models\User;
use App\Services\BackblazeB2Service;

$_ENV['B2_CDN_BASE_URL'] = 'https://cdn.azmigrantat.com';
$_ENV['B2_BUCKET'] = 'azmigrantat-bucket';
putenv('B2_CDN_BASE_URL=https://cdn.azmigrantat.com');
putenv('B2_BUCKET=azmigrantat-bucket');

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

$service = new BackblazeB2Service(
    'id',
    'secret',
    'azmigrantat-bucket',
    'https://s3.eu-central-003.backblazeb2.com',
    'eu-central-003',
    'https://cdn.azmigrantat.com'
);

check(
    'url(chat/2026/08/test.jpg)',
    'https://cdn.azmigrantat.com/chat/2026/08/test.jpg',
    $service->url('chat/2026/08/test.jpg')
);

check(
    'leading slash in key',
    'https://cdn.azmigrantat.com/chat/2026/08/test.jpg',
    $service->url('/chat/2026/08/test.jpg')
);

$serviceTrailing = new BackblazeB2Service(
    'id',
    'secret',
    'azmigrantat-bucket',
    'https://s3.eu-central-003.backblazeb2.com',
    'eu-central-003',
    'https://cdn.azmigrantat.com/'
);

check(
    'trailing slash in CDN base URL',
    'https://cdn.azmigrantat.com/chat/2026/08/test.jpg',
    $serviceTrailing->url('chat/2026/08/test.jpg')
);

check(
    'old S3 URL -> CDN URL',
    'https://cdn.azmigrantat.com/chat/2026/08/abc.jpg',
    BackblazeB2Service::publicUrl(
        'https://s3.eu-central-003.backblazeb2.com/azmigrantat-bucket/chat/2026/08/abc.jpg'
    )
);

check(
    'old Friendly URL -> CDN URL',
    'https://cdn.azmigrantat.com/chat/2026/08/abc.jpg',
    BackblazeB2Service::publicUrl(
        'https://f003.backblazeb2.com/file/azmigrantat-bucket/chat/2026/08/abc.jpg'
    )
);

check(
    'already CDN URL -> no double prefix',
    'https://cdn.azmigrantat.com/chat/2026/08/abc.jpg',
    BackblazeB2Service::publicUrl(
        'https://cdn.azmigrantat.com/chat/2026/08/abc.jpg'
    )
);

$serialized = BackblazeB2Service::serializeAttachmentMetadata([
    'key' => 'chat/2026/08/abc.jpg',
    'url' => 'https://s3.eu-central-003.backblazeb2.com/azmigrantat-bucket/chat/2026/08/abc.jpg',
    'name' => 'abc.jpg',
    'mime_type' => 'image/jpeg',
    'size' => 0,
    'etag' => 'abc',
]);

check(
    'attachment serialization uses key',
    'https://cdn.azmigrantat.com/chat/2026/08/abc.jpg',
    $serialized['url']
);
check('attachment key unchanged', 'chat/2026/08/abc.jpg', $serialized['key']);

$user = new User();
$user->options = [
    'profile_image' => 'https://s3.eu-central-003.backblazeb2.com/azmigrantat-bucket/profile/2026/08/abc.jpg',
];

check(
    'profile image serialization',
    'https://cdn.azmigrantat.com/profile/2026/08/abc.jpg',
    $user->profile_image_url
);

if ($failures > 0) {
    fwrite(STDERR, "{$failures} failing assertion(s)\n");
    exit(1);
}

echo "All assertions passed.\n";
