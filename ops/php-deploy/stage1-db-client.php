<?php

declare(strict_types=1);

/**
 * Read-only, production-pinned inventory/dump helper for Stage 1.
 * It cannot create, import into, update, or drop a database.
 */

const APP_ROOT = '/home/azmigran/users.azmigrantat.com';
const EXPECTED_RUNTIME_IDENTITY = '44c8826b8c39a5c728c4491ba2710b52df8c90cb245fbb286fff04bd154bdd57';

if ($argc !== 2 || !in_array($argv[1], ['inventory', 'dump'], true)) {
    fwrite(STDERR, "only read-only inventory and dump actions are supported\n");
    exit(64);
}
if (realpath(APP_ROOT) !== APP_ROOT || is_link(APP_ROOT) || realpath(APP_ROOT . '/.env') !== APP_ROOT . '/.env') {
    fwrite(STDERR, "production root identity mismatch\n");
    exit(78);
}

$counts = [];
foreach (file(APP_ROOT . '/.env', FILE_IGNORE_NEW_LINES) ?: [] as $line) {
    if (preg_match('/^\s*(DB_HOST|DB_NAME|DB_USER|DB_PASS|DB_PORT)\s*=/', $line, $match)) {
        $counts[$match[1]] = ($counts[$match[1]] ?? 0) + 1;
    }
}
foreach (['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'] as $required) {
    if (($counts[$required] ?? 0) !== 1) {
        fwrite(STDERR, "database configuration is missing or ambiguous\n");
        exit(78);
    }
}
if (($counts['DB_PORT'] ?? 0) > 1) {
    fwrite(STDERR, "database port is ambiguous\n");
    exit(78);
}

$config = parse_ini_file(APP_ROOT . '/.env', false, INI_SCANNER_RAW);
if (!is_array($config)) {
    fwrite(STDERR, "strict environment parse failed\n");
    exit(78);
}
foreach (['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS'] as $required) {
    if (!isset($config[$required]) || !is_string($config[$required]) || $config[$required] === '') {
        fwrite(STDERR, "resolved database configuration is incomplete\n");
        exit(78);
    }
}
$port = (string) ($config['DB_PORT'] ?? '3306');
if (strtolower($config['DB_HOST']) !== 'localhost') {
    fwrite(STDERR, "non-local database transport is not approved\n");
    exit(78);
}

