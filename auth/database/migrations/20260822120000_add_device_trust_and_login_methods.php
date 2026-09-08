<?php

use Phinx\Migration\AbstractMigration;

final class AddDeviceTrustAndLoginMethods extends AbstractMigration
{
    public function change(): void
    {
        if ($this->hasTable('user_devices')) {
            $devices = $this->table('user_devices');

            if ($devices->hasIndex('uk_user_devices_push_token')) {
                $devices->removeIndexByName('uk_user_devices_push_token');
            }

            if ($devices->hasColumn('push_token')) {
                $devices->changeColumn('push_token', 'string', [
                    'limit' => 500,
                    'null' => true,
                ]);
            }

            if (!$devices->hasColumn('is_trusted')) {
                $devices->addColumn('is_trusted', 'boolean', [
                    'default' => false,
                    'null' => false,
                    'after' => 'is_active',
                ]);
            }

            if (!$devices->hasColumn('trusted_at')) {
                $devices->addColumn('trusted_at', 'datetime', [
                    'precision' => 3,
                    'null' => true,
                    'after' => 'is_trusted',
                ]);
            }

            if (!$devices->hasColumn('login_secret_hash')) {
                $devices->addColumn('login_secret_hash', 'string', [
                    'limit' => 64,
                    'null' => true,
                    'after' => 'trusted_at',
                ]);
            }

            $devices->update();
        }

        if (!$this->hasTable('device_auth_pending')) {
            $pending = $this->table('device_auth_pending', [
                'id' => false,
                'primary_key' => ['id'],
                'engine' => 'InnoDB',
                'encoding' => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
            ]);

            $pending
                ->addColumn('id', 'biginteger', [
                    'signed' => false,
                    'identity' => true,
                ])
                ->addColumn('user_id', 'integer', [
                    'signed' => false,
                    'null' => false,
                ])
                ->addColumn('oauth_app_id', 'integer', [
                    'signed' => false,
                    'null' => false,
                ])
                ->addColumn('remember_me', 'boolean', [
                    'default' => false,
                    'null' => false,
                ])
                ->addColumn('token_hash', 'string', [
                    'limit' => 64,
                    'null' => false,
                ])
                ->addColumn('new_device_uuid', 'string', [
                    'limit' => 255,
                    'null' => false,
                ])
                ->addColumn('platform', 'enum', [
                    'values' => ['android', 'ios'],
                    'null' => true,
                ])
                ->addColumn('device_name', 'string', [
                    'limit' => 255,
                    'null' => true,
                ])
                ->addColumn('email_code_hash', 'string', [
                    'limit' => 64,
                    'null' => true,
                ])
                ->addColumn('email_code_expires_at', 'datetime', [
                    'precision' => 3,
                    'null' => true,
                ])
                ->addColumn('approved_at', 'datetime', [
                    'precision' => 3,
                    'null' => true,
                ])
                ->addColumn('expires_at', 'datetime', [
                    'precision' => 3,
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
                ->addIndex(['token_hash'], [
                    'unique' => true,
                    'name' => 'uk_device_auth_pending_token',
                ])
                ->addIndex(['user_id'], [
                    'name' => 'idx_device_auth_pending_user',
                ])
                ->addForeignKey(
                    'user_id',
                    'users',
                    'id',
                    [
                        'delete' => 'CASCADE',
                        'update' => 'CASCADE',
                        'constraint' => 'fk_device_auth_pending_user',
                    ]
                )
                ->create();
        }
    }
}
