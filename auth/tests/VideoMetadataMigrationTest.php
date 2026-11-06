<?php

require __DIR__ . '/../vendor/autoload.php';

use App\Models\Video;

$failures = 0;

function check(string $name, bool $condition): void
{
    global $failures;

    if (!$condition) {
        $failures++;
        fwrite(STDERR, "FAIL {$name}\n");
        return;
    }

    echo "OK {$name}\n";
}

$migrationPath = __DIR__ . '/../database/migrations/20261022000000_add_provider_neutral_video_metadata.php';
$migration = file_get_contents($migrationPath);
check('migration file is readable', is_string($migration));

foreach (['provider', 'provider_video_id', 'storage_path', 'playback_url', 'processing_status', 'duration'] as $column) {
    check("adds {$column}", is_string($migration) && str_contains($migration, "hasColumn('{$column}')"));
}

check('backfills legacy Bunny provider', is_string($migration) && str_contains($migration, "SET provider = 'bunny'"));
check('backfills legacy Bunny identifier', is_string($migration) && str_contains($migration, 'SET provider_video_id = bunny_video_guid'));
check('maps existing processing status', is_string($migration) && str_contains($migration, 'SET processing_status = status'));
check('maps existing duration without changing duration_seconds', is_string($migration) && str_contains($migration, 'SET duration = duration_seconds'));
check('does not drop columns', is_string($migration) && !preg_match('/\bDROP\s+(COLUMN|TABLE)\b/i', $migration));
check('does not rename columns', is_string($migration) && !preg_match('/\bRENAME\s+COLUMN\b/i', $migration));
check('keeps Bunny lookup index', is_string($migration) && str_contains($migration, 'uk_videos_provider_video_id'));
check('rollback has a Dedicated-record safety guard', is_string($migration) && str_contains($migration, 'Cannot roll back provider-neutral video schema while OneProvider records exist.'));
check('rollback removes only provider-neutral columns', is_string($migration) && str_contains($migration, "['duration', 'processing_status', 'playback_url', 'storage_path', 'provider_video_id', 'provider']"));

$fillable = (new Video())->getFillable();
$casts = (new Video())->getCasts();
foreach (['provider', 'provider_video_id', 'storage_path', 'playback_url', 'processing_status', 'duration'] as $field) {
    check("Video model exposes {$field}", in_array($field, $fillable, true));
}
check('Video model casts duration as float', ($casts['duration'] ?? null) === 'float');

// Characterize the compatibility contract for a legacy row without a DB
// connection: legacy Bunny fields remain writable and are not replaced by
// the provider-neutral fields.
$legacy = new Video([
    'bunny_library_id' => 123,
    'bunny_video_guid' => 'legacy-guid',
    'status' => Video::STATUS_READY,
    'duration_seconds' => 42,
]);
check('legacy Bunny library id remains available', (int) $legacy->bunny_library_id === 123);
check('legacy Bunny guid remains available', $legacy->bunny_video_guid === 'legacy-guid');
check('legacy application status remains available', $legacy->status === Video::STATUS_READY);

if ($failures > 0) {
    fwrite(STDERR, "{$failures} failing assertion(s)\n");
    exit(1);
}

echo "All assertions passed.\n";
