<?php

use Phinx\Migration\AbstractMigration;

final class CreateFamilySecurityKeysTable extends AbstractMigration
{
    public function change(): void
    {
        if (!$this->hasTable('family_security_keys')) {
            $keys = $this->table('family_security_keys', [
                'id' => false,
                'primary_key' => ['id'],
                'engine' => 'InnoDB',
                'encoding' => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
            ]);

            $keys
                ->addColumn('id', 'integer', ['signed' => false, 'identity' => true])
                ->addColumn('user_id', 'integer', ['signed' => false, 'null' => false])
                ->addColumn('label', 'string', ['limit' => 80, 'null' => false])
                ->addColumn('secret_ciphertext', 'text', ['null' => false])
                ->addColumn('created_at', 'datetime', ['null' => true])
                ->addColumn('updated_at', 'datetime', ['null' => true])
                ->addColumn('last_used_at', 'datetime', ['null' => true])
                ->addIndex(['user_id'], ['name' => 'idx_family_security_keys_user'])
                ->addForeignKey('user_id', 'users', 'id', [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_family_security_keys_user',
                ])
                ->create();
        }

        if ($this->hasTable('family_auth_pending')) {
            return;
        }

        $pending = $this->table('family_auth_pending', [
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
            ->addIndex(['token_hash'], ['unique' => true, 'name' => 'uk_family_auth_pending_token'])
            ->addIndex(['user_id'], ['name' => 'idx_family_auth_pending_user'])
            ->addForeignKey('user_id', 'users', 'id', [
                'delete' => 'CASCADE',
                'update' => 'CASCADE',
                'constraint' => 'fk_family_auth_pending_user',
            ])
            ->create();
    }
}
