<?php

use Phinx\Migration\AbstractMigration;

final class CreateParticipantsTable extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('participants')) {
            return;
        }

        $table = $this->table('participants', [
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
            ->addColumn('user_id', 'integer', [
                'signed' => false,
                'null' => false,
            ])
            ->addColumn('role', 'enum', [
                'values' => [
                    'member',
                    'admin',
                    'owner',
                ],
                'default' => 'member',
                'null' => false,
            ])
            ->addColumn('last_read_message_id', 'biginteger', [
                'signed' => false,
                'null' => true,
            ])
            ->addColumn('last_read_at', 'datetime', [
                'precision' => 3,
                'null' => true,
            ])
            ->addColumn('is_muted', 'boolean', [
                'default' => false,
                'null' => false,
            ])
            ->addColumn('is_archived', 'boolean', [
                'default' => false,
                'null' => false,
            ])
            ->addColumn('joined_at', 'datetime', [
                'precision' => 3,
                'null' => true,
            ])
            ->addColumn('left_at', 'datetime', [
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
            ->addIndex(
                ['conversation_id', 'user_id'],
                [
                    'unique' => true,
                    'name' => 'uk_participants_conversation_user',
                ]
            )
            ->addIndex(
                ['user_id'],
                [
                    'name' => 'idx_participants_user',
                ]
            )
            ->addIndex(
                ['conversation_id'],
                [
                    'name' => 'idx_participants_conversation',
                ]
            )
            ->addIndex(
                ['last_read_message_id'],
                [
                    'name' => 'idx_participants_last_read_message',
                ]
            )
            ->addForeignKey(
                'conversation_id',
                'conversations',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_participants_conversation',
                ]
            )
            ->addForeignKey(
                'user_id',
                'users',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_participants_user',
                ]
            )
            ->addForeignKey(
                'last_read_message_id',
                'messages',
                'id',
                [
                    'delete' => 'SET_NULL',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_participants_last_read_message',
                ]
            )
            ->create();
    }
}