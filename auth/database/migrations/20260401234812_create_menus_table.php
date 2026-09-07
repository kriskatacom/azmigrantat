<?php

use Phinx\Migration\AbstractMigration;

final class CreateMenusTable extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('menus')) {
            return;
        }

        $table = $this->table('menus', [
            'id' => false,
            'primary_key' => ['id'],
            'engine' => 'InnoDB',
            'encoding' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
        ]);

        $table
            ->addColumn('id', 'integer', [
                'signed' => false,
                'identity' => true,
            ])
            ->addColumn('title', 'string', [
                'limit' => 255,
                'null' => true,
            ])
            ->addColumn('slug', 'string', [
                'limit' => 255,
                'null' => true,
            ])
            ->addColumn('description', 'text', [
                'null' => true,
            ])
            ->addColumn('created_at', 'datetime', [
                'precision' => 3,
                'null' => true,
            ])
            ->addColumn('updated_at', 'datetime', [
                'precision' => 3,
                'null' => true,
            ])
            ->addColumn('deleted_at', 'datetime', [
                'precision' => 3,
                'null' => true,
            ])
            ->addIndex(['slug'], [
                'unique' => true,
                'name' => 'slug',
            ])
            ->create();
    }
}
