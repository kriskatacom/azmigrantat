<?php

declare(strict_types=1);

if ($argc !== 3 || !in_array($argv[1], ['production', 'restore'], true) || $argv[2] !== 'payment_methods') {
    fwrite(STDERR, "usage error\n");
    exit(64);
}
$keyHex = trim((string) fgets(STDIN));
if (!preg_match('/^[0-9a-f]{64}$/', $keyHex)) {
    fwrite(STDERR, "invalid ephemeral key\n");
    exit(64);
}
$key = hex2bin($keyHex);
if ($key === false) {
    exit(64);
}

if ($argv[1] === 'production') {
    $root = '/home/azmigran/users.azmigrantat.com';
    if (realpath($root) !== $root || is_link($root)) {
        fwrite(STDERR, "production root mismatch\n");
        exit(78);
    }
    $config = parse_ini_file($root . '/.env', false, INI_SCANNER_RAW);
    if (!is_array($config)) {
        exit(78);
    }
    $host = (string) ($config['DB_HOST'] ?? '');
    $port = (string) ($config['DB_PORT'] ?? '3306');
    $database = (string) ($config['DB_NAME'] ?? '');
    $user = (string) ($config['DB_USER'] ?? '');
    $password = (string) ($config['DB_PASS'] ?? '');
} else {
    $host = (string) getenv('DB_HOST');
    $port = (string) (getenv('DB_PORT') ?: '3306');
    $database = (string) getenv('DB_NAME');
    $user = (string) getenv('DB_USER');
    $password = (string) getenv('DB_PASS');
}
if ($host === '' || $database === '' || $user === '') {
    fwrite(STDERR, "database configuration unavailable\n");
    exit(78);
}

$pdo = new PDO(
    "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4",
    $user,
    $password,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
);
$columnsStatement = $pdo->prepare(
    'SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ORDINAL_POSITION'
);
$columnsStatement->execute([$database, $argv[2]]);
$columns = $columnsStatement->fetchAll(PDO::FETCH_COLUMN);
if ($columns === [] || !in_array('id', $columns, true)) {
    fwrite(STDERR, "table shape unavailable\n");
    exit(65);
}
foreach ($columns as $column) {
    if (!preg_match('/^[A-Za-z0-9_]+$/', (string) $column)) {
        exit(65);
    }
}
$quoted = array_map(static fn ($column) => '`' . $column . '`', $columns);
$rows = $pdo->query('SELECT ' . implode(',', $quoted) . ' FROM `payment_methods` ORDER BY `id`')->fetchAll();
$context = hash_init('sha256', HASH_HMAC, $key);
foreach ($rows as $row) {
    foreach ($columns as $column) {
        $name = (string) $column;
        hash_update($context, 'K' . strlen($name) . ':' . $name . ';');
        if ($row[$name] === null) {
            hash_update($context, 'N;');
        } else {
            $value = (string) $row[$name];
            hash_update($context, 'S' . strlen($value) . ':' . $value . ';');
        }
    }
}
printf("count=%d\nhmac=%s\n", count($rows), hash_final($context));
sodium_memzero($key);
