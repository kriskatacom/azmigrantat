<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class CreateRedirectsTable extends AbstractMigration
{
    public function change(): void
    {
        $table = $this->table('redirects');
        $table->addColumn('old_path', 'string', ['limit' => 500])
              ->addColumn('new_path', 'string', ['limit' => 500])
              ->addColumn('status_code', 'integer', ['default' => 301, 'limit' => 5])
              ->addColumn('category', 'string', ['null' => true, 'limit' => 100])
              ->addColumn('description', 'text', ['null' => true])
              
              ->addColumn('hits_count', 'integer', ['default' => 0, 'signed' => false])
              ->addColumn('last_used_at', 'timestamp', ['null' => true])
              
              ->addColumn('is_active', 'boolean', ['default' => true])
              ->addColumn('user_id', 'integer', ['null' => true, 'signed' => false])
              
              ->addTimestamps()
              ->addColumn('deleted_at', 'timestamp', ['null' => true])
              
              ->addIndex(['old_path'], ['name' => 'idx_redirects_old_path'])
              ->addIndex(['is_active'])
              ->create();
    }
}
