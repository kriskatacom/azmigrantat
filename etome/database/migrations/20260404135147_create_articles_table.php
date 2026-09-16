<?php

declare(strict_types=1);

use Phinx\Migration\AbstractMigration;
use Phinx\Db\Adapter\MysqlAdapter;

final class CreateArticlesTable extends AbstractMigration
{
    public function change(): void
    {
        $this->execute('SET FOREIGN_KEY_CHECKS=0;');

        $categories = $this->table('categories');
        $categories->addColumn('name', 'string')
                  ->addColumn('slug', 'string')
                  ->addColumn('description', 'text', ['null' => true])
                  ->addColumn('sort_order', 'integer', ['default' => 0])
                  ->addColumn('options', 'json', ['null' => true])
                  ->addTimestamps()
                  ->addColumn('deleted_at', 'timestamp', ['null' => true]) // SoftDelete
                  ->addIndex(['slug'], ['unique' => true])
                  ->create();

        $tags = $this->table('tags');
        $tags->addColumn('name', 'string')
             ->addColumn('slug', 'string')
             ->addColumn('color', 'string', ['null' => true])
             ->addColumn('options', 'json', ['null' => true])
             ->addTimestamps()
             ->addColumn('deleted_at', 'timestamp', ['null' => true]) // SoftDelete
             ->addIndex(['slug'], ['unique' => true])
             ->create();

        $articles = $this->table('articles');
        $articles->addColumn('category_id', 'integer', ['null' => true, 'signed' => false])
                 ->addColumn('title', 'string')
                 ->addColumn('slug', 'string')
                 ->addColumn('excerpt', 'text', ['null' => true])
                 ->addColumn('content', 'text', ['limit' => MysqlAdapter::TEXT_LONG])
                 ->addColumn('image', 'string', ['null' => true])
                 ->addColumn('status', 'enum', ['values' => ['draft', 'published', 'scheduled'], 'default' => 'draft'])
                 ->addColumn('options', 'json', ['null' => true])
                 ->addColumn('published_at', 'timestamp', ['null' => true])
                 ->addTimestamps()
                 ->addColumn('deleted_at', 'timestamp', ['null' => true]) // SoftDelete
                 ->addIndex(['slug'], ['unique' => true])
                 ->addForeignKey('category_id', 'categories', 'id', ['delete'=> 'SET_NULL', 'update'=> 'NO_ACTION'])
                 ->create();

        $articleTag = $this->table('article_tag', ['id' => false, 'primary_key' => ['article_id', 'tag_id']]);
        $articleTag->addColumn('article_id', 'integer', ['signed' => false, 'null' => false])
                   ->addColumn('tag_id', 'integer', ['signed' => false, 'null' => false])
                   ->addForeignKey('article_id', 'articles', 'id', ['delete'=> 'CASCADE'])
                   ->addForeignKey('tag_id', 'tags', 'id', ['delete'=> 'CASCADE'])
                   ->create();

        $this->execute('SET FOREIGN_KEY_CHECKS=1;');
    }
}