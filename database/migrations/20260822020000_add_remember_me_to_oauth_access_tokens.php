<?php

use Phinx\Migration\AbstractMigration;

final class AddRememberMeToOauthAccessTokens extends AbstractMigration
{
    public function change(): void
    {
        if (!$this->hasTable('oauth_access_tokens')) {
            return;
        }

        $table = $this->table('oauth_access_tokens');

        if ($table->hasColumn('remember_me')) {
            return;
        }

        $table
            ->addColumn('remember_me', 'boolean', [
                'default' => true,
                'null' => false,
                'after' => 'refresh_expires_at',
            ])
            ->update();
    }
}
