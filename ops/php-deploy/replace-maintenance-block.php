<?php
declare(strict_types=1);

$root = '/home/azmigran/users.azmigrantat.com';
$htaccess = $root . '/.htaccess';
$snippet = $root . '/tmp-maintenance-snippet';

if (!is_file($htaccess) || !is_file($snippet)) {
    fwrite(STDERR, "Required maintenance files are missing\n");
    exit(1);
}

$content = file_get_contents($htaccess);
$replacement = trim((string) file_get_contents($snippet));
$pattern = '~\s*# Install this block once in the site-root \.htaccess, before the public rewrite\..*?<\/IfModule>\s*~s';

if (!preg_match($pattern, $content)) {
    fwrite(STDERR, "Existing maintenance marker not found; refusing to alter .htaccess\n");
    exit(1);
}

$updated = preg_replace($pattern, "\n" . $replacement . "\n", $content, 1, $count);
if ($count !== 1 || $updated === null) {
    fwrite(STDERR, "Maintenance block replacement failed\n");
    exit(1);
}

$tmp = $htaccess . '.tmp.' . getmypid();
$mode = fileperms($htaccess) & 0777;
if (file_put_contents($tmp, $updated, LOCK_EX) === false || !chmod($tmp, $mode) || !rename($tmp, $htaccess)) {
    @unlink($tmp);
    fwrite(STDERR, "Atomic .htaccess replacement failed\n");
    exit(1);
}

@unlink($snippet);
echo "MAINTENANCE_BLOCK_UPDATED\n";
