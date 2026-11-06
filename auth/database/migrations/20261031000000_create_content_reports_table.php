<?php

use Phinx\Migration\AbstractMigration;

final class CreateContentReportsTable extends AbstractMigration
{
    public function up(): void
    {
        if ($this->hasTable('content_reports')) {
            throw new RuntimeException(
                'content_reports already exists without this migration being recorded; inspect schema drift before continuing.'
            );
        }

        $this->table('content_reports', [
            'engine' => 'InnoDB',
            'encoding' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
        ])
            ->addColumn('reporter_id', 'integer', ['signed' => false])
            ->addColumn('reported_user_id', 'integer', ['signed' => false, 'null' => true])
            ->addColumn('target_type', 'string', ['limit' => 24])
            // User IDs are INT UNSIGNED, while video IDs are BIGINT UNSIGNED.
            // The polymorphic target must accommodate both without truncation.
            ->addColumn('target_id', 'biginteger', ['signed' => false])
            ->addColumn('reason', 'string', ['limit' => 32])
            ->addColumn('details', 'text', ['null' => true])
            ->addColumn('status', 'string', ['limit' => 24, 'default' => 'pending'])
            ->addColumn('active_key', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('moderator_notes', 'text', ['null' => true])
            ->addColumn('reviewed_by', 'integer', ['signed' => false, 'null' => true])
            ->addColumn('reviewed_at', 'datetime', ['null' => true])
            ->addTimestamps()
            ->addIndex(['status', 'created_at'], ['name' => 'idx_content_reports_queue'])
            ->addIndex(['target_type', 'target_id'], ['name' => 'idx_content_reports_target'])
            ->addIndex(['reporter_id'], ['name' => 'idx_content_reports_reporter'])
            ->addIndex(['active_key'], ['unique' => true, 'name' => 'uk_content_reports_active'])
            ->addForeignKey('reporter_id', 'users', 'id', ['delete' => 'CASCADE', 'update' => 'CASCADE'])
            ->addForeignKey('reported_user_id', 'users', 'id', ['delete' => 'SET_NULL', 'update' => 'CASCADE'])
            ->addForeignKey('reviewed_by', 'users', 'id', ['delete' => 'SET_NULL', 'update' => 'CASCADE'])
            ->create();
    }

    public function down(): void
    {
        throw new RuntimeException(
            'Destructive rollback is disabled. Removing content_reports requires a separately reviewed migration.'
        );
    }
}
