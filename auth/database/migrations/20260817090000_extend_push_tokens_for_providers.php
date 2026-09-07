<?php

use Phinx\Migration\AbstractMigration;

final class ExtendPushTokensForProviders extends AbstractMigration
{
    public function up(): void
    {
        $table = $this->table('push_tokens');
        if (!$table->hasColumn('provider')) {
            $table->addColumn('provider', 'enum', [
                'values' => ['expo', 'fcm'], 'default' => 'expo', 'null' => false,
                'after' => 'platform',
            ])->addColumn('is_active', 'boolean', [
                'default' => true, 'null' => false, 'after' => 'device_id',
            ])->addColumn('deactivated_reason', 'string', [
                'limit' => 255, 'null' => true, 'after' => 'is_active',
            ])->addColumn('last_seen_at', 'datetime', [
                'precision' => 3, 'null' => true, 'after' => 'deactivated_reason',
            ])->update();
        }

        $this->execute("UPDATE push_tokens SET provider = 'expo', is_active = 1, last_seen_at = COALESCE(last_used_at, updated_at, created_at)");
        $this->execute('ALTER TABLE push_tokens DROP INDEX uk_push_tokens_token');
        $table = $this->table('push_tokens');
        $table->addIndex(['token', 'provider'], ['unique' => true, 'name' => 'uk_push_tokens_token_provider'])
            ->addIndex(['user_id', 'provider', 'is_active'], ['name' => 'idx_push_tokens_lookup'])
            ->addIndex(['provider'], ['name' => 'idx_push_tokens_provider'])
            ->addIndex(['is_active'], ['name' => 'idx_push_tokens_active'])
            ->update();
    }

    public function down(): void
    {
        $table = $this->table('push_tokens');
        $table->removeIndexByName('idx_push_tokens_lookup')
            ->removeIndexByName('idx_push_tokens_provider')
            ->removeIndexByName('idx_push_tokens_active')
            ->removeIndexByName('uk_push_tokens_token_provider')
            ->removeColumn('last_seen_at')
            ->removeColumn('deactivated_reason')
            ->removeColumn('is_active')
            ->removeColumn('provider')
            ->addIndex(['token'], ['unique' => true, 'name' => 'uk_push_tokens_token'])
            ->update();
    }
}
