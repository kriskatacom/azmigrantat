<?php

use Phinx\Migration\AbstractMigration;

class CreateCategoriesTable extends AbstractMigration
{
    public function change()
    {
        $table = $this->table('categories', ['id' => 'id']);
        
        $table->addColumn('name', 'string', ['limit' => 255])
              ->addColumn('slug', 'string', ['limit' => 255])
              ->addColumn('description', 'text', ['null' => true])
              ->addColumn('image_url', 'string', ['limit' => 500, 'null' => true])
              ->addColumn('parent_id', 'integer', ['null' => true, 'default' => null])
              
              ->addColumn('deleted_at', 'datetime', ['null' => true, 'default' => null])
              
              ->addTimestamps()
              
              ->addIndex(['slug'], ['unique' => true])
              ->addIndex(['parent_id'])
              
              ->addForeignKey('parent_id', 'categories', 'id', [
                  'delete' => 'SET_NULL', 
                  'update' => 'CASCADE'
              ])
              ->create();
    }
}