<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class ContentReport extends Model
{
    protected $table = 'content_reports';

    protected $fillable = [
        'reporter_id', 'reported_user_id', 'target_type', 'target_id', 'reason',
        'details', 'status', 'active_key', 'moderator_notes', 'reviewed_by', 'reviewed_at',
    ];

    protected $casts = [
        'reporter_id' => 'integer', 'reported_user_id' => 'integer',
        'target_id' => 'string', 'reviewed_by' => 'integer',
        'reviewed_at' => 'datetime', 'created_at' => 'datetime', 'updated_at' => 'datetime',
    ];

    public function reporter() { return $this->belongsTo(User::class, 'reporter_id'); }
    public function reportedUser() { return $this->belongsTo(User::class, 'reported_user_id'); }
    public function reviewer() { return $this->belongsTo(User::class, 'reviewed_by'); }
}
