<?php

use Phinx\Migration\AbstractMigration;

final class AddPublicCodeToUsersAndCreateUserBlocksTable extends AbstractMigration
{
    public function change(): void
    {
        $users = $this->table('users');

        if (!$users->hasColumn('public_code')) {
            $users->addColumn('public_code', 'string', [
                'limit' => 8,
                'null' => true,
                'after' => 'username',
            ]);
            $users->addIndex(['public_code'], [
                'unique' => true,
                'name' => 'uk_users_public_code',
            ]);
            $users->update();
        }

        if ($this->hasTable('user_blocks')) {
            return;
        }

        $table = $this->table('user_blocks', [
            'id' => false,
            'primary_key' => ['id'],
            'engine' => 'InnoDB',
            'encoding' => 'utf8mb4',
            'collation' => 'utf8mb4_unicode_ci',
        ]);

        $table
            ->addColumn('id', 'integer', [
                'signed' => false,
                'identity' => true,
            ])
            ->addColumn('blocker_id', 'integer', [
                'signed' => false,
                'null' => false,
            ])
            ->addColumn('blocked_id', 'integer', [
                'signed' => false,
                'null' => false,
            ])
            ->addColumn('created_at', 'datetime', [
                'null' => true,
            ])
            ->addColumn('updated_at', 'datetime', [
                'null' => true,
            ])
            ->addIndex(
                ['blocker_id', 'blocked_id'],
                [
                    'unique' => true,
                    'name' => 'uk_user_blocks_pair',
                ]
            )
            ->addIndex(['blocker_id'], ['name' => 'idx_user_blocks_blocker'])
            ->addIndex(['blocked_id'], ['name' => 'idx_user_blocks_blocked'])
            ->addForeignKey(
                'blocker_id',
                'users',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_user_blocks_blocker',
                ]
            )
            ->addForeignKey(
                'blocked_id',
                'users',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_user_blocks_blocked',
                ]
            )
            ->create();
    }
}
