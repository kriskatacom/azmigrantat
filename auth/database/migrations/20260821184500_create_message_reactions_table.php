<?php

use Phinx\Migration\AbstractMigration;

final class CreateMessageReactionsTable extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('message_reactions')) {
            return;
        }

        $table = $this->table('message_reactions', [
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
            ->addColumn('message_id', 'biginteger', [
                'signed' => false,
                'null' => false,
            ])
            ->addColumn('user_id', 'integer', [
                'signed' => false,
                'null' => false,
            ])
            ->addColumn('type', 'string', [
                'limit' => 16,
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
            ->addIndex(
                ['message_id', 'user_id'],
                [
                    'unique' => true,
                    'name' => 'uk_message_reactions_user',
                ]
            )
            ->addIndex(['message_id'], ['name' => 'idx_message_reactions_message'])
            ->addIndex(['user_id'], ['name' => 'idx_message_reactions_user'])
            ->addForeignKey(
                'message_id',
                'messages',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_message_reactions_message',
                ]
            )
            ->addForeignKey(
                'user_id',
                'users',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_message_reactions_user',
                ]
            )
            ->create();
    }
}
