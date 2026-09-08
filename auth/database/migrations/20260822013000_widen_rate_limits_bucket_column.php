<?php

use Phinx\Migration\AbstractMigration;

final class WidenRateLimitsBucketColumn extends AbstractMigration
{
    public function change(): void
    {
        if (!$this->hasTable('rate_limits')) {
            return;
        }

        $table = $this->table('rate_limits');

        if (!$table->hasColumn('bucket')) {
            return;
        }

        $table
            ->changeColumn('bucket', 'string', [
                'limit' => 191,
                'null' => false,
            ])
            ->update();
    }
}
