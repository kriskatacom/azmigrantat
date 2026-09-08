<?php

use Phinx\Migration\AbstractMigration;

final class CreateOauthUserConsentsTable extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('oauth_user_consents')) {
            return;
        }

        $table = $this->table('oauth_user_consents', [
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
            ->addColumn('created_at', 'timestamp', [
                'default' => 'CURRENT_TIMESTAMP',
                'null' => true,
            ])
            ->addColumn('updated_at', 'timestamp', [
                'default' => 'CURRENT_TIMESTAMP',
                'update' => 'CURRENT_TIMESTAMP',
                'null' => true,
            ])
            ->addIndex(
                ['user_id', 'app_id'],
                [
                    'unique' => true,
                    'name' => 'user_id',
                ]
            )
            ->addIndex(
                ['app_id'],
                [
                    'name' => 'app_id',
                ]
            )
            ->addForeignKey(
                'user_id',
                'users',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'oauth_user_consents_ibfk_1',
                ]
            )
            ->addForeignKey(
                'app_id',
                'oauth_apps',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'oauth_user_consents_ibfk_2',
                ]
            )
            ->create();
    }
}
