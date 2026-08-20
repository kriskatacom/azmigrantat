<?php

use Phinx\Migration\AbstractMigration;

final class CreateMessagesTable extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('messages')) {
            return;
        }

        $table = $this->table('messages', [
            'id' => false,
            'primary_key' => ['id'],
            'engine' => 'InnoDB',
            'encoding' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
        ]);

        $table
            ->addColumn('id', 'biginteger', [
                'signed' => false,
                'identity' => true,
            ])
            ->addColumn('conversation_id', 'biginteger', [
                'signed' => false,
                'null' => false,
            ])
            ->addColumn('sender_id', 'integer', [
                'signed' => false,
                'null' => false,
            ])
            ->addColumn('client_message_id', 'char', [
                'limit' => 36,
                'null' => true,
            ])
            ->addColumn('type', 'enum', [
                'values' => [
                    'text',
                    'image',
                    'video',
                    'audio',
                    'file',
                    'system',
                ],
                'default' => 'text',
                'null' => false,
            ])
            ->addColumn('content', 'text', [
                'null' => true,
            ])
            ->addColumn('metadata', 'json', [
                'null' => true,
            ])
            ->addColumn('status', 'enum', [
                'values' => [
                    'sent',
                    'delivered',
                    'read',
                ],
                'default' => 'sent',
                'null' => false,
            ])
            ->addColumn('delivered_at', 'datetime', [
                'precision' => 3,
                'null' => true,
            ])
            ->addColumn('read_at', 'datetime', [
                'precision' => 3,
                'null' => true,
            ])
            ->addColumn('edited_at', 'datetime', [
                'precision' => 3,
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
            ->addIndex(
                ['sender_id', 'client_message_id'],
                [
                    'unique' => true,
                    'name' => 'uk_messages_sender_client',
                ]
            )
            ->addIndex(
                ['conversation_id', 'id'],
                [
                    'name' => 'idx_messages_conversation_id',
                ]
            )
            ->addIndex(
                ['sender_id'],
                [
                    'name' => 'idx_messages_sender_id',
                ]
            )
            ->addIndex(
                ['status'],
                [
                    'name' => 'idx_messages_status',
                ]
            )
            ->addIndex(
                ['created_at'],
                [
                    'name' => 'idx_messages_created_at',
                ]
            )
            ->addForeignKey(
                'conversation_id',
                'conversations',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_messages_conversation',
                ]
            )
            ->addForeignKey(
                'sender_id',
                'users',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_messages_sender',
                ]
            )
            ->create();
    }
}