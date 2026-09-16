<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;

final class CreateGalleriesAndPivotTable extends AbstractMigration
{
    public function change(): void
    {
        $table = $this->table('galleries');

        $table
            ->addColumn('user_id', 'integer', ['null' => true, 'signed' => false])
            ->addColumn('slug', 'string', ['limit' => 255, 'null' => false]) // Ключ за получаване (URL/Code)
            ->addColumn('payload', 'string', ['limit' => 255])               // Заглавие
            ->addColumn('description', 'text', ['null' => true])             // Описание
            ->addColumn('user_agent', 'text', ['null' => true])
            ->addColumn('is_active', 'boolean', ['default' => true])
            ->addColumn('last_activity', 'integer', ['signed' => false, 'null' => true])

            // Timestamps и Soft Deletes
            ->addColumn('created_at', 'datetime', ['null' => true])
            ->addColumn('updated_at', 'datetime', ['null' => true])
            ->addColumn('deleted_at', 'datetime', ['null' => true])

            ->addIndex(['user_id'])
            ->addIndex(['slug'], ['unique' => true]) // Индекс за бързо търсене по ключ
            ->addIndex(['last_activity'])
            ->create();

        $pivot = $this->table('gallery_media', [
            'id' => false,
            'primary_key' => ['gallery_id', 'media_id']
        ]);

        $pivot
            ->addColumn('gallery_id', 'integer', ['signed' => false, 'null' => false])
            ->addColumn('media_id', 'integer', ['signed' => false, 'null' => false])
            ->addColumn('sort_order', 'integer', ['default' => 0, 'signed' => false])
            ->addIndex(['gallery_id'])
            ->addIndex(['media_id'])
            ->addForeignKey('gallery_id', 'galleries', 'id', [
                'delete' => 'CASCADE',
                'update' => 'NO_ACTION'
            ])
            ->addForeignKey('media_id', 'media', 'id', [
                'delete' => 'CASCADE',
                'update' => 'NO_ACTION'
            ])
            ->create();
    }
}
