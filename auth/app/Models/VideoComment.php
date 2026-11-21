<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class VideoComment extends Model
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_DELETED = 'deleted';

    protected $table = 'video_comments';

    protected $fillable = [
        'video_id', 'user_id', 'parent_id', 'root_id', 'body', 'status',
        'replies_count', 'likes_count',
    ];

    protected $casts = [
        'video_id' => 'integer',
        'user_id' => 'integer',
        'parent_id' => 'integer',
        'root_id' => 'integer',
        'replies_count' => 'integer',
        'likes_count' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function video() { return $this->belongsTo(Video::class, 'video_id'); }
    public function user() { return $this->belongsTo(User::class, 'user_id'); }
    public function parent() { return $this->belongsTo(self::class, 'parent_id'); }
    public function root() { return $this->belongsTo(self::class, 'root_id'); }
    public function likes() { return $this->hasMany(VideoCommentLike::class, 'comment_id'); }
}

