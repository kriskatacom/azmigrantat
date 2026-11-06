<?php

declare(strict_types=1);

$host = (string) getenv('DB_HOST');
$port = (string) (getenv('DB_PORT') ?: '3306');
$database = (string) getenv('DB_NAME');
$user = (string) getenv('DB_USER');
$password = (string) getenv('DB_PASS');
if ($host === '' || $database === '' || $user === '') {
    fwrite(STDERR, "database configuration unavailable\n");
    exit(78);
}
$pdo = new PDO(
    "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4",
    $user,
    $password,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
$schemaParts = [];
$queries = [
    "SELECT TABLE_NAME,ENGINE,TABLE_COLLATION FROM information_schema.tables WHERE table_schema=DATABASE() ORDER BY TABLE_NAME",
    "SELECT TABLE_NAME,COLUMN_NAME,ORDINAL_POSITION,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA,COLLATION_NAME FROM information_schema.columns WHERE table_schema=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION",
    "SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME,SUB_PART,INDEX_TYPE FROM information_schema.statistics WHERE table_schema=DATABASE() ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX",
    "SELECT CONSTRAINT_NAME,TABLE_NAME,REFERENCED_TABLE_NAME,UPDATE_RULE,DELETE_RULE FROM information_schema.referential_constraints WHERE constraint_schema=DATABASE() ORDER BY TABLE_NAME,CONSTRAINT_NAME",
    "SELECT TRIGGER_NAME,EVENT_MANIPULATION,EVENT_OBJECT_TABLE,ACTION_TIMING,ACTION_STATEMENT FROM information_schema.triggers WHERE trigger_schema=DATABASE() ORDER BY TRIGGER_NAME",
    "SELECT ROUTINE_NAME,ROUTINE_TYPE,DTD_IDENTIFIER,ROUTINE_DEFINITION FROM information_schema.routines WHERE routine_schema=DATABASE() ORDER BY ROUTINE_NAME,ROUTINE_TYPE",
    "SELECT EVENT_NAME,STATUS,EVENT_DEFINITION,EVENT_TYPE,EXECUTE_AT,INTERVAL_VALUE,INTERVAL_FIELD FROM information_schema.events WHERE event_schema=DATABASE() ORDER BY EVENT_NAME",
];
foreach ($queries as $query) {
    $schemaParts[] = $pdo->query($query)->fetchAll(PDO::FETCH_NUM);
}
$tableInventory = $pdo->query(
    "SELECT COUNT(*) total, SUM(CASE WHEN ENGINE <> 'InnoDB' THEN 1 ELSE 0 END) non_innodb " .
    "FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'"
)->fetch(PDO::FETCH_ASSOC);
$latestLedger = (string) $pdo->query('SELECT version FROM phinxlog ORDER BY version DESC LIMIT 1')->fetchColumn();
printf(
    "tables=%d\nnon_innodb=%d\nschema_signature=%s\nlatest_ledger=%s\n",
    (int) ($tableInventory['total'] ?? 0),
    (int) ($tableInventory['non_innodb'] ?? 0),
    hash('sha256', serialize($schemaParts)),
    $latestLedger
);
foreach (['payment_methods', 'subscriptions', 'billing_events'] as $table) {
    $count = (int) $pdo->query('SELECT COUNT(*) FROM `' . $table . '`')->fetchColumn();
    printf("%s_count=%d\n", $table, $count);
}
