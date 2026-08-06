<?php

use Phinx\Migration\AbstractMigration;

final class CreateOauthAppsTable extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('oauth_apps')) {
            return;
        }

        $table = $this->table('oauth_apps', [
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
            ->addColumn('name', 'string', [
                'limit' => 100,
                'null' => true,
            ])
            ->addColumn('client_id', 'string', [
                'limit' => 64,
                'null' => true,
            ])
            ->addColumn('client_secret', 'string', [
                'limit' => 255,
                'null' => true,
            ])
            ->addColumn('redirect_uri', 'text', [
                'null' => true,
            ])
            ->addColumn('options', 'text', [
                'null' => true,
            ])
            ->addColumn('is_active', 'boolean', [
                'default' => true,
                'null' => true,
            ])
            ->addColumn('status', 'string', [
                'limit' => 20,
                'default' => 'active',
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
            ->addColumn('deleted_at', 'timestamp', [
                'null' => true,
            ])
            ->addIndex(['client_id'], [
                'unique' => true,
                'name' => 'client_id',
            ])
            ->create();
    }
}