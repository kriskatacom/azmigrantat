<?php

use Phinx\Migration\AbstractMigration;

class CreateOauthAppsTable extends AbstractMigration
{
    public function change()
    {
        $table = $this->table('oauth_apps');
        $table->addColumn('name', 'string', ['limit' => 100])
            ->addColumn('client_id', 'string', ['limit' => 64])
            ->addColumn('client_secret', 'string', ['limit' => 255])
            ->addColumn('redirect_uri', 'text')
            ->addColumn('options', 'text', ['null' => true])
            ->addColumn('is_active', 'boolean', ['default' => 1])
            ->addColumn('status', 'string', ['limit' => 20, 'default' => 'active'])
            ->addColumn('created_at', 'timestamp', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'timestamp', ['null' => true, 'update' => 'CURRENT_TIMESTAMP'])
            ->addColumn('deleted_at', 'timestamp', ['null' => true])
            ->addIndex(['client_id'], ['unique' => true])
            ->create();
    }
}
