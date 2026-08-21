<?php

use Phinx\Migration\AbstractMigration;

final class AddRefreshTokenToOauthAccessTokens extends AbstractMigration
{
    public function change(): void
    {
        if (!$this->hasTable('oauth_access_tokens')) {
            return;
        }

        $table = $this->table('oauth_access_tokens');

        if (!$table->hasColumn('refresh_token')) {
            $table->addColumn('refresh_token', 'string', [
                'limit' => 64,
                'null' => true,
                'after' => 'token',
            ]);
        }

        if (!$table->hasColumn('refresh_expires_at')) {
            $table->addColumn('refresh_expires_at', 'datetime', [
                'null' => true,
                'after' => 'expires_at',
            ]);
        }

        if (!$table->hasIndex(['refresh_token'])) {
            $table->addIndex(['refresh_token'], [
                'unique' => true,
                'name' => 'uniq_oauth_refresh_token',
            ]);
        }

        $table->update();
    }
}
