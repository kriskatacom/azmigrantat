<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Video extends Model
{
    private static ?bool $providerMetadataAvailable = null;

    public const STATUS_PENDING_UPLOAD = 'pending_upload';
    public const STATUS_UPLOADING = 'uploading';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_READY = 'ready';
    public const STATUS_FAILED = 'failed';
    public const STATUS_DELETED = 'deleted';

    protected $table = 'videos';

    protected $fillable = [
        'user_id', 'category_id', 'place_id', 'provider', 'provider_video_id', 'storage_path', 'playback_url',
        'processing_status', 'duration', 'bunny_library_id', 'bunny_video_guid', 'title', 'description', 'thumbnail_url', 'status',
        'bunny_status', 'mime_type', 'file_size', 'duration_seconds', 'width',
        'height', 'upload_expires_at', 'uploaded_at', 'processed_at', 'failed_at',
        'failure_reason', 'total_views', 'unique_viewers', 'comments_count',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'category_id' => 'integer',
        'place_id' => 'integer',
        'duration' => 'float',
        'bunny_library_id' => 'integer',
        'bunny_status' => 'integer',
        'file_size' => 'integer',
        'duration_seconds' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
        'total_views' => 'integer',
        'unique_viewers' => 'integer',
        'comments_count' => 'integer',
        'upload_expires_at' => 'datetime',
        'uploaded_at' => 'datetime',
        'processed_at' => 'datetime',
        'failed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static function providerMetadataAvailable(): bool
    {
        if (self::$providerMetadataAvailable !== null) {
            return self::$providerMetadataAvailable;
        }

        // This application boots Eloquent directly rather than through the
        // Laravel framework, so the Schema facade has no `db.schema` binding.
        // Resolve the schema builder from the model's real DB connection.
        $schema = (new self())->getConnection()->getSchemaBuilder();

        return self::$providerMetadataAvailable = $schema->hasColumn('videos', 'provider')
            && $schema->hasColumn('videos', 'provider_video_id')
            && $schema->hasColumn('videos', 'processing_status');
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function place()
    {
        return $this->belongsTo(Place::class, 'place_id');
    }

    public function comments()
    {
        return $this->hasMany(VideoComment::class, 'video_id');
    }
}
