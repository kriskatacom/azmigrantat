<?php

use Phinx\Migration\AbstractMigration;

final class CreateRateLimitsTable extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('rate_limits')) {
            return;
        }

        $table = $this->table('rate_limits', [
            'id' => false,
            'primary_key' => ['id'],
            'engine' => 'InnoDB',
            'encoding' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
        ]);

        $table
            ->addColumn('id', 'biginteger', [
                'signed' => false,
                'identity' => true,
            ])
            ->addColumn('bucket', 'string', [
                'limit' => 80,
                'null' => false,
            ])
            ->addColumn('attempts', 'integer', [
                'signed' => false,
                'null' => false,
                'default' => 0,
            ])
            ->addColumn('window_starts_at', 'datetime', [
                'null' => false,
            ])
            ->addColumn('updated_at', 'datetime', [
                'null' => true,
            ])
            ->addIndex(['bucket'], [
                'unique' => true,
                'name' => 'uniq_rate_limits_bucket',
            ])
            ->addIndex(['window_starts_at'], [
                'name' => 'idx_rate_limits_window',
            ])
            ->create();
    }
}
