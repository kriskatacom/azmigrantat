<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class CreateMediaTable extends AbstractMigration
{
    public function change(): void
    {
        $table = $this->table('media', ['id' => 'id', 'signed' => false]);

        $table->addColumn('file_name', 'string', ['limit' => 255, 'null' => false])
            ->addColumn('file_path', 'string', ['limit' => 255, 'null' => false])
            ->addColumn('file_type', 'string', ['limit' => 100, 'null' => false])
            ->addColumn('file_size', 'integer', ['signed' => false, 'null' => false])
            ->addColumn('alt_text', 'string', ['limit' => 255, 'null' => true, 'default' => null])
            ->addColumn('created_at', 'timestamp', ['default' => 'CURRENT_TIMESTAMP', 'null' => false])
            ->addColumn('updated_at', 'timestamp', ['default' => 'CURRENT_TIMESTAMP', 'update' => 'CURRENT_TIMESTAMP', 'null' => false])
            ->addColumn('deleted_at', 'timestamp', ['null' => true,  'default' => null])
            ->create();
    }
}
