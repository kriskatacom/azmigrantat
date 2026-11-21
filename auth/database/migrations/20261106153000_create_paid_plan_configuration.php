<?php

use Phinx\Migration\AbstractMigration;

final class CreatePaidPlanConfiguration extends AbstractMigration
{
    public function up(): void
    {
        if (!$this->hasTable('paid_plans')) {
            $this->table('paid_plans', [
                'id' => false,
                'primary_key' => ['id'],
                'engine' => 'InnoDB',
                'encoding' => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
            ])
                ->addColumn('id', 'integer', ['signed' => false, 'identity' => true])
                ->addColumn('plan_key', 'string', ['limit' => 50, 'null' => false])
                ->addColumn('name', 'string', ['limit' => 120, 'null' => false])
                ->addColumn('amount_cents', 'integer', ['signed' => false, 'null' => false])
                ->addColumn('currency', 'string', ['limit' => 3, 'null' => false, 'default' => 'eur'])
                ->addColumn('interval_unit', 'string', ['limit' => 20, 'null' => false, 'default' => 'day'])
                ->addColumn('interval_count', 'integer', ['signed' => false, 'null' => false, 'default' => 30])
                ->addColumn('stripe_account_id', 'string', ['limit' => 64, 'null' => true])
                ->addColumn('stripe_product_id', 'string', ['limit' => 64, 'null' => true])
                ->addColumn('stripe_price_id', 'string', ['limit' => 64, 'null' => true])
                ->addColumn('stripe_mode', 'string', ['limit' => 16, 'null' => false, 'default' => 'test'])
                ->addColumn('version', 'integer', ['signed' => false, 'null' => false, 'default' => 1])
                ->addColumn('is_active', 'boolean', ['null' => false, 'default' => true])
                ->addColumn('created_at', 'datetime', ['null' => true])
                ->addColumn('updated_at', 'datetime', ['null' => true])
                ->addIndex(['plan_key'], ['unique' => true, 'name' => 'uk_paid_plans_key'])
                ->addIndex(['stripe_account_id', 'stripe_price_id'], ['name' => 'idx_paid_plans_stripe_price'])
                ->create();
        }

        if (!$this->hasTable('paid_plan_price_changes')) {
            $this->table('paid_plan_price_changes', [
                'id' => false,
                'primary_key' => ['id'],
                'engine' => 'InnoDB',
                'encoding' => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
            ])
                ->addColumn('id', 'integer', ['signed' => false, 'identity' => true])
                ->addColumn('paid_plan_id', 'integer', ['signed' => false, 'null' => true])
                ->addColumn('actor_user_id', 'integer', ['signed' => false, 'null' => false])
                ->addColumn('request_id', 'string', ['limit' => 64, 'null' => false])
                ->addColumn('old_amount_cents', 'integer', ['signed' => false, 'null' => true])
                ->addColumn('new_amount_cents', 'integer', ['signed' => false, 'null' => false])
                ->addColumn('old_stripe_account_id', 'string', ['limit' => 64, 'null' => true])
                ->addColumn('new_stripe_account_id', 'string', ['limit' => 64, 'null' => true])
                ->addColumn('old_stripe_product_id', 'string', ['limit' => 64, 'null' => true])
                ->addColumn('new_stripe_product_id', 'string', ['limit' => 64, 'null' => true])
                ->addColumn('old_stripe_price_id', 'string', ['limit' => 64, 'null' => true])
                ->addColumn('new_stripe_price_id', 'string', ['limit' => 64, 'null' => true])
                ->addColumn('stripe_mode', 'string', ['limit' => 16, 'null' => false, 'default' => 'test'])
                ->addColumn('status', 'string', ['limit' => 20, 'null' => false, 'default' => 'pending'])
                ->addColumn('error_code', 'string', ['limit' => 80, 'null' => true])
                ->addColumn('created_at', 'datetime', ['null' => true])
                ->addColumn('updated_at', 'datetime', ['null' => true])
                ->addIndex(['request_id'], ['unique' => true, 'name' => 'uk_paid_plan_changes_request'])
                ->addIndex(['paid_plan_id', 'created_at'], ['name' => 'idx_paid_plan_changes_plan'])
                ->addIndex(['actor_user_id', 'created_at'], ['name' => 'idx_paid_plan_changes_actor'])
                ->create();
        }
    }

    public function down(): void
    {
        if ($this->hasTable('paid_plan_price_changes')) {
            $this->table('paid_plan_price_changes')->drop()->save();
        }
        if ($this->hasTable('paid_plans')) {
            $this->table('paid_plans')->drop()->save();
        }
    }
}
