<?php

use Phinx\Migration\AbstractMigration;

final class CreateEnvVariablesTable extends AbstractMigration
{
    public function up(): void
    {
        if (!$this->hasTable('env_variables')) {
            $table = $this->table('env_variables', [
                'id' => false,
                'primary_key' => ['id'],
                'engine' => 'InnoDB',
                'encoding' => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
            ]);

            $table
                ->addColumn('id', 'integer', ['signed' => false, 'identity' => true])
                ->addColumn('var_key', 'string', ['limit' => 100, 'null' => false])
                ->addColumn('label', 'string', ['limit' => 191, 'null' => false, 'default' => ''])
                ->addColumn('group_name', 'string', ['limit' => 100, 'null' => false, 'default' => 'Други'])
                ->addColumn('sort_order', 'integer', ['signed' => false, 'null' => false, 'default' => 0])
                ->addColumn('is_secret', 'boolean', ['null' => false, 'default' => false])
                ->addColumn('dev_value', 'text', ['null' => true])
                ->addColumn('prod_value', 'text', ['null' => true])
                ->addColumn('created_at', 'datetime', ['null' => true])
                ->addColumn('updated_at', 'datetime', ['null' => true])
                ->addIndex(['var_key'], ['unique' => true, 'name' => 'uk_env_variables_key'])
                ->addIndex(['group_name', 'sort_order'], ['name' => 'idx_env_variables_group_sort'])
                ->create();
        }

        if ($this->hasTable('app_settings')) {
            $now = date('Y-m-d H:i:s');
            $exists = $this->fetchRow(
                "SELECT id FROM app_settings WHERE setting_key = 'env_source'"
            );

            if (!$exists) {
                $this->table('app_settings')->insert([
                    'setting_key' => 'env_source',
                    'setting_value' => 'development',
                    'created_at' => $now,
                    'updated_at' => $now,
                ])->saveData();
            }
        }
    }

    public function down(): void
    {
        if ($this->hasTable('env_variables')) {
            $this->table('env_variables')->drop()->save();
        }

        if ($this->hasTable('app_settings')) {
            $this->execute("DELETE FROM app_settings WHERE setting_key = 'env_source'");
        }
    }
}
