<?php

use Phinx\Migration\AbstractMigration;

final class AddEmailLoginPending extends AbstractMigration
{
    public function up(): void
    {
        if ($this->hasTable('email_auth_pending')) {
            return;
        }

        $pending = $this->table('email_auth_pending', [
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
            ->addColumn('code_hash', 'string', ['limit' => 64, 'null' => false])
            ->addColumn('expires_at', 'datetime', ['null' => false])
            ->addColumn('created_at', 'datetime', ['null' => true])
            ->addColumn('updated_at', 'datetime', ['null' => true])
            ->addIndex(['token_hash'], ['unique' => true, 'name' => 'uk_email_auth_pending_token'])
            ->addIndex(['user_id'], ['name' => 'idx_email_auth_pending_user'])
            ->addForeignKey('user_id', 'users', 'id', [
                'delete' => 'CASCADE',
                'update' => 'CASCADE',
                'constraint' => 'fk_email_auth_pending_user',
            ])
            ->create();
    }

    public function down(): void
    {
        if ($this->hasTable('email_auth_pending')) {
            $this->table('email_auth_pending')->drop()->save();
        }
    }
}
