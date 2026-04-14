<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Redirect extends Model
{
    use SoftDeletes;

    protected $table = 'redirects';

    protected $fillable = [
        'old_path',
        'new_path',
        'status_code',
        'category',
        'description',
        'hits_count',
        'last_used_at',
        'is_active',
        'user_id'
    ];

    protected $casts = [
        'status_code'  => 'integer',
        'hits_count'   => 'integer',
        'is_active'    => 'boolean',
        'last_used_at' => 'datetime',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function trigger()
    {
        $this->increment('hits_count');

        $this->update([
            'last_used_at' => date('Y-m-d H:i:s')
        ]);

        header("Location: " . $this->new_path, true, $this->status_code);
        exit;
    }

    public static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            if (!empty($model->old_path)) {
                $model->old_path = '/' . ltrim(trim($model->old_path), '/');
            }

            if (!empty($model->new_path) && !preg_match('~^(?:f|ht)tps?://~i', $model->new_path)) {
                $model->new_path = '/' . ltrim(trim($model->new_path), '/');
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
