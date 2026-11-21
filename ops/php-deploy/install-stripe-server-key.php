<?php

declare(strict_types=1);

const APP_ROOT = '/home/azmigran/users.azmigrantat.com';
const BACKUP_ROOT = '/home/azmigran/backups/google-play-release-staging/stripe-server-key-20261107T001500Z';

if ($argc !== 2 || !isset($argv[1])) {
    fwrite(STDERR, "usage: install-stripe-server-key.php SECRET_FILE\n");
    exit(64);
}

$secretFile = $argv[1];
$envFile = APP_ROOT . '/.env';
$temporary = APP_ROOT . '/.env.stripe-server-key.tmp';
$backup = BACKUP_ROOT . '/auth.env.before';

if (realpath(APP_ROOT) !== APP_ROOT
    || is_link(APP_ROOT)
    || !is_file($envFile)
    || is_link($envFile)
    || !is_file($secretFile)
    || is_link($secretFile)
    || file_exists(BACKUP_ROOT)
    || file_exists($temporary)) {
    fwrite(STDERR, "filesystem precondition failed\n");
    exit(78);
}

$secret = trim((string) file_get_contents($secretFile));
if (!preg_match('/^rk_test_[A-Za-z0-9]+$/', $secret)) {
    fwrite(STDERR, "Stripe key format mismatch\n");
    exit(65);
}

$contents = file_get_contents($envFile);
if (!is_string($contents)
    || preg_match_all('/^STRIPE_TEST_SECRET_KEY=.*$/m', $contents) !== 1
    || preg_match_all('/^PAYMENTS_ENABLED=false$/m', $contents) !== 1
    || preg_match_all('/^STRIPE_SANDBOX_ENABLED=true$/m', $contents) !== 1) {
    fwrite(STDERR, "environment guard mismatch\n");
    exit(65);
}

if (!mkdir(BACKUP_ROOT, 0700, true)) {
    fwrite(STDERR, "backup directory creation failed\n");
    exit(73);
}
if (!copy($envFile, $backup) || !chmod($backup, 0600)) {
    fwrite(STDERR, "environment backup failed\n");
    exit(74);
}

$updated = preg_replace(
    '/^STRIPE_TEST_SECRET_KEY=.*$/m',
    'STRIPE_TEST_SECRET_KEY=' . $secret,
    $contents,
    1,
    $replacementCount
);
if (!is_string($updated) || $replacementCount !== 1) {
    fwrite(STDERR, "environment replacement failed\n");
    exit(65);
}

if (file_put_contents($temporary, $updated, LOCK_EX) !== strlen($updated)
    || !chmod($temporary, 0600)
    || !rename($temporary, $envFile)) {
    fwrite(STDERR, "atomic environment activation failed\n");
    exit(74);
}

clearstatcache(true, $envFile);
if ((fileperms($envFile) & 0777) !== 0600) {
    fwrite(STDERR, "environment mode mismatch\n");
    exit(65);
}

printf(
    "stripe_server_key=installed\nkey_fingerprint=%s\nbackup=%s\nreal_payments=false\nsandbox=true\n",
    substr(hash('sha256', $secret), 0, 16),
    BACKUP_ROOT
);
