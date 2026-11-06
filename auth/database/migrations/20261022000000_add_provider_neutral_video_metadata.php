<?php

use Phinx\Migration\AbstractMigration;

final class AddProviderNeutralVideoMetadata extends AbstractMigration
{
    public function change(): void
    {
        if (!$this->hasTable('videos')) {
            return;
        }

        $videos = $this->table('videos');

        if (!$videos->hasColumn('provider')) {
            $videos->addColumn('provider', 'string', [
                'limit' => 32,
                'default' => 'bunny',
                'null' => false,
                'after' => 'id',
            ]);
        }
        if (!$videos->hasColumn('provider_video_id')) {
            // Nullable during upload: the provider may allocate its identity
            // after the local video row has been created.
            $videos->addColumn('provider_video_id', 'string', [
                'limit' => 128,
                'null' => true,
                'after' => 'provider',
            ]);
        }
        if (!$videos->hasColumn('storage_path')) {
            $videos->addColumn('storage_path', 'string', [
                'limit' => 1000,
                'null' => true,
                'after' => 'provider_video_id',
            ]);
        }
        if (!$videos->hasColumn('playback_url')) {
            $videos->addColumn('playback_url', 'string', [
                'limit' => 1000,
                'null' => true,
                'after' => 'storage_path',
            ]);
        }
        if (!$videos->hasColumn('processing_status')) {
            $videos->addColumn('processing_status', 'string', [
                'limit' => 32,
                'null' => true,
                'after' => 'status',
            ]);
        }
        if (!$videos->hasColumn('duration')) {
            $videos->addColumn('duration', 'decimal', [
                'precision' => 10,
                'scale' => 3,
                'null' => true,
                'after' => 'duration_seconds',
            ]);
        }
        // file_size, thumbnail_url, created_at and updated_at already exist
        // in the original videos table and remain the canonical columns for
        // those metadata values.
        $videos->update();

        // Preserve every existing Bunny record without changing or removing
        // its legacy identifiers. Signed Bunny playback URLs are intentionally
        // not backfilled: they expire and are generated on demand.
        $this->execute(
            "UPDATE videos
             SET provider = 'bunny'
             WHERE provider IS NULL OR provider = ''"
        );
        $this->execute(
            "UPDATE videos
             SET provider_video_id = bunny_video_guid
             WHERE provider = 'bunny'
               AND (provider_video_id IS NULL OR provider_video_id = '')"
        );
        $this->execute(
            "UPDATE videos
             SET processing_status = status
             WHERE processing_status IS NULL OR processing_status = ''"
        );
        $this->execute(
            "UPDATE videos
             SET duration = duration_seconds
             WHERE duration IS NULL AND duration_seconds IS NOT NULL"
        );

        $videos = $this->table('videos');
        if (!$videos->hasIndexByName('uk_videos_provider_video_id')) {
            $videos
                ->addIndex(['provider', 'provider_video_id'], [
                    'unique' => true,
                    'name' => 'uk_videos_provider_video_id',
                ])
                ->update();
        }
    }

    public function down(): void
    {
        if (!$this->hasTable('videos')) {
            return;
        }

        // A schema rollback is safe only before any Dedicated record exists.
        // Legacy Bunny identifiers and application metadata are deliberately
        // retained, so a successful rollback returns routing to Bunny.
        if ($this->hasColumn('provider')) {
            $row = $this->fetchRow(
                "SELECT COUNT(*) AS dedicated_count
                 FROM videos
                 WHERE provider IS NOT NULL
                   AND provider <> ''
                   AND provider <> 'bunny'"
            );
            if ((int) ($row['dedicated_count'] ?? 0) > 0) {
                throw new RuntimeException('Cannot roll back provider-neutral video schema while OneProvider records exist.');
            }
        }

        $videos = $this->table('videos');
        if ($videos->hasIndexByName('uk_videos_provider_video_id')) {
            $videos->removeIndexByName('uk_videos_provider_video_id');
        }
        foreach (['duration', 'processing_status', 'playback_url', 'storage_path', 'provider_video_id', 'provider'] as $column) {
            if ($videos->hasColumn($column)) {
                $videos->removeColumn($column);
            }
        }
        $videos->update();
    }
}
