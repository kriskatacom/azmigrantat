<?php

use Phinx\Db\Adapter\MysqlAdapter;
use Phinx\Migration\AbstractMigration;

class CreatePostsTable extends AbstractMigration
{
    public function change(): void
    {
        $table = $this->table('posts', [
            'id' => 'id', 
            'signed' => false,
        ]);

        $table->addColumn('name', 'string', ['limit' => 255, 'null' => false, 'collation' => 'utf8mb4_unicode_ci'])
              ->addColumn('slug', 'string', ['limit' => 255, 'null' => false, 'collation' => 'utf8mb4_unicode_ci'])
              ->addColumn('location', 'string', ['limit' => 255, 'null' => true, 'default' => null, 'collation' => 'utf8mb4_unicode_ci'])
              ->addColumn('content', 'text', ['null' => true, 'default' => null, 'collation' => 'utf8mb4_unicode_ci'])
              ->addColumn('images', 'text', ['null' => true, 'default' => null, 'collation' => 'utf8mb4_unicode_ci'])
              ->addColumn('video_url', 'text', ['null' => true, 'default' => null, 'collation' => 'utf8mb4_unicode_ci'])
              ->addColumn('user_id', 'integer', ['signed' => false, 'null' => false])
              ->addColumn('category_id', 'integer', ['signed' => true, 'null' => true, 'default' => null])
              ->addColumn('is_active', 'integer', ['limit' => MysqlAdapter::INT_TINY, 'null' => false, 'default' => 1])
              ->addColumn('options', 'json', ['null' => true])
              ->addColumn('created_at', 'datetime', ['precision' => 3, 'null' => true, 'default' => null])
              ->addColumn('updated_at', 'datetime', ['precision' => 3, 'null' => true, 'default' => null])
              ->addColumn('deleted_at', 'datetime', ['precision' => 3, 'null' => true, 'default' => null]);

        $table->addIndex(['slug'], ['unique' => true, 'name' => 'posts_slug_unique'])
              ->addIndex(['user_id'], ['name' => 'posts_user_id_index']);

        $table->addForeignKey('user_id', 'users', 'id', [
            'delete' => 'CASCADE',
            'update' => 'NO_ACTION',
            'constraint' => 'fk_posts_user_id'
        ]);
    }
}
