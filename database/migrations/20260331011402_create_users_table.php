<?php

use App\Models\User;
use Phinx\Migration\AbstractMigration;

final class CreateUsersTable extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('users')) {
            return;
        }

        $table = $this->table('users', [
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
            ->addColumn('email', 'string', [
                'limit' => 255,
                'null' => true,
            ])
            ->addColumn('email_verified', 'boolean', [
                'default' => false,
                'null' => true,
            ])
            ->addColumn('verification_token', 'string', [
                'limit' => 255,
                'null' => true,
            ])
            ->addColumn('reset_token', 'string', [
                'limit' => 255,
                'null' => true,
            ])
            ->addColumn('phone', 'string', [
                'limit' => 20,
                'null' => true,
            ])
            ->addColumn('two_factor_attempts', 'integer', [
                'default' => 0,
                'null' => true,
            ])
            ->addColumn('two_factor_locked_until', 'datetime', [
                'null' => true,
            ])
            ->addColumn('password_hash', 'string', [
                'limit' => 255,
                'null' => true,
            ])
            ->addColumn('name', 'string', [
                'limit' => 100,
                'null' => true,
            ])
            ->addColumn('username', 'string', [
                'limit' => 50,
                'null' => true,
            ])
            ->addColumn('role', 'enum', [
                'values' => User::getRoles(),
                'default' => User::ROLE_USER,
                'null' => true,
            ])
            ->addColumn('options', 'json', [
                'null' => true,
            ])
            ->addColumn('last_login', 'datetime', [
                'precision' => 3,
                'null' => true,
            ])
            ->addColumn('is_active', 'boolean', [
                'default' => true,
                'null' => true,
            ])
            ->addColumn('created_at', 'datetime', [
                'precision' => 3,
                'null' => true,
            ])
            ->addColumn('updated_at', 'datetime', [
                'precision' => 3,
                'null' => true,
            ])
            ->addColumn('deleted_at', 'datetime', [
                'precision' => 3,
                'null' => true,
            ])
            ->addIndex(['email'], [
                'unique' => true,
                'name' => 'email',
            ])
            ->addIndex(['username'], [
                'unique' => true,
                'name' => 'username',
            ])
            ->create();
    }
}