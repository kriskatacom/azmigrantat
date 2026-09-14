<?php

use Phinx\Migration\AbstractMigration;

final class CreateVideosTable extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('videos')) {
            return;
        }

        $this->table('videos', [
            'id' => false,
            'primary_key' => ['id'],
            'engine' => 'InnoDB',
            'encoding' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
        ])
            ->addColumn('id', 'biginteger', ['signed' => false, 'identity' => true])
            ->addColumn('user_id', 'integer', ['signed' => false, 'null' => false])
            ->addColumn('bunny_library_id', 'biginteger', ['signed' => false, 'null' => false])
            ->addColumn('bunny_video_guid', 'string', ['limit' => 64, 'null' => false])
            ->addColumn('title', 'string', ['limit' => 120, 'null' => false])
            ->addColumn('description', 'text', ['null' => true])
            ->addColumn('thumbnail_url', 'string', ['limit' => 500, 'null' => true])
            ->addColumn('status', 'enum', [
                'values' => ['pending_upload', 'uploading', 'processing', 'ready', 'failed', 'deleted'],
                'default' => 'pending_upload',
                'null' => false,
            ])
            ->addColumn('bunny_status', 'integer', ['null' => true, 'signed' => false])
            ->addColumn('mime_type', 'string', ['limit' => 100, 'null' => true])
            ->addColumn('file_size', 'biginteger', ['null' => true, 'signed' => false])
            ->addColumn('duration_seconds', 'integer', ['null' => true, 'signed' => false])
            ->addColumn('width', 'integer', ['null' => true, 'signed' => false])
            ->addColumn('height', 'integer', ['null' => true, 'signed' => false])
            ->addColumn('upload_expires_at', 'datetime', ['precision' => 3, 'null' => true])
            ->addColumn('uploaded_at', 'datetime', ['precision' => 3, 'null' => true])
            ->addColumn('processed_at', 'datetime', ['precision' => 3, 'null' => true])
            ->addColumn('failed_at', 'datetime', ['precision' => 3, 'null' => true])
            ->addColumn('failure_reason', 'string', ['limit' => 255, 'null' => true])
            ->addColumn('created_at', 'datetime', ['precision' => 3, 'null' => true])
            ->addColumn('updated_at', 'datetime', ['precision' => 3, 'null' => true])
            ->addIndex(['user_id', 'status', 'created_at'], ['name' => 'idx_videos_user_status_created'])
            ->addIndex(['status'], ['name' => 'idx_videos_status'])
            ->addIndex(['bunny_library_id', 'bunny_video_guid'], ['unique' => true, 'name' => 'uk_videos_bunny_guid'])
            ->addForeignKey('user_id', 'users', 'id', [
                'delete' => 'CASCADE',
                'update' => 'CASCADE',
                'constraint' => 'fk_videos_user',
            ])
            ->create();
    }
}

