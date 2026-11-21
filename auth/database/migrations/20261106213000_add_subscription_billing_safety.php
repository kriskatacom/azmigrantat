<?php

use Phinx\Migration\AbstractMigration;

final class AddSubscriptionBillingSafety extends AbstractMigration
{
    public function up(): void
    {
        if ($this->hasTable('paid_plans') && !$this->table('paid_plans')->hasColumn('interval_count')) {
            $this->table('paid_plans')
                ->addColumn('interval_count', 'integer', [
                    'signed' => false,
                    'null' => false,
                    'default' => 30,
                    'after' => 'interval_unit',
                ])
                ->update();
        }

        if ($this->hasTable('subscriptions')) {
            $table = $this->table('subscriptions');
            if (!$table->hasColumn('last_stripe_event_created_at')) {
                $table->addColumn('last_stripe_event_created_at', 'biginteger', [
                    'signed' => false,
                    'null' => true,
                    'after' => 'current_period_end',
                ]);
            }
            if (!$table->hasColumn('last_stripe_event_id')) {
                $table->addColumn('last_stripe_event_id', 'string', [
                    'limit' => 64,
                    'null' => true,
                    'after' => 'last_stripe_event_created_at',
                ]);
            }
            $table->update();
        }

        if (!$this->hasTable('subscription_renewal_changes')) {
            $this->table('subscription_renewal_changes', [
                'engine' => 'InnoDB',
                'encoding' => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
            ])
                ->addColumn('request_id', 'string', ['limit' => 64, 'null' => false])
                ->addColumn('user_id', 'integer', ['signed' => false, 'null' => false])
                ->addColumn('subscription_id', 'integer', ['signed' => false, 'null' => false])
                ->addColumn('stripe_subscription_id', 'string', ['limit' => 64, 'null' => false])
                ->addColumn('previous_auto_renewal', 'boolean', ['null' => false])
                ->addColumn('requested_auto_renewal', 'boolean', ['null' => false])
                ->addColumn('status', 'string', ['limit' => 24, 'null' => false, 'default' => 'pending'])
                ->addColumn('error_code', 'string', ['limit' => 64, 'null' => true])
                ->addColumn('created_at', 'datetime', ['null' => true])
                ->addColumn('updated_at', 'datetime', ['null' => true])
                ->addIndex(['request_id'], ['unique' => true, 'name' => 'uk_subscription_renewal_request'])
                ->addIndex(['stripe_subscription_id', 'status'], ['name' => 'idx_subscription_renewal_pending'])
                ->addIndex(['user_id', 'created_at'], ['name' => 'idx_subscription_renewal_user'])
                ->addForeignKey('user_id', 'users', 'id', ['delete' => 'CASCADE', 'update' => 'CASCADE'])
                ->addForeignKey('subscription_id', 'subscriptions', 'id', ['delete' => 'CASCADE', 'update' => 'CASCADE'])
                ->create();
        }
    }

    public function down(): void
    {
        if ($this->hasTable('subscription_renewal_changes')) {
            $this->table('subscription_renewal_changes')->drop()->save();
        }
        if ($this->hasTable('subscriptions')) {
            $table = $this->table('subscriptions');
            if ($table->hasColumn('last_stripe_event_id')) $table->removeColumn('last_stripe_event_id');
            if ($table->hasColumn('last_stripe_event_created_at')) $table->removeColumn('last_stripe_event_created_at');
            $table->update();
        }
        if ($this->hasTable('paid_plans') && $this->table('paid_plans')->hasColumn('interval_count')) {
            $this->table('paid_plans')->removeColumn('interval_count')->update();
        }
    }
}
