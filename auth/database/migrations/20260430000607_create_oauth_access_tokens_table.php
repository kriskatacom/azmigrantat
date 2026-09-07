<?php

use Phinx\Migration\AbstractMigration;

final class CreateOauthAccessTokensTable extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('oauth_access_tokens')) {
            return;
        }

        $table = $this->table('oauth_access_tokens', [
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
            ->addColumn('token', 'string', [
                'limit' => 100,
                'null' => true,
            ])
            ->addColumn('user_id', 'integer', [
                'signed' => false,
                'null' => true,
            ])
            ->addColumn('app_id', 'integer', [
                'signed' => false,
                'null' => true,
            ])
            ->addColumn('expires_at', 'timestamp', [
                'null' => true,
            ])
            ->addColumn('created_at', 'timestamp', [
                'default' => 'CURRENT_TIMESTAMP',
                'null' => true,
            ])
            ->addIndex(['token'], [
                'unique' => true,
                'name' => 'token',
            ])
            ->addIndex(['user_id'], [
                'name' => 'user_id',
            ])
            ->addForeignKey(
                'user_id',
                'users',
                'id',
                [
                    'delete' => 'SET_NULL',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_oauth_access_tokens_user',
                ]
            )
            ->addForeignKey(
                'app_id',
                'oauth_apps',
                'id',
                [
                    'delete' => 'SET_NULL',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_oauth_access_tokens_app',
                ]
            )
            ->create();
    }
}