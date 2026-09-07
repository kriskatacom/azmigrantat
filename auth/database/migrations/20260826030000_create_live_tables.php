<?php

use Phinx\Migration\AbstractMigration;

final class CreateLiveTables extends AbstractMigration
{
    public function change(): void
    {
        $this->createLiveStreamsTable();
        $this->createLiveViewersTable();
        $this->createLiveCommentsTable();
    }

    private function createLiveStreamsTable(): void
    {
        if ($this->hasTable('live_streams')) {
            return;
        }

        $table = $this->table('live_streams', [
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
            ->addColumn('title', 'string', [
                'limit' => 120,
                'null' => true,
            ])
            ->addColumn('status', 'enum', [
                'values' => ['idle', 'live', 'ended'],
                'default' => 'idle',
                'null' => false,
            ])
            ->addColumn('media_provider', 'string', [
                'limit' => 32,
                'default' => 'mock',
                'null' => false,
            ])
            ->addColumn('media_room_id', 'string', [
                'limit' => 64,
                'null' => true,
            ])
            ->addColumn('viewer_count', 'integer', [
                'signed' => false,
                'default' => 0,
                'null' => false,
            ])
            ->addColumn('peak_viewer_count', 'integer', [
                'signed' => false,
                'default' => 0,
                'null' => false,
            ])
            ->addColumn('started_at', 'datetime', [
                'precision' => 3,
                'null' => true,
            ])
            ->addColumn('ended_at', 'datetime', [
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
            ->addIndex(['user_id'], ['name' => 'idx_live_streams_user'])
            ->addIndex(['status', 'started_at'], ['name' => 'idx_live_streams_status_started'])
            ->addIndex(['media_room_id'], ['name' => 'idx_live_streams_media_room'])
            ->addForeignKey(
                'user_id',
                'users',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_live_streams_user',
                ]
            )
            ->create();
    }

    private function createLiveViewersTable(): void
    {
        if ($this->hasTable('live_viewers')) {
            return;
        }

        $table = $this->table('live_viewers', [
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
            ->addColumn('live_stream_id', 'biginteger', [
                'signed' => false,
                'null' => false,
            ])
            ->addColumn('user_id', 'integer', [
                'signed' => false,
                'null' => false,
            ])
            ->addColumn('joined_at', 'datetime', [
                'precision' => 3,
                'null' => true,
            ])
            ->addColumn('left_at', 'datetime', [
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
            ->addIndex(
                ['live_stream_id', 'user_id'],
                [
                    'unique' => true,
                    'name' => 'uk_live_viewers_stream_user',
                ]
            )
            ->addIndex(['live_stream_id', 'left_at'], ['name' => 'idx_live_viewers_active'])
            ->addIndex(['user_id'], ['name' => 'idx_live_viewers_user'])
            ->addForeignKey(
                'live_stream_id',
                'live_streams',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_live_viewers_stream',
                ]
            )
            ->addForeignKey(
                'user_id',
                'users',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_live_viewers_user',
                ]
            )
            ->create();
    }

    private function createLiveCommentsTable(): void
    {
        if ($this->hasTable('live_comments')) {
            return;
        }

        $table = $this->table('live_comments', [
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
            ->addColumn('live_stream_id', 'biginteger', [
                'signed' => false,
                'null' => false,
            ])
            ->addColumn('user_id', 'integer', [
                'signed' => false,
                'null' => false,
            ])
            ->addColumn('body', 'string', [
                'limit' => 280,
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
            ->addIndex(['live_stream_id', 'id'], ['name' => 'idx_live_comments_stream_id'])
            ->addIndex(['user_id'], ['name' => 'idx_live_comments_user'])
            ->addForeignKey(
                'live_stream_id',
                'live_streams',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_live_comments_stream',
                ]
            )
            ->addForeignKey(
                'user_id',
                'users',
                'id',
                [
                    'delete' => 'CASCADE',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_live_comments_user',
                ]
            )
            ->create();
    }
}
