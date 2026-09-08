<?php

use Phinx\Migration\AbstractMigration;

final class CreateUserDevicesTable extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('user_devices')) {
            return;
        }

        $table = $this->table('user_devices', [
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
            ->addColumn('device_uuid', 'string', [
                'limit' => 255,
                'null' => false,
            ])
            ->addColumn('push_token', 'string', [
                'limit' => 500,
                'null' => false,
            ])
            ->addColumn('platform', 'enum', [
                'values' => ['android', 'ios'],
                'null' => false,
            ])
            ->addColumn('device_name', 'string', [
                'limit' => 255,
                'null' => true,
            ])
            ->addColumn('app_version', 'string', [
                'limit' => 50,
                'null' => true,
            ])
            ->addColumn('is_active', 'boolean', [
                'default' => true,
                'null' => false,
            ])
            ->addColumn('last_seen_at', 'datetime', [
                'precision' => 3,
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
            ->addColumn('deleted_at', 'datetime', [
                'precision' => 3,
                'null' => true,
            ])
            ->addIndex(
                ['user_id', 'device_uuid'],
                [
                    'unique' => true,
                    'name' => 'uk_user_devices_user_device',
                ]
            )
            ->addIndex(
                ['push_token'],
                [
                    'unique' => true,
                    'name' => 'uk_user_devices_push_token',
                ]
            )
            ->addIndex(
                ['user_id', 'is_active'],
                [
                    'name' => 'idx_user_devices_user_active',
                ]
            )
            ->addIndex(
                ['last_seen_at'],
                [
                    'name' => 'idx_user_devices_last_seen',
                ]
            )
            ->addForeignKey(
                'user_id',
                'users',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_user_devices_user',
                ]
            )
            ->create();
    }
}
