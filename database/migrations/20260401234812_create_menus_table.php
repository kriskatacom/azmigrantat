<?php

use Phinx\Migration\AbstractMigration;

class CreateMenusTable extends AbstractMigration
{
    public function change(): void
    {
        // Тук си задал signed => false (Unsigned)
        $menus = $this->table('menus', ['id' => 'id', 'signed' => false]);
        $menus->addColumn('title', 'string', ['limit' => 255])
            ->addColumn('slug', 'string', ['limit' => 255])
            ->addColumn('description', 'text', ['null' => true])
            ->addColumn('created_at', 'datetime', ['null' => true, 'precision' => 3])
            ->addColumn('updated_at', 'datetime', ['null' => true, 'precision' => 3])
            ->addColumn('deleted_at', 'datetime', ['null' => true, 'precision' => 3])
            ->addIndex(['slug'], ['unique' => true])
            ->create();

        $menuItems = $this->table('menu_items', ['id' => 'id', 'signed' => false]);

        // ПРОМЯНА: Всички външни ключове трябва да са signed => false, за да съвпадат
        $menuItems->addColumn('menu_id', 'integer', ['signed' => false])
            ->addColumn('parent_id', 'integer', ['null' => true, 'signed' => false])
            ->addColumn('page_id', 'integer', ['null' => true, 'signed' => false]) // Провери дали и в pages е така!
            ->addColumn('title', 'string', ['limit' => 255])
            ->addColumn('url', 'string', ['limit' => 255, 'null' => true])
            ->addColumn('target', 'enum', ['values' => ['_self', '_blank'], 'default' => '_self'])
            ->addColumn('order_index', 'integer', ['default' => 0])
            ->addColumn('is_active', 'boolean', ['default' => true])
            ->addColumn('created_at', 'datetime', ['null' => true, 'precision' => 3])
            ->addColumn('updated_at', 'datetime', ['null' => true, 'precision' => 3]);

        $menuItems->addForeignKey('menu_id', 'menus', 'id', ['delete' => 'CASCADE', 'update' => 'NO_ACTION'])
            ->addForeignKey('parent_id', 'menu_items', 'id', ['delete' => 'CASCADE', 'update' => 'NO_ACTION'])
            ->addForeignKey('page_id', 'pages', 'id', ['delete' => 'SET_NULL', 'update' => 'NO_ACTION']);

        $menuItems->create();
    }
}