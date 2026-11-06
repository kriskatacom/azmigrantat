<?php

declare(strict_types=1);

if ($argc !== 3) {
    fwrite(STDERR, "usage: stage1-verify-tree.php ROOT MANIFEST\n");
    exit(64);
}

$root = realpath($argv[1]);
if ($root === false || is_link($argv[1]) || $root !== $argv[1]) {
    fwrite(STDERR, "restore root identity mismatch\n");
    exit(65);
}

function safeRelative(string $path): bool
{
    if ($path === '.') {
        return true;
    }
    if ($path === '' || $path[0] === '/' || str_contains($path, "\0")) {
        return false;
    }
    foreach (explode('/', $path) as $part) {
        if ($part === '' || $part === '.' || $part === '..') {
            return false;
        }
    }
    return true;
}

$expected = [];
$manifest = fopen($argv[2], 'rb');
if ($manifest === false) {
    fwrite(STDERR, "manifest unavailable\n");
    exit(66);
}
while (($line = fgets($manifest)) !== false) {
    $item = json_decode($line, true, flags: JSON_THROW_ON_ERROR);
    $path = $item['path'] ?? null;
    if (!is_string($path) || !safeRelative($path) || isset($expected[$path])) {
        fwrite(STDERR, "unsafe or duplicate manifest path\n");
        exit(65);
    }
    if (($item['xattrs'] ?? []) !== []) {
        fwrite(STDERR, "this verifier requires the reviewed empty-xattr inventory\n");
        exit(65);
    }
    $expected[$path] = $item;
}
fclose($manifest);

$actual = ['.' => true];
$stack = [['', $root]];
while ($stack !== []) {
    [$relativeBase, $absoluteBase] = array_pop($stack);
    $names = scandir($absoluteBase);
    if ($names === false) {
        fwrite(STDERR, "could not enumerate restore tree\n");
        exit(66);
    }
    foreach ($names as $name) {
        if ($name === '.' || $name === '..') {
            continue;
        }
        $relative = $relativeBase === '' ? $name : $relativeBase . '/' . $name;
        if (!safeRelative($relative)) {
            fwrite(STDERR, "unsafe restored path\n");
            exit(65);
        }
        $absolute = $absoluteBase . '/' . $name;
        $actual[$relative] = true;
        if (is_dir($absolute) && !is_link($absolute)) {
            $stack[] = [$relative, $absolute];
        }
    }
}

$missing = count(array_diff_key($expected, $actual));
$unexpected = count(array_diff_key($actual, $expected));
if ($missing !== 0 || $unexpected !== 0) {
    printf("missing_paths=%d\nunexpected_paths=%d\n", $missing, $unexpected);
    exit(1);
}

$failures = [];
foreach ($expected as $relative => $wanted) {
    $absolute = $relative === '.' ? $root : $root . '/' . $relative;
    $info = lstat($absolute);
    if ($info === false) {
        $failures[] = $relative . ':lstat';
        continue;
    }
    $type = is_link($absolute) ? 'symlink' : (is_file($absolute) ? 'file' : (is_dir($absolute) ? 'dir' : 'other'));
    if ($type !== $wanted['type']) {
        $failures[] = $relative . ':type';
        continue;
    }
    if (sprintf('%04o', $info['mode'] & 07777) !== $wanted['mode']) {
        $failures[] = $relative . ':mode';
    }
    if ($info['uid'] !== $wanted['uid'] || $info['gid'] !== $wanted['gid']) {
        $failures[] = $relative . ':owner';
    }
    if ($type === 'file' && !hash_equals($wanted['sha256'], hash_file('sha256', $absolute))) {
        $failures[] = $relative . ':sha256';
    }
    if ($type === 'symlink' && readlink($absolute) !== $wanted['link']) {
        $failures[] = $relative . ':link';
    }
}

printf("checked=%d\nfailures=%d\n", count($expected), count($failures));
if ($failures !== []) {
    printf("first_failure=%s\n", $failures[0]);
    exit(1);
}
