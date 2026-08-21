<?php

use Phinx\Migration\AbstractMigration;

final class AddPasswordResetToUsersTable extends AbstractMigration
{
    public function change(): void
    {
        $table = $this->table('users');

        if (!$table->hasColumn('password_reset_hash')) {
            $table->addColumn('password_reset_hash', 'string', [
                'limit' => 64,
                'null' => true,
                'after' => 'reset_token',
            ]);
        }

        if (!$table->hasColumn('password_reset_expires_at')) {
            $table->addColumn('password_reset_expires_at', 'datetime', [
                'null' => true,
                'after' => 'password_reset_hash',
            ]);
        }

        if (!$table->hasColumn('password_reset_sent_at')) {
            $table->addColumn('password_reset_sent_at', 'datetime', [
                'null' => true,
                'after' => 'password_reset_expires_at',
            ]);
        }

        if (!$table->hasColumn('password_reset_attempts')) {
            $table->addColumn('password_reset_attempts', 'integer', [
                'default' => 0,
                'null' => true,
                'after' => 'password_reset_sent_at',
            ]);
        }

        if (!$table->hasColumn('password_reset_locked_until')) {
            $table->addColumn('password_reset_locked_until', 'datetime', [
                'null' => true,
                'after' => 'password_reset_attempts',
            ]);
        }

        $table->update();
    }
}
