<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class VideoCommentLike extends Model
{
    public $timestamps = false;

    protected $table = 'video_comment_likes';

    protected $fillable = ['comment_id', 'user_id', 'created_at'];

    protected $casts = [
        'comment_id' => 'integer',
        'user_id' => 'integer',
        'created_at' => 'datetime',
    ];
}

