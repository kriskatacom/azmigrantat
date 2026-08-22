<?php

use Phinx\Migration\AbstractMigration;

final class ReplaceFamilyProximityWithTotp extends AbstractMigration
{
    public function up(): void
    {
        if ($this->hasTable('family_security_keys')) {
            $this->table('family_security_keys')->drop()->save();
        }

        if ($this->hasTable('family_auth_pending')) {
            $this->table('family_auth_pending')->drop()->save();
        }

        if ($this->hasTable('totp_auth_pending')) {
            return;
        }

        $pending = $this->table('totp_auth_pending', [
            'id' => false,
            'primary_key' => ['id'],
            'engine' => 'InnoDB',
            'encoding' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
        ]);

        $pending
            ->addColumn('id', 'integer', ['signed' => false, 'identity' => true])
            ->addColumn('user_id', 'integer', ['signed' => false, 'null' => false])
            ->addColumn('oauth_app_id', 'integer', ['signed' => false, 'null' => false])
            ->addColumn('remember_me', 'boolean', ['default' => true, 'null' => false])
            ->addColumn('token_hash', 'string', ['limit' => 64, 'null' => false])
            ->addColumn('expires_at', 'datetime', ['null' => false])
            ->addColumn('created_at', 'datetime', ['null' => true])
            ->addColumn('updated_at', 'datetime', ['null' => true])
            ->addIndex(['token_hash'], ['unique' => true, 'name' => 'uk_totp_auth_pending_token'])
            ->addIndex(['user_id'], ['name' => 'idx_totp_auth_pending_user'])
            ->addForeignKey('user_id', 'users', 'id', [
                'delete' => 'CASCADE',
                'update' => 'CASCADE',
                'constraint' => 'fk_totp_auth_pending_user',
            ])
            ->create();
    }

    public function down(): void
    {
        if ($this->hasTable('totp_auth_pending')) {
            $this->table('totp_auth_pending')->drop()->save();
        }
    }
}
