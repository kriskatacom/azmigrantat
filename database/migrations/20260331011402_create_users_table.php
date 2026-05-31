<?php

use App\Models\User;
use Phinx\Migration\AbstractMigration;

class CreateUsersTable extends AbstractMigration
{
    public function change(): void
    {
        $table = $this->table('users');
        $table->addColumn('email', 'string', ['limit' => 255])
            ->addColumn('password_hash', 'string', ['limit' => 255])
            ->addColumn('name', 'string', ['limit' => 100])
            ->addColumn('username', 'string', ['limit' => 50, 'null' => true])
            ->addColumn('role', 'enum', ['values' => User::getRoles(), 'default' => User::ROLE_USER])
            ->addColumn('gender', 'enum', ['values' => User::getGenders(), 'null' => true])
            ->addColumn('bio', 'text', ['null' => true])
            ->addColumn('last_login', 'datetime', ['null' => true, 'precision' => 3])
            ->addColumn('is_active', 'boolean', ['default' => true])
            ->addColumn('created_at', 'datetime', ['null' => true, 'precision' => 3])
            ->addColumn('updated_at', 'datetime', ['null' => true, 'precision' => 3])
            ->addColumn('deleted_at', 'datetime', ['null' => true, 'precision' => 3])
            ->addIndex(['email'], ['unique' => true])
            ->addIndex(['username'], ['unique' => true])
            ->create();
    }
}