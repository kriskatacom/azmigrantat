<?php

use Phinx\Migration\AbstractMigration;

final class CreatePlacesAndAddVideoPlace extends AbstractMigration
{
    public function up(): void
    {
        if (!$this->hasTable('places')) {
            $this->table('places')
                ->addColumn('provider', 'string', ['limit' => 20, 'default' => 'osm'])
                ->addColumn('provider_id', 'string', ['limit' => 80])
                ->addColumn('osm_type', 'string', ['limit' => 16, 'null' => true])
                ->addColumn('osm_id', 'biginteger', ['null' => true])
                ->addColumn('name', 'string', ['limit' => 180])
                ->addColumn('type', 'string', ['limit' => 24])
                ->addColumn('country_code', 'string', ['limit' => 2, 'null' => true])
                ->addColumn('country', 'string', ['limit' => 120, 'null' => true])
                ->addColumn('region', 'string', ['limit' => 160, 'null' => true])
                ->addColumn('county', 'string', ['limit' => 160, 'null' => true])
                ->addColumn('city', 'string', ['limit' => 160, 'null' => true])
                ->addColumn('latitude', 'decimal', ['precision' => 10, 'scale' => 7])
                ->addColumn('longitude', 'decimal', ['precision' => 10, 'scale' => 7])
                ->addTimestamps()
                ->addIndex(['provider', 'provider_id'], ['unique' => true, 'name' => 'uq_places_provider_id'])
                ->addIndex(['name'], ['name' => 'idx_places_name'])
                ->addIndex(['country_code', 'region', 'city'], ['name' => 'idx_places_hierarchy'])
                ->create();
        }

        if ($this->hasTable('videos') && !$this->table('videos')->hasColumn('place_id')) {
            $this->table('videos')
                ->addColumn('place_id', 'integer', ['signed' => false, 'null' => true, 'after' => 'category_id'])
                ->update();
        }

        if ($this->hasTable('videos') && $this->table('videos')->hasColumn('place_id')) {
            // Phinx creates the default `places.id` as UNSIGNED. Re-assert the
            // compatible type so retrying after partial MySQL DDL is safe.
            $videos = $this->table('videos');
            $videos->changeColumn('place_id', 'integer', ['signed' => false, 'null' => true])->update();
            if (!$videos->hasIndexByName('idx_videos_place')) {
                $videos->addIndex(['place_id'], ['name' => 'idx_videos_place'])->update();
            }
            if (!$videos->hasForeignKey('place_id', 'fk_videos_place')) {
                $videos->addForeignKey('place_id', 'places', 'id', [
                    'delete' => 'SET_NULL',
                    'update' => 'CASCADE',
                    'constraint' => 'fk_videos_place',
                ])->update();
            }
        }
    }

    public function down(): void
    {
        if ($this->hasTable('videos') && $this->table('videos')->hasColumn('place_id')) {
            $videos = $this->table('videos');
            if ($videos->hasForeignKey('place_id', 'fk_videos_place')) {
                $videos->dropForeignKey('place_id', 'fk_videos_place')->update();
            }
            if ($videos->hasIndexByName('idx_videos_place')) {
                $videos->removeIndexByName('idx_videos_place')->update();
            }
            $videos->removeColumn('place_id')->update();
        }
        if ($this->hasTable('places')) {
            $this->table('places')->drop()->save();
        }
    }
}
