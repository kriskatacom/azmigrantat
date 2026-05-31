<?php

use Phinx\Migration\AbstractMigration;

class CreateOauthUserConsents extends AbstractMigration
{
    public function change()
    {
        $table = $this->table('oauth_user_consents');
        $table->addColumn('user_id', 'integer', ['signed' => false])
            ->addColumn('app_id', 'integer', ['signed' => false])
            ->addColumn('created_at', 'timestamp', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'timestamp', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP'])

            ->addIndex(['user_id', 'app_id'], ['unique' => true])

            ->addForeignKey('user_id', 'users', 'id', ['delete' => 'CASCADE', 'update' => 'CASCADE'])
            ->addForeignKey('app_id', 'oauth_apps', 'id', ['delete' => 'CASCADE', 'update' => 'CASCADE'])
            ->create();
    }
}
