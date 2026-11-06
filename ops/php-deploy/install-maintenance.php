<?php

declare(strict_types=1);

$root = '/home/azmigran/users.azmigrantat.com';
$htaccess = $root . '/.htaccess';
$snippet = file_get_contents('/tmp/maintenance-api.htaccess');
if ($snippet === false) {
    throw new RuntimeException('Maintenance snippet is missing.');
}

$current = file_get_contents($htaccess);
if ($current === false) {
    throw new RuntimeException('Cannot read production .htaccess.');
}

if (!str_contains($current, 'BEGIN AZMIGRANTAT_API_MAINTENANCE')) {
    $anchor = 'RewriteCond %{REQUEST_URI} !^/public/';
    $position = strpos($current, $anchor);
    if ($position === false) {
        throw new RuntimeException('Expected public rewrite anchor is missing.');
    }

    $updated = substr($current, 0, $position) . $snippet . "\n\n" . substr($current, $position);
    $temporary = $htaccess . '.tmp.' . getmypid();
    if (file_put_contents($temporary, $updated) !== strlen($updated)) {
        throw new RuntimeException('Could not write temporary .htaccess.');
    }
    chmod($temporary, fileperms($htaccess) & 0777);
    if (!rename($temporary, $htaccess)) {
        @unlink($temporary);
        throw new RuntimeException('Could not atomically install .htaccess.');
    }
}

if (!is_file($root . '/public/api-maintenance.php')) {
    throw new RuntimeException('Maintenance handler was not copied.');
}

echo "Maintenance block installed; flag remains off.\n";
