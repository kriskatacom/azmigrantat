<?php

use Phinx\Migration\AbstractMigration;

final class CreateVideoSaves extends AbstractMigration
{
    public function up(): void
    {
        if ($this->hasTable('video_saves')) {
            throw new RuntimeException('video_saves already exists; inspect schema drift before continuing.');
        }

        $this->table('video_saves', [
            'id' => false,
            'primary_key' => ['id'],
            'engine' => 'InnoDB',
            'encoding' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
        ])
            ->addColumn('id', 'biginteger', ['signed' => false, 'identity' => true])
            ->addColumn('video_id', 'biginteger', ['signed' => false])
            ->addColumn('user_id', 'integer', ['signed' => false])
            ->addTimestamps()
            ->addIndex(['user_id', 'video_id'], ['unique' => true, 'name' => 'uk_video_saves_user_video'])
            ->addIndex(['video_id'], ['name' => 'idx_video_saves_video'])
            ->addForeignKey('video_id', 'videos', 'id', ['delete' => 'CASCADE', 'update' => 'CASCADE'])
            ->addForeignKey('user_id', 'users', 'id', ['delete' => 'CASCADE', 'update' => 'CASCADE'])
            ->create();
    }

    public function down(): void
    {
        throw new RuntimeException(
            'Destructive rollback is disabled. Removing saved videos requires a separately reviewed migration.'
        );
    }
}
