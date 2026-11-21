<?php

use Phinx\Migration\AbstractMigration;

final class CreateVideoComments extends AbstractMigration
{
    public function up(): void
    {
        if ($this->hasTable('video_comments') || $this->hasTable('video_comment_likes')) {
            throw new RuntimeException('Video comment tables already exist; inspect schema drift before continuing.');
        }

        $this->table('video_comments', [
            'id' => false,
            'primary_key' => ['id'],
            'engine' => 'InnoDB',
            'encoding' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
        ])
            ->addColumn('id', 'biginteger', ['signed' => false, 'identity' => true])
            ->addColumn('video_id', 'biginteger', ['signed' => false])
            ->addColumn('user_id', 'integer', ['signed' => false])
            ->addColumn('parent_id', 'biginteger', ['signed' => false, 'null' => true])
            ->addColumn('root_id', 'biginteger', ['signed' => false, 'null' => true])
            ->addColumn('body', 'string', ['limit' => 1000, 'null' => true])
            ->addColumn('status', 'enum', [
                'values' => ['active', 'deleted'],
                'default' => 'active',
            ])
            ->addColumn('replies_count', 'integer', ['signed' => false, 'default' => 0])
            ->addColumn('likes_count', 'integer', ['signed' => false, 'default' => 0])
            ->addTimestamps()
            ->addIndex(['video_id', 'parent_id', 'id'], ['name' => 'idx_video_comments_roots'])
            ->addIndex(['root_id', 'id'], ['name' => 'idx_video_comments_thread'])
            ->addIndex(['parent_id'], ['name' => 'idx_video_comments_parent'])
            ->addIndex(['user_id', 'created_at'], ['name' => 'idx_video_comments_user_created'])
            ->addForeignKey('video_id', 'videos', 'id', ['delete' => 'CASCADE', 'update' => 'CASCADE'])
            ->addForeignKey('user_id', 'users', 'id', ['delete' => 'CASCADE', 'update' => 'CASCADE'])
            ->create();

        $this->table('video_comment_likes', [
            'id' => false,
            'primary_key' => ['id'],
            'engine' => 'InnoDB',
            'encoding' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
        ])
            ->addColumn('id', 'biginteger', ['signed' => false, 'identity' => true])
            ->addColumn('comment_id', 'biginteger', ['signed' => false])
            ->addColumn('user_id', 'integer', ['signed' => false])
            ->addColumn('created_at', 'datetime', ['precision' => 3, 'null' => true])
            ->addIndex(['comment_id', 'user_id'], ['unique' => true, 'name' => 'uk_video_comment_likes'])
            ->addIndex(['user_id'], ['name' => 'idx_video_comment_likes_user'])
            ->addForeignKey('comment_id', 'video_comments', 'id', ['delete' => 'CASCADE', 'update' => 'CASCADE'])
            ->addForeignKey('user_id', 'users', 'id', ['delete' => 'CASCADE', 'update' => 'CASCADE'])
            ->create();

        if (!$this->table('videos')->hasColumn('comments_count')) {
            $this->table('videos')
                ->addColumn('comments_count', 'integer', [
                    'signed' => false,
                    'default' => 0,
                    'after' => 'unique_viewers',
                ])
                ->update();
        }
    }

    public function down(): void
    {
        throw new RuntimeException(
            'Destructive rollback is disabled. Removing video comments requires a separately reviewed migration.'
        );
    }
}

