<?php

use Phinx\Migration\AbstractMigration;

final class AddCategoryIdToVideos extends AbstractMigration
{
    public function change(): void
    {
        if (!$this->hasTable('videos')) {
            return;
        }

        $table = $this->table('videos');

        // categories.id is a signed INT in the existing schema. Keep the
        // child column compatible so MySQL can create the foreign key.
        if (!$table->hasColumn('category_id')) {
            $table
                ->addColumn('category_id', 'integer', ['null' => true, 'after' => 'user_id'])
                ->update();
        }

        $table = $this->table('videos');
        if (!$table->hasIndexByName('idx_videos_category')) {
            $table->addIndex(['category_id'], ['name' => 'idx_videos_category'])->update();
        }

        if (!$table->hasForeignKey('category_id', 'fk_videos_category')) {
            $table
                ->addForeignKey('category_id', 'categories', 'id', [
                    'delete' => 'SET_NULL',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_videos_category',
                ])
                ->update();
        }
    }
}
