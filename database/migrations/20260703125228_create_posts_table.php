<?php

use Phinx\Migration\AbstractMigration;

class CreatePostsTable extends AbstractMigration
{
    public function change(): void
    {
        if (!$this->hasTable('posts')) {
            $table = $this->table('posts');
            $table->addColumn('name', 'string', ['limit' => 255])
                ->addColumn('slug', 'string', ['limit' => 255])
                ->addColumn('location', 'string', ['limit' => 255, 'null' => true])
                ->addColumn('content', 'text', ['null' => true])
                
                ->addColumn('images', 'text', ['null' => true]) 
                
                ->addColumn('user_id', 'integer', ['signed' => false])
                ->addColumn('category_id', 'integer', ['null' => true, 'signed' => false])
                ->addColumn('created_at', 'datetime', ['null' => true, 'precision' => 3])
                ->addColumn('updated_at', 'datetime', ['null' => true, 'precision' => 3])
                ->addColumn('deleted_at', 'datetime', ['null' => true, 'precision' => 3])
                
                ->addIndex(['slug'], ['unique' => true])
                ->addIndex(['user_id'])
                
                ->addForeignKey('user_id', 'users', 'id', [
                    'delete' => 'CASCADE', 
                    'update' => 'NO_ACTION'
                ])
                ->create();
        }
    }
}