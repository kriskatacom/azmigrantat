<?php

use Phinx\Migration\AbstractMigration;

final class AddProfileFieldsToUsersTable extends AbstractMigration
{
    public function change(): void
    {
        $table = $this->table('users');

        if (!$table->hasColumn('first_name')) {
            $table->addColumn('first_name', 'string', [
                'limit' => 100,
                'null' => true,
                'after' => 'name',
            ]);
        }

        if (!$table->hasColumn('last_name')) {
            $table->addColumn('last_name', 'string', [
                'limit' => 100,
                'null' => true,
                'after' => 'first_name',
            ]);
        }

        if (!$table->hasColumn('gender')) {
            $table->addColumn('gender', 'enum', [
                'values' => ['male', 'female'],
                'null' => true,
                'after' => 'last_name',
            ]);
        }

        if (!$table->hasColumn('country')) {
            $table->addColumn('country', 'string', [
                'limit' => 100,
                'null' => true,
                'after' => 'phone',
            ]);
        }

        if (!$table->hasColumn('city')) {
            $table->addColumn('city', 'string', [
                'limit' => 100,
                'null' => true,
                'after' => 'country',
            ]);
        }

        if (!$table->hasColumn('address')) {
            $table->addColumn('address', 'string', [
                'limit' => 255,
                'null' => true,
                'after' => 'city',
            ]);
        }

        $table->update();
    }
}
