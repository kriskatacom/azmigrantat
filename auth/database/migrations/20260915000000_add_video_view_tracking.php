<?php

use Phinx\Migration\AbstractMigration;

final class AddVideoViewTracking extends AbstractMigration
{
    public function change(): void
    {
        $videos = $this->table('videos');
        if (!$videos->hasColumn('total_views')) {
            $videos->addColumn('total_views', 'biginteger', [
                'signed' => false,
                'default' => 0,
                'null' => false,
            ]);
        }
        if (!$videos->hasColumn('unique_viewers')) {
            $videos->addColumn('unique_viewers', 'biginteger', [
                'signed' => false,
                'default' => 0,
                'null' => false,
            ]);
        }
        $videos->save();

        if ($this->hasTable('video_views')) {
            return;
        }

        $this->table('video_views', [
            'id' => false,
            'primary_key' => ['id'],
            'engine' => 'InnoDB',
            'encoding' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
        ])
            ->addColumn('id', 'biginteger', ['signed' => false, 'identity' => true])
            ->addColumn('video_id', 'biginteger', ['signed' => false, 'null' => false])
            ->addColumn('user_id', 'integer', ['signed' => false, 'null' => false])
            ->addColumn('view_count', 'biginteger', ['signed' => false, 'default' => 1, 'null' => false])
            ->addColumn('first_viewed_at', 'datetime', ['precision' => 3, 'null' => false])
            ->addColumn('last_viewed_at', 'datetime', ['precision' => 3, 'null' => false])
            ->addIndex(['video_id', 'user_id'], ['unique' => true, 'name' => 'uk_video_views_video_user'])
            ->addIndex(['user_id', 'last_viewed_at'], ['name' => 'idx_video_views_user_last'])
            ->addForeignKey('video_id', 'videos', 'id', [
                'delete' => 'CASCADE',
                'update' => 'CASCADE',
                'constraint' => 'fk_video_views_video',
            ])
            ->addForeignKey('user_id', 'users', 'id', [
                'delete' => 'CASCADE',
                'update' => 'CASCADE',
                'constraint' => 'fk_video_views_user',
            ])
            ->create();
    }
}
