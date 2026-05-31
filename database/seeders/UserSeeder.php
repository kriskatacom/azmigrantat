<?php

require_once __DIR__ . '/../../vendor/autoload.php';

define('ROOT', dirname(__DIR__, 2));

$dotenv = \Dotenv\Dotenv::createImmutable(ROOT);
$dotenv->load();

require_once ROOT . '/vendor/autoload.php';
require_once ROOT . '/app/Config/bootstrap.php';

use App\Models\User;
use Faker\Factory;

$faker = Factory::create('bg_BG');

echo "Стартиране на сийдването на 1000 потребители...\n";

$users = [];
$password = password_hash('password', PASSWORD_BCRYPT);

for ($i = 0; $i < 1000; $i++) {
    $users[] = [
        'name'          => $faker->name,
        'username'      => $faker->unique()->userName,
        'email'         => $faker->unique()->safeEmail,
        'password_hash' => $password,
        'role'          => 'user',
        'is_active'     => 1,
        'created_at'    => date('Y-m-d H:i:s'),
        'updated_at'    => date('Y-m-d H:i:s'),
    ];

    if (count($users) == 100) {
        User::insert($users);
        $users = [];
    }
}

echo "Готово! 1000 потребители бяха добавени в базата данни.\n";
