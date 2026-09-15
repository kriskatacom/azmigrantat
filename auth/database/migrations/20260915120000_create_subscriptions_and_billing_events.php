<?php

use Phinx\Migration\AbstractMigration;

final class CreateSubscriptionsAndBillingEvents extends AbstractMigration
{
    public function change(): void
    {
        if (!$this->hasTable('subscriptions')) {
            $this->table('subscriptions', [
                'engine' => 'InnoDB',
                'encoding' => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
            ])
                ->addColumn('user_id', 'integer', ['signed' => false, 'null' => false])
                ->addColumn('plan', 'string', ['limit' => 32, 'null' => false])
                ->addColumn('stripe_customer_id', 'string', ['limit' => 64, 'null' => true])
                ->addColumn('stripe_subscription_id', 'string', ['limit' => 64, 'null' => true])
                ->addColumn('stripe_price_id', 'string', ['limit' => 64, 'null' => true])
                ->addColumn('status', 'string', ['limit' => 32, 'null' => false, 'default' => 'incomplete'])
                ->addColumn('cancel_at_period_end', 'boolean', ['null' => false, 'default' => false])
                ->addColumn('current_period_start', 'datetime', ['null' => true])
                ->addColumn('current_period_end', 'datetime', ['null' => true])
                ->addColumn('created_at', 'datetime', ['null' => true])
                ->addColumn('updated_at', 'datetime', ['null' => true])
                ->addIndex(['user_id'], ['name' => 'idx_subscriptions_user'])
                ->addIndex(['stripe_subscription_id'], ['unique' => true, 'name' => 'uk_subscriptions_stripe_id'])
                ->addForeignKey('user_id', 'users', 'id', ['delete' => 'CASCADE', 'update' => 'CASCADE'])
                ->create();
        }

        if (!$this->hasTable('billing_events')) {
            $this->table('billing_events', [
                'engine' => 'InnoDB',
                'encoding' => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
            ])
                ->addColumn('stripe_event_id', 'string', ['limit' => 64, 'null' => false])
                ->addColumn('event_type', 'string', ['limit' => 80, 'null' => false])
                ->addColumn('processed_at', 'datetime', ['null' => false])
                ->addIndex(['stripe_event_id'], ['unique' => true, 'name' => 'uk_billing_events_stripe_id'])
                ->create();
        }
    }
}
