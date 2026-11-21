<?php

use Phinx\Migration\AbstractMigration;

final class CreateVideoEnhancementJobs extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('video_enhancement_jobs')) {
            return;
        }

        $this->table('video_enhancement_jobs', ['id' => true, 'signed' => false])
            ->addColumn('job_id', 'string', ['limit' => 36, 'null' => false])
            ->addColumn('video_id', 'biginteger', ['signed' => false, 'null' => false])
            ->addColumn('user_id', 'integer', ['signed' => false, 'null' => false])
            ->addColumn('upload_id', 'string', ['limit' => 128, 'null' => false])
            ->addColumn('requested_mode', 'string', ['limit' => 32, 'null' => false])
            ->addColumn('mode', 'string', ['limit' => 32, 'null' => false])
            ->addColumn('fallback_policy', 'string', ['limit' => 32, 'default' => 'none'])
            ->addColumn('status', 'string', ['limit' => 24, 'default' => 'pending'])
            ->addColumn('progress', 'integer', ['signed' => false, 'default' => 0])
            ->addColumn('estimated_seconds', 'integer', ['signed' => false, 'null' => true])
            ->addColumn('result_url', 'string', ['limit' => 1000, 'null' => true])
            ->addColumn('original_playback_url', 'string', ['limit' => 1000, 'null' => true])
            ->addColumn('failure_code', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('failure_reason', 'text', ['null' => true])
            ->addColumn('started_at', 'datetime', ['null' => true])
            ->addColumn('completed_at', 'datetime', ['null' => true])
            ->addTimestamps()
            ->addIndex(['job_id'], ['unique' => true, 'name' => 'uk_video_enhancement_job_id'])
            ->addIndex(['video_id', 'status'], ['name' => 'idx_video_enhancement_video_status'])
            ->addIndex(['user_id', 'created_at'], ['name' => 'idx_video_enhancement_user_created'])
            ->addForeignKey('video_id', 'videos', 'id', ['delete' => 'CASCADE', 'update' => 'NO_ACTION', 'constraint' => 'fk_video_enhancement_video'])
            ->addForeignKey('user_id', 'users', 'id', ['delete' => 'CASCADE', 'update' => 'NO_ACTION', 'constraint' => 'fk_video_enhancement_user'])
            ->create();
    }
}
