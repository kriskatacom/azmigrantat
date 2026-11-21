<?php

declare(strict_types=1);

$root = '/home/azmigran/users.azmigrantat.com';
require $root . '/vendor/autoload.php';
define('BASE_PATH', $root);
App\Core\App::bootstrap();

$user = App\Models\User::query()
    ->where('email', 'techsolutionbg@gmail.com')
    ->first();

if (!$user) {
    fwrite(STDERR, "user_missing\n");
    exit(2);
}

printf(
    "user_id=%d\nrole=%s\nactive=%s\n",
    (int) $user->id,
    (string) $user->role,
    (bool) $user->is_active ? 'true' : 'false'
);
