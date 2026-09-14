<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Video extends Model
{
    public const STATUS_PENDING_UPLOAD = 'pending_upload';
    public const STATUS_UPLOADING = 'uploading';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_READY = 'ready';
    public const STATUS_FAILED = 'failed';
    public const STATUS_DELETED = 'deleted';

    protected $table = 'videos';

    protected $fillable = [
        'user_id', 'bunny_library_id', 'bunny_video_guid', 'title', 'description', 'thumbnail_url', 'status',
        'bunny_status', 'mime_type', 'file_size', 'duration_seconds', 'width',
        'height', 'upload_expires_at', 'uploaded_at', 'processed_at', 'failed_at',
        'failure_reason',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'bunny_library_id' => 'integer',
        'bunny_status' => 'integer',
        'file_size' => 'integer',
        'duration_seconds' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
        'upload_expires_at' => 'datetime',
        'uploaded_at' => 'datetime',
        'processed_at' => 'datetime',
        'failed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

