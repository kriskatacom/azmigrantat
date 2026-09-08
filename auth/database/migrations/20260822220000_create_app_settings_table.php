<?php

use Phinx\Migration\AbstractMigration;

final class CreateAppSettingsTable extends AbstractMigration
{
    public function up(): void
    {
        if (!$this->hasTable('app_settings')) {
            $table = $this->table('app_settings', [
                'id' => false,
                'primary_key' => ['id'],
                'engine' => 'InnoDB',
                'encoding' => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
            ]);

            $table
                ->addColumn('id', 'integer', ['signed' => false, 'identity' => true])
                ->addColumn('setting_key', 'string', ['limit' => 100, 'null' => false])
                ->addColumn('setting_value', 'text', ['null' => true])
                ->addColumn('created_at', 'datetime', ['null' => true])
                ->addColumn('updated_at', 'datetime', ['null' => true])
                ->addIndex(['setting_key'], ['unique' => true, 'name' => 'uk_app_settings_key'])
                ->create();
        }

        $now = date('Y-m-d H:i:s');
        $exists = $this->fetchRow(
            "SELECT id FROM app_settings WHERE setting_key = 'phone_verify_test_mode'"
        );

        if (!$exists) {
            $this->table('app_settings')->insert([
                'setting_key' => 'phone_verify_test_mode',
                'setting_value' => '1',
                'created_at' => $now,
                'updated_at' => $now,
            ])->saveData();
        }
    }

    public function down(): void
    {
        if ($this->hasTable('app_settings')) {
            $this->table('app_settings')->drop()->save();
        }
    }
}
