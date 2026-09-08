<?php

use Phinx\Migration\AbstractMigration;

final class CreateConversationsTable extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('conversations')) {
            return;
        }

        $table = $this->table('conversations', [
            'id' => false,
            'primary_key' => ['id'],
            'engine' => 'InnoDB',
            'collation' => 'utf8mb4_unicode_ci',
            'encoding' => 'utf8mb4',
        ]);

        $table
            ->addColumn('id', 'biginteger', [
                'signed' => false,
                'identity' => true,
            ])
            ->addColumn('type', 'enum', [
                'values' => ['direct', 'group'],
                'default' => 'direct',
                'null' => false,
            ])
            ->addColumn('direct_key', 'string', [
                'limit' => 100,
                'null' => true,
            ])
            ->addColumn('title', 'string', [
                'limit' => 255,
                'null' => true,
            ])
            ->addColumn('image', 'string', [
                'limit' => 500,
                'null' => true,
            ])
            ->addColumn('created_by', 'integer', [
                'signed' => false,
                'null' => true,
            ])
            ->addColumn('last_message_id', 'biginteger', [
                'signed' => false,
                'null' => true,
            ])
            ->addColumn('is_active', 'boolean', [
                'default' => true,
                'null' => false,
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
            ->addIndex(['direct_key'], [
                'unique' => true,
                'name' => 'uk_conversations_direct_key',
            ])
            ->addIndex(['type'], [
                'name' => 'idx_conversations_type',
            ])
            ->addIndex(['created_by'], [
                'name' => 'idx_conversations_created_by',
            ])
            ->addIndex(['last_message_id'], [
                'name' => 'idx_conversations_last_message',
            ])
            ->addForeignKey(
                'created_by',
                'users',
                'id',
                [
                    'delete' => 'SET_NULL',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_conversations_created_by',
                ]
            )
            ->create();
    }
}