$pdo = new PDO(
    'mysql:host=' . $config['DB_HOST'] . ';port=' . $port . ';dbname=' . $config['DB_NAME'] . ';charset=utf8mb4',
    $config['DB_USER'],
    $config['DB_PASS'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
$runtime = $pdo->query(
    'SELECT @@hostname h, @@server_id sid, @@port p, @@socket s, @@version v, @@version_comment c, DATABASE() d'
)->fetch(PDO::FETCH_ASSOC);
$runtimeIdentity = hash(
    'sha256',
    $config['DB_HOST'] . "\0" . $port . "\0" . $config['DB_NAME'] . "\0" . $config['DB_USER'] . "\0" .
    implode("\0", array_map('strval', $runtime ?: []))
);
if (!hash_equals(EXPECTED_RUNTIME_IDENTITY, $runtimeIdentity)) {
    fwrite(STDERR, "database runtime identity mismatch\n");
    exit(78);
}
$engineInventory = $pdo->query(
    "SELECT COUNT(*) AS total, SUM(CASE WHEN ENGINE <> 'InnoDB' THEN 1 ELSE 0 END) AS non_innodb " .
    "FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'"
)->fetch(PDO::FETCH_ASSOC);
$total = (int) ($engineInventory['total'] ?? 0);
$nonInnoDb = (int) ($engineInventory['non_innodb'] ?? 0);
if ($total < 1 || $nonInnoDb !== 0) {
    fwrite(STDERR, "engine_inventory=failed total={$total} non_innodb={$nonInnoDb}\n");
    exit(65);
}
fwrite(STDERR, "engine_inventory=ok total={$total} non_innodb=0\n");

$schemaParts = [];
$schemaQueries = [
    "SELECT TABLE_NAME,ENGINE,TABLE_COLLATION FROM information_schema.tables WHERE table_schema=DATABASE() ORDER BY TABLE_NAME",
    "SELECT TABLE_NAME,COLUMN_NAME,ORDINAL_POSITION,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA,COLLATION_NAME FROM information_schema.columns WHERE table_schema=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION",
    "SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME,SUB_PART,INDEX_TYPE FROM information_schema.statistics WHERE table_schema=DATABASE() ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX",
    "SELECT CONSTRAINT_NAME,TABLE_NAME,REFERENCED_TABLE_NAME,UPDATE_RULE,DELETE_RULE FROM information_schema.referential_constraints WHERE constraint_schema=DATABASE() ORDER BY TABLE_NAME,CONSTRAINT_NAME",
    "SELECT TRIGGER_NAME,EVENT_MANIPULATION,EVENT_OBJECT_TABLE,ACTION_TIMING,ACTION_STATEMENT FROM information_schema.triggers WHERE trigger_schema=DATABASE() ORDER BY TRIGGER_NAME",
    "SELECT ROUTINE_NAME,ROUTINE_TYPE,DTD_IDENTIFIER,ROUTINE_DEFINITION FROM information_schema.routines WHERE routine_schema=DATABASE() ORDER BY ROUTINE_NAME,ROUTINE_TYPE",
    "SELECT EVENT_NAME,STATUS,EVENT_DEFINITION,EVENT_TYPE,EXECUTE_AT,INTERVAL_VALUE,INTERVAL_FIELD FROM information_schema.events WHERE event_schema=DATABASE() ORDER BY EVENT_NAME",
];
foreach ($schemaQueries as $query) {
    $schemaParts[] = $pdo->query($query)->fetchAll(PDO::FETCH_NUM);
}
$schemaSignature = hash('sha256', serialize($schemaParts));
$latestLedger = (string) $pdo->query('SELECT version FROM phinxlog ORDER BY version DESC LIMIT 1')->fetchColumn();
if ($argv[1] === 'inventory') {
    printf("engine_inventory=ok\ntables=%d\nnon_innodb=0\nschema_signature=%s\nlatest_ledger=%s\n", $total, $schemaSignature, $latestLedger);
    exit(0);
}

function optionValue(string $value): string
{
    return '"' . strtr($value, [
        '\\' => '\\\\',
        '"' => '\\"',
        "\n" => '\\n',
        "\r" => '\\r',
        "\t" => '\\t',
    ]) . '"';
}

$credential = fopen('php://temp/maxmemory:65536', 'w+b');
if ($credential === false) {
    fwrite(STDERR, "credential channel unavailable\n");
    exit(70);
}
fwrite($credential, "[client]\n");
fwrite($credential, 'host=' . optionValue($config['DB_HOST']) . "\n");
fwrite($credential, 'port=' . optionValue($port) . "\n");
fwrite($credential, 'user=' . optionValue($config['DB_USER']) . "\n");
fwrite($credential, 'password=' . optionValue($config['DB_PASS']) . "\n");
rewind($credential);

$command = [
    'mysqldump',
    '--defaults-extra-file=/proc/self/fd/3',
    '--single-transaction',
    '--quick',
    '--routines',
    '--triggers',
    '--events',
    '--hex-blob',
    '--default-character-set=utf8mb4',
    '--skip-lock-tables',
    $config['DB_NAME'],
];
$descriptors = [
    0 => ['file', '/dev/null', 'r'],
    1 => ['file', 'php://stdout', 'w'],
    2 => ['file', 'php://stderr', 'w'],
    3 => $credential,
];
$process = proc_open(
    $command,
    $descriptors,
    $pipes,
    APP_ROOT,
    ['PATH' => '/usr/local/bin:/usr/bin:/bin', 'LANG' => 'C.UTF-8']
);
if (!is_resource($process)) {
    fwrite(STDERR, "could not start dump\n");
    exit(70);
}
$status = proc_close($process);
fclose($credential);
exit($status);
