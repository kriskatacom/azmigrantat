<?php

use Phinx\Migration\AbstractMigration;

final class CreateOauthAuthCodesTable extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('oauth_auth_codes')) {
            return;
        }

        $table = $this->table('oauth_auth_codes', [
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
            ->addColumn('user_id', 'integer', [
                'signed' => false,
                'null' => true,
            ])
            ->addColumn('app_id', 'integer', [
                'signed' => false,
                'null' => true,
            ])
            ->addColumn('code', 'string', [
                'limit' => 100,
                'null' => true,
            ])
            ->addColumn('redirect_uri', 'text', [
                'null' => true,
            ])
            ->addColumn('expires_at', 'timestamp', [
                'null' => true,
            ])
            ->addColumn('created_at', 'timestamp', [
                'default' => 'CURRENT_TIMESTAMP',
                'null' => true,
            ])
            ->addColumn('updated_at', 'timestamp', [
                'null' => true,
                'update' => 'CURRENT_TIMESTAMP',
            ])
            ->addIndex(['code'], [
                'unique' => true,
                'name' => 'code',
            ])
            ->addIndex(['user_id'], [
                'name' => 'user_id',
            ])
            ->addIndex(['app_id'], [
                'name' => 'app_id',
            ])
            ->addForeignKey(
                'user_id',
                'users',
                'id',
                [
                    'delete' => 'SET_NULL',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_oauth_auth_codes_user',
                ]
            )
            ->addForeignKey(
                'app_id',
                'oauth_apps',
                'id',
                [
                    'delete' => 'SET_NULL',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_oauth_auth_codes_app',
                ]
            )
            ->create();
    }
}