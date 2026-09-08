<?php

use Phinx\Migration\AbstractMigration;

final class CreatePushTokensTable extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('push_tokens')) {
            return;
        }

        $table = $this->table('push_tokens', [
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
            ->addColumn('user_id', 'integer', [
                'signed' => false,
                'null' => false,
            ])
            ->addColumn('token', 'string', [
                'limit' => 255,
                'null' => false,
            ])
            ->addColumn('platform', 'enum', [
                'values' => [
                    'android',
                    'ios',
                ],
                'null' => false,
            ])
            ->addColumn('device_id', 'string', [
                'limit' => 255,
                'null' => true,
            ])
            ->addColumn('last_used_at', 'datetime', [
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
                ['token'],
                [
                    'unique' => true,
                    'name' => 'uk_push_tokens_token',
                ]
            )
            ->addIndex(
                ['user_id'],
                [
                    'name' => 'idx_push_tokens_user',
                ]
            )
            ->addIndex(
                ['user_id', 'platform'],
                [
                    'name' => 'idx_push_tokens_user_platform',
                ]
            )
            ->addForeignKey(
                'user_id',
                'users',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_push_tokens_user',
                ]
            )
            ->create();
    }
}
