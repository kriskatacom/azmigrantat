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

if (!$user || (int) $user->id < 1) {
    fwrite(STDERR, "test account not found\n");
    exit(2);
}

fwrite(STDOUT, (string) ((int) $user->id) . ' email=' . strtolower(trim((string) $user->email)) . ' verified=' . (!empty($user->email_verified) ? '1' : '0') . PHP_EOL);
