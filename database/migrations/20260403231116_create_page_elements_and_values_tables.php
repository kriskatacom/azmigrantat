<?php

use Phinx\Migration\AbstractMigration;

class CreatePageElementsAndValuesTables extends AbstractMigration
{
    public function change(): void
    {
        $pageElements = $this->table('page_elements');
        $pageElements->addColumn('key_name', 'string', ['limit' => 50])
            ->addColumn('label', 'string', ['limit' => 100])
            ->addColumn('section_name', 'string', ['limit' => 100, 'default' => 'Общи'])
            ->addColumn('type', 'enum', [
                'values' => ['text', 'editor', 'textarea', 'image', 'gallery'],
                'default' => 'text'
            ])
            ->addColumn('value', 'text', ['limit' => \Phinx\Db\Adapter\MysqlAdapter::TEXT_LONG, 'null' => true])
            ->addColumn('sort_order', 'integer', ['default' => 0])
            ->addColumn('is_active', 'boolean', ['default' => true])
            ->addColumn('help_text', 'string', ['limit' => 255, 'null' => true])
            ->addColumn('page_id', 'integer')
            ->create();

        $pageElementValues = $this->table('page_element_values');
        $pageElementValues
            ->addColumn('page_id', 'integer')
            ->addColumn('element_id', 'integer', ['signed' => false])
            ->addColumn('value', 'text', ['null' => true])
            ->addColumn('created_at', 'timestamp', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'timestamp', [
                'default' => 'CURRENT_TIMESTAMP',
                'update' => 'CURRENT_TIMESTAMP'
            ])
            ->addIndex(['page_id', 'element_id'], ['unique' => true, 'name' => 'unique_page_element'])
            ->addForeignKey('element_id', 'page_elements', 'id', [
                'delete' => 'CASCADE',
                'update' => 'NO_ACTION',
                'constraint' => 'fk_element_id'
            ])
            ->create();
    }
}