<?php

use Phinx\Migration\AbstractMigration;

class AddTwoFactorToUsersTable extends AbstractMigration
{
    public function change(): void
    {
        $table = $this->table('users');
        $table->addColumn('phone', 'string', ['limit' => 20, 'null' => true, 'after' => 'email_verified'])
            ->addColumn('two_factor_attempts', 'integer', ['default' => 0, 'after' => 'phone'])
            ->addColumn('two_factor_locked_until', 'datetime', ['null' => true, 'after' => 'two_factor_attempts'])
            ->update();
    }
}
