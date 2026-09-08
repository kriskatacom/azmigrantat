<?php

use Phinx\Migration\AbstractMigration;

final class CreateCategoriesTable extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('categories')) {
            return;
        }

        $table = $this->table('categories', [
            'id' => false,
            'primary_key' => ['id'],
            'engine' => 'InnoDB',
            'encoding' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
        ]);

        $table
            ->addColumn('id', 'integer', [
                'identity' => true,
            ])
            ->addColumn('name', 'string', [
                'limit' => 255,
                'null' => false,
            ])
            ->addColumn('slug', 'string', [
                'limit' => 255,
                'null' => false,
            ])
            ->addColumn('description', 'text', [
                'null' => true,
            ])
            ->addColumn('image_url', 'string', [
                'limit' => 500,
                'null' => true,
            ])
            ->addColumn('parent_id', 'integer', [
                'null' => true,
            ])
            ->addColumn('is_active', 'boolean', [
                'default' => true,
                'null' => false,
            ])
            ->addColumn('deleted_at', 'datetime', [
                'null' => true,
            ])
            ->addColumn('created_at', 'timestamp', [
                'default' => 'CURRENT_TIMESTAMP',
                'null' => false,
            ])
            ->addColumn('updated_at', 'timestamp', [
                'default' => 'CURRENT_TIMESTAMP',
                'update' => 'CURRENT_TIMESTAMP',
                'null' => false,
            ])
            ->addIndex(['slug'], [
                'unique' => true,
                'name' => 'unique_slug',
            ])
            ->addIndex(['parent_id'], [
                'name' => 'idx_parent_id',
            ])
            ->addIndex(['deleted_at'], [
                'name' => 'idx_deleted_at',
            ])
            ->addIndex(['is_active'], [
                'name' => 'idx_is_active',
            ])
            ->addForeignKey(
                'parent_id',
                'categories',
                'id',
                [
                    'delete' => 'SET_NULL',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_parent_category',
                ]
            )
            ->create();
    }
}