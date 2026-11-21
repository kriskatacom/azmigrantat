<?php

use Phinx\Migration\AbstractMigration;

final class AddVideoEnhancementMethod extends AbstractMigration
{
    public function up(): void
    {
        if (!$this->hasTable('video_enhancement_jobs')) return;
        $table = $this->table('video_enhancement_jobs');
        if (!$table->hasColumn('requested_method')) $table->addColumn('requested_method', 'string', ['limit' => 16, 'default' => 'standard']);
        if (!$table->hasColumn('method')) $table->addColumn('method', 'string', ['limit' => 16, 'default' => 'standard']);
        if (!$table->hasColumn('requested_target_short_side')) $table->addColumn('requested_target_short_side', 'integer', ['signed' => false, 'default' => 1080]);
        if (!$table->hasColumn('target_short_side')) $table->addColumn('target_short_side', 'integer', ['signed' => false, 'default' => 1080]);
        $table->update();
        $this->execute("UPDATE video_enhancement_jobs SET requested_method = CASE WHEN requested_mode LIKE 'ai\\_%' THEN 'ai' ELSE 'standard' END, method = CASE WHEN mode LIKE 'ai\\_%' THEN 'ai' ELSE 'standard' END, requested_target_short_side = CASE WHEN requested_mode LIKE '%720p' THEN 720 ELSE 1080 END, target_short_side = CASE WHEN mode LIKE '%720p' THEN 720 ELSE 1080 END");
        $table = $this->table('video_enhancement_jobs');
        if (!$table->hasIndex(['method', 'status'])) $table->addIndex(['method', 'status'], ['name' => 'idx_video_enhancement_method_status'])->update();
    }

    public function down(): void
    {
        if (!$this->hasTable('video_enhancement_jobs')) return;
        $table = $this->table('video_enhancement_jobs');
        if ($table->hasIndex(['method', 'status'])) $table->removeIndex(['method', 'status']);
        foreach (['target_short_side', 'requested_target_short_side', 'method', 'requested_method'] as $column) if ($table->hasColumn($column)) $table->removeColumn($column);
        $table->update();
    }
}
