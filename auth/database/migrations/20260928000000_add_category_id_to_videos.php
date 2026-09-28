<?php

use Phinx\Migration\AbstractMigration;

final class AddCategoryIdToVideos extends AbstractMigration
{
    public function change(): void
    {
        if (!$this->hasTable('videos') || $this->table('videos')->hasColumn('category_id')) {
            return;
        }

        $this->table('videos')
            ->addColumn('category_id', 'integer', ['null' => true, 'signed' => false, 'after' => 'user_id'])
            ->addIndex(['category_id'], ['name' => 'idx_videos_category'])
            ->addForeignKey('category_id', 'categories', 'id', [
                'delete' => 'SET_NULL',
                'update' => 'CASCADE',
                'constraint' => 'fk_videos_category',
            ])
            ->update();
    }
}
