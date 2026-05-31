<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class CreateSessionsTable extends AbstractMigration
{
    public function change(): void
    {
        $table = $this->table('sessions', ['id' => false, 'primary_key' => ['id']]);

        $table->addColumn('id', 'string', ['limit' => 255, 'null' => false])
            ->addColumn('user_id', 'integer', ['null' => true])
            ->addColumn('ip_address', 'string', ['limit' => 45, 'null' => true])
            ->addColumn('user_agent', 'text', ['null' => true])
            ->addColumn('payload', 'text')
            ->addColumn('last_activity', 'integer')
            ->addIndex(['user_id'])
            ->addIndex(['last_activity'])
            ->create();
    }
}
