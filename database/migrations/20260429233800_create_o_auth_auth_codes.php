<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class CreateOAuthAuthCodes extends AbstractMigration
{
    public function change(): void
    {
        $table = $this->table('oauth_auth_codes');
        $table->addColumn('user_id', 'integer', ['signed' => false])
            ->addColumn('app_id', 'integer', ['signed' => false])
            ->addColumn('code', 'string', ['limit' => 100])
            ->addColumn('redirect_uri', 'text')
            ->addColumn('expires_at', 'timestamp')
            ->addColumn('created_at', 'timestamp', ['default' => 'CURRENT_TIMESTAMP'])
            ->addColumn('updated_at', 'timestamp', ['null' => true, 'update' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['code'], ['unique' => true])
            ->addIndex(['user_id'])
            ->addIndex(['app_id'])
            ->create();
    }
}