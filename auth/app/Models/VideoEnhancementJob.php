<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class VideoEnhancementJob extends Model
{
    protected $table = 'video_enhancement_jobs';
    protected $fillable = [
        'job_id', 'video_id', 'user_id', 'upload_id', 'requested_mode', 'mode',
        'requested_method', 'method', 'requested_target_short_side', 'target_short_side',
        'fallback_policy', 'status', 'progress', 'estimated_seconds', 'result_url',
        'original_playback_url', 'failure_code', 'failure_reason', 'started_at', 'completed_at',
    ];
    protected $casts = [
        'video_id' => 'integer', 'user_id' => 'integer', 'progress' => 'integer',
        'requested_target_short_side' => 'integer', 'target_short_side' => 'integer',
        'estimated_seconds' => 'integer', 'started_at' => 'datetime',
        'completed_at' => 'datetime', 'created_at' => 'datetime', 'updated_at' => 'datetime',
    ];
    public function video() { return $this->belongsTo(Video::class, 'video_id'); }
}
