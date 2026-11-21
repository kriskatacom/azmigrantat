<?php

use Phinx\Migration\AbstractMigration;

final class CreateSubscriptionCheckoutHandoffs extends AbstractMigration
{
    public function up(): void
    {
        if ($this->hasTable('subscription_checkout_handoffs')) {
            return;
        }

        $this->table('subscription_checkout_handoffs', [
            'id' => false,
            'primary_key' => ['id'],
            'engine' => 'InnoDB',
            'encoding' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
        ])
            ->addColumn('id', 'integer', ['signed' => false, 'identity' => true])
            ->addColumn('public_id', 'string', ['limit' => 64, 'null' => false])
            ->addColumn('token_hash', 'string', ['limit' => 64, 'null' => false])
            ->addColumn('user_id', 'integer', ['signed' => false, 'null' => false])
            ->addColumn('plan_key', 'string', ['limit' => 50, 'null' => false])
            ->addColumn('status', 'string', ['limit' => 30, 'null' => false, 'default' => 'created'])
            ->addColumn('stripe_account_id', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('stripe_price_id', 'string', ['limit' => 64, 'null' => true])
            ->addColumn('stripe_session_id', 'string', ['limit' => 128, 'null' => true])
            ->addColumn('stripe_subscription_id', 'string', ['limit' => 128, 'null' => true])
            ->addColumn('play_external_transaction_token', 'text', ['null' => true])
            ->addColumn('expires_at', 'datetime', ['null' => false])
            ->addColumn('completed_at', 'datetime', ['null' => true])
            ->addColumn('created_at', 'datetime', ['null' => true])
            ->addColumn('updated_at', 'datetime', ['null' => true])
            ->addIndex(['public_id'], ['unique' => true, 'name' => 'uk_checkout_handoffs_public'])
            ->addIndex(['token_hash'], ['unique' => true, 'name' => 'uk_checkout_handoffs_token'])
            ->addIndex(['stripe_session_id'], ['unique' => true, 'name' => 'uk_checkout_handoffs_session'])
            ->addIndex(['user_id', 'created_at'], ['name' => 'idx_checkout_handoffs_user'])
            ->addIndex(['status', 'expires_at'], ['name' => 'idx_checkout_handoffs_status'])
            ->create();
    }

    public function down(): void
    {
        if ($this->hasTable('subscription_checkout_handoffs')) {
            $this->table('subscription_checkout_handoffs')->drop()->save();
        }
    }
}

