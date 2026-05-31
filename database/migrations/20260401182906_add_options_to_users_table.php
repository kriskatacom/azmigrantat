<?php

use Phinx\Migration\AbstractMigration;

class AddOptionsToUsersTable extends AbstractMigration
{
    public function change(): void
    {
        $table = $this->table('users');

        $table->addColumn('options', 'json', [
            'null' => true,
            'after' => 'role',
        ]);

        if ($table->hasColumn('bio')) {
            $table->removeColumn('bio');
        }
        if ($table->hasColumn('gender')) {
            $table->removeColumn('gender');
        }
        if ($table->hasColumn('profile_image')) {
            $table->removeColumn('profile_image');
        }

        $table->update();
    }
}
