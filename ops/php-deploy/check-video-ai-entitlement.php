<?php

declare(strict_types=1);

require getcwd() . '/vendor/autoload.php';
define('BASE_PATH', str_replace('\\', '/', getcwd()));
$_SERVER['HTTP_HOST'] = $_SERVER['HTTP_HOST'] ?? 'localhost';
$_SERVER['REQUEST_URI'] = $_SERVER['REQUEST_URI'] ?? '/';
App\Core\App::bootstrap();

$user = App\Models\User::query()
    ->where('email', 'techsolutionbg@gmail.com')
    ->first(['id', 'email', 'email_verified']);

if (!$user || (int) $user->id !== 1269 || strtolower(trim((string) $user->email)) !== 'techsolutionbg@gmail.com' || empty($user->email_verified)) {
    fwrite(STDERR, "production identity tuple mismatch\n");
    exit(2);
}

$service = new App\Services\VideoEnhancementService();
$wrongEmail = clone $user;
$wrongEmail->email = 'not-allowed@example.invalid';
$wrongId = clone $user;
$wrongId->id = 2147483000;
$unverified = clone $user;
$unverified->email_verified = false;

$result = [
    'allowed_exact_tuple' => $service->isAiEnabledFor($user),
    'denied_wrong_email' => !$service->isAiEnabledFor($wrongEmail),
    'denied_wrong_id' => !$service->isAiEnabledFor($wrongId),
    'denied_unverified' => !$service->isAiEnabledFor($unverified),
];

if (in_array(false, $result, true)) {
    fwrite(STDERR, json_encode($result, JSON_THROW_ON_ERROR) . PHP_EOL);
    exit(3);
}

fwrite(STDOUT, json_encode($result, JSON_THROW_ON_ERROR) . PHP_EOL);
