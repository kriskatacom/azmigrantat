<?php

use Phinx\Migration\AbstractMigration;

final class CreateNotificationsTable extends AbstractMigration
{
    public function change(): void
    {
        if (!$this->hasTable('notifications')) {
            $table = $this->table('notifications', [
                'id' => false,
                'primary_key' => ['id'],
                'engine' => 'InnoDB',
                'encoding' => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
            ]);

            $table
                ->addColumn('id', 'biginteger', [
                    'signed' => false,
                    'identity' => true,
                ])
                ->addColumn('user_id', 'integer', [
                    'signed' => false,
                    'null' => false,
                ])
                ->addColumn('type', 'string', [
                    'limit' => 64,
                    'null' => false,
                ])
                ->addColumn('title', 'string', [
                    'limit' => 255,
                    'null' => true,
                ])
                ->addColumn('message', 'text', [
                    'null' => true,
                ])
                ->addColumn('count', 'integer', [
                    'signed' => false,
                    'null' => false,
                    'default' => 1,
                ])
                ->addColumn('is_read', 'boolean', [
                    'null' => false,
                    'default' => false,
                ])
                ->addColumn('actor_id', 'integer', [
                    'signed' => false,
                    'null' => true,
                ])
                ->addColumn('entity_id', 'string', [
                    'limit' => 128,
                    'null' => true,
                ])
                ->addColumn('data', 'json', [
                    'null' => true,
                ])
                ->addColumn('created_at', 'datetime', [
                    'precision' => 3,
                    'null' => true,
                ])
                ->addColumn('updated_at', 'datetime', [
                    'precision' => 3,
                    'null' => true,
                ])
                ->addIndex(['user_id'], ['name' => 'idx_notifications_user_id'])
                ->addIndex(['user_id', 'type'], ['name' => 'idx_notifications_user_type'])
                ->addIndex(['user_id', 'is_read'], ['name' => 'idx_notifications_user_read'])
                ->addIndex(['user_id', 'created_at'], ['name' => 'idx_notifications_user_created'])
                ->addIndex(
                    ['user_id', 'type', 'actor_id', 'is_read'],
                    ['name' => 'idx_notifications_grouping']
                )
                ->addForeignKey('user_id', 'users', 'id', [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_notifications_user',
                ])
                ->addForeignKey('actor_id', 'users', 'id', [
                    'delete' => 'SET_NULL',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_notifications_actor',
                ])
                ->create();
        }

        if ($this->hasTable('notification_events')) {
            return;
        }

        $events = $this->table('notification_events', [
            'id' => false,
            'primary_key' => ['id'],
            'engine' => 'InnoDB',
            'encoding' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
        ]);

        $events
            ->addColumn('id', 'biginteger', [
                'signed' => false,
                'identity' => true,
            ])
            ->addColumn('notification_id', 'biginteger', [
                'signed' => false,
                'null' => false,
            ])
            ->addColumn('event_key', 'string', [
                'limit' => 191,
                'null' => false,
            ])
            ->addColumn('created_at', 'datetime', [
                'precision' => 3,
                'null' => true,
            ])
            ->addColumn('updated_at', 'datetime', [
                'precision' => 3,
                'null' => true,
            ])
            ->addIndex(['event_key'], [
                'unique' => true,
                'name' => 'uk_notification_events_key',
            ])
            ->addIndex(['notification_id'], ['name' => 'idx_notification_events_notification'])
            ->addForeignKey('notification_id', 'notifications', 'id', [
                'delete' => 'CASCADE',
                'update' => 'CASCADE',
                'constraint' => 'fk_notification_events_notification',
            ])
            ->create();
    }
}
