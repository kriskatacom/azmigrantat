<?php

use Phinx\Migration\AbstractMigration;

final class CreateSubscriptionCancellationRequests extends AbstractMigration
{
    public function up(): void
    {
        if ($this->hasTable('subscription_cancellation_requests')) {
            return;
        }

        $this->table('subscription_cancellation_requests', [
            'engine' => 'InnoDB',
            'encoding' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
        ])
            ->addColumn('request_id', 'string', ['limit' => 64, 'null' => false])
            ->addColumn('user_id', 'integer', ['signed' => false, 'null' => false])
            ->addColumn('subscription_id', 'integer', ['signed' => false, 'null' => false])
            ->addColumn('stripe_subscription_id', 'string', ['limit' => 64, 'null' => false])
            ->addColumn('status', 'string', ['limit' => 24, 'null' => false, 'default' => 'pending'])
            ->addColumn('error_code', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('created_at', 'datetime', ['null' => true])
            ->addColumn('updated_at', 'datetime', ['null' => true])
            ->addIndex(['request_id'], ['unique' => true, 'name' => 'uk_subscription_cancel_request'])
            ->addIndex(['stripe_subscription_id', 'status'], ['name' => 'idx_subscription_cancel_pending'])
            ->addIndex(['user_id', 'created_at'], ['name' => 'idx_subscription_cancel_user'])
            ->addForeignKey('user_id', 'users', 'id', ['delete' => 'CASCADE', 'update' => 'CASCADE'])
            ->addForeignKey('subscription_id', 'subscriptions', 'id', ['delete' => 'CASCADE', 'update' => 'CASCADE'])
            ->create();
    }

    public function down(): void
    {
        if ($this->hasTable('subscription_cancellation_requests')) {
            $this->table('subscription_cancellation_requests')->drop()->save();
        }
    }
}
