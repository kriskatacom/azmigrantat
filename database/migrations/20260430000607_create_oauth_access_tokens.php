<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

class CreateOauthAccessTokens extends AbstractMigration
{
    public function change(): void
    {
        $table = $this->table('oauth_access_tokens');
        $table->addColumn('token', 'string', ['limit' => 100])
            ->addColumn('user_id', 'integer', ['signed' => false])
            ->addColumn('app_id', 'integer', ['signed' => false])
            ->addColumn('expires_at', 'timestamp')
            ->addColumn('created_at', 'timestamp', ['default' => 'CURRENT_TIMESTAMP'])
            ->addIndex(['token'], ['unique' => true])
            ->addIndex(['user_id'])
            ->create();
    }
}
