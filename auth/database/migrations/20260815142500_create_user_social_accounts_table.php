<?php

use Phinx\Migration\AbstractMigration;

final class CreateUserSocialAccountsTable extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('user_social_accounts')) {
            return;
        }

        $table = $this->table('user_social_accounts');

        $table
            ->addColumn('user_id', 'integer', [
                'signed' => false,
                'null' => false,
            ])
            ->addColumn('provider', 'string', [
                'limit' => 50,
                'null' => false,
            ])
            ->addColumn('provider_user_id', 'string', [
                'limit' => 255,
                'null' => false,
            ])
            ->addColumn('email', 'string', [
                'limit' => 255,
                'null' => true,
            ])
            ->addColumn('created_at', 'datetime', [
                'null' => false,
                'default' => 'CURRENT_TIMESTAMP',
            ])
            ->addColumn('updated_at', 'datetime', [
                'null' => false,
                'default' => 'CURRENT_TIMESTAMP',
                'update' => 'CURRENT_TIMESTAMP',
            ])
            ->addIndex(
                ['provider', 'provider_user_id'],
                [
                    'unique' => true,
                    'name' => 'uniq_social_provider_user',
                ]
            )
            ->addIndex(
                ['user_id', 'provider'],
                [
                    'unique' => true,
                    'name' => 'uniq_user_provider',
                ]
            )
            ->addForeignKey(
                'user_id',
                'users',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'NO_ACTION',
                ]
            )
            ->create();
    }
}