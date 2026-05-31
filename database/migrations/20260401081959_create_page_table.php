<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class CreatePageTable extends AbstractMigration
{
    public function change(): void
    {
        $table = $this->table('pages', ['id' => 'id', 'signed' => false]);

        $table->addColumn('parent_id', 'integer', ['signed' => false, 'null' => true, 'default' => null])
            ->addColumn('title', 'string', ['limit' => 255, 'null' => false])
            ->addColumn('slug', 'string', ['limit' => 255, 'null' => false])
            ->addColumn('custom_path', 'string', ['limit' => 255, 'null' => true, 'default' => null])
            ->addColumn('content', 'text', ['limit' => \Phinx\Db\Adapter\MysqlAdapter::TEXT_LONG, 'null' => true])
            ->addColumn('template', 'string', ['limit' => 50, 'default' => 'default'])
            ->addColumn('view_name', 'string', ['limit' => 40, 'null' => true])
            ->addColumn('seo', 'json', ['null' => true])
            ->addColumn('options', 'json', ['null' => true])
            ->addColumn('menu_order', 'integer', ['default' => 0])
            ->addColumn('image_url', 'string', ['limit' => 255, 'null' => true])
            ->addColumn('is_active', 'boolean', ['default' => true])
            ->addColumn('created_at', 'timestamp', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'timestamp', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])
            ->addColumn('deleted_at', 'timestamp', ['null' => true, 'default' => null])
            
            // Индекси и уникалност
            ->addIndex(['slug'], ['unique' => true, 'name' => 'unique_slug'])
            ->addIndex(['parent_id'])
            
            // Външна връзка
            ->addForeignKey('parent_id', 'pages', 'id', [
                'delete' => 'SET_NULL',
                'update' => 'NO_ACTION'
            ])
            ->create();
    }
}