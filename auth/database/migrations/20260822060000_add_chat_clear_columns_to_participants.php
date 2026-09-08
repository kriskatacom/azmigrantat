<?php

use Phinx\Migration\AbstractMigration;

final class AddChatClearColumnsToParticipants extends AbstractMigration
{
    public function change(): void
    {
        if (!$this->hasTable('participants')) {
            return;
        }

        $table = $this->table('participants');

        if (!$table->hasColumn('cleared_before_id')) {
            $table->addColumn('cleared_before_id', 'biginteger', [
                'signed' => false,
                'null' => true,
                'after' => 'left_at',
            ]);
        }

        if (!$table->hasColumn('cleared_own_before_id')) {
            $table->addColumn('cleared_own_before_id', 'biginteger', [
                'signed' => false,
                'null' => true,
                'after' => 'cleared_before_id',
            ]);
        }

        $table->update();
    }
}
