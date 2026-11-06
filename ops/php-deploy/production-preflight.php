<?php
declare(strict_types=1);
$env = parse_ini_file('/home/azmigran/users.azmigrantat.com/.env');
if (!is_array($env)) { exit(1); }
$pdo = new PDO(
    'mysql:host=' . $env['DB_HOST'] . ';dbname=' . $env['DB_NAME'] . ';charset=' . ($env['DB_CHARSET'] ?? 'utf8mb4'),
    $env['DB_USER'], $env['DB_PASS'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
$count = (int) $pdo->query('SELECT COUNT(*) FROM videos')->fetchColumn();
$active = (int) $pdo->query("SELECT COUNT(*) FROM videos WHERE status IN ('pending_upload','uploading','processing')")->fetchColumn();
$uploads = 0;
try {
    $uploads = (int) $pdo->query('SELECT COUNT(*) FROM video_uploads WHERE expires_at IS NOT NULL AND expires_at > NOW()')->fetchColumn();
} catch (Throwable $e) {
    $uploads = -1;
}
echo "VIDEO_COUNT={$count} ACTIVE={$active} ACTIVE_UPLOADS={$uploads}\n";
if ($count !== 6 || $active !== 0 || ($uploads !== 0 && $uploads !== -1)) exit(2);
