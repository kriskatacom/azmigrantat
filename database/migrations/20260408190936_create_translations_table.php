<?php

use Phinx\Migration\AbstractMigration;

class CreateTranslationsTable extends AbstractMigration
{
    public function change(): void
    {
        $table = $this->table('translations');

        $table->addColumn('lang_code', 'string', ['limit' => 5, 'null' => false])
            ->addColumn('translation_key', 'string', ['limit' => 100, 'null' => false])
            ->addColumn('translation_value', 'text', ['null' => false])
            ->addColumn('created_at', 'timestamp', [
                'default' => 'CURRENT_TIMESTAMP',
                'null' => false
            ])
            ->addColumn('source', 'string', ['limit' => 255, 'null' => true])
            ->addColumn('updated_at', 'timestamp', [
                'default' => 'CURRENT_TIMESTAMP',
                'update' => 'CURRENT_TIMESTAMP',
                'null' => false
            ])
            ->addIndex(['lang_code', 'translation_key'], [
                'unique' => true,
                'name' => 'lang_key_unique'
            ])
            ->create();
    }
}