<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CompanyService extends Model
{
    use SoftDeletes;

    protected $table = 'company_services';

    protected $fillable = [
        'company_id',
        'user_id',
        'name',
        'sort_order',
        'is_active',
        'options',
        'created_at'
    ];

    protected $casts = [
        'options' => 'array',
        'is_active' => 'boolean'
    ];

    public $timestamps = false;

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (!$model->created_at) {
                $model->created_at = date('Y-m-d H:i:s');
            }
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order', 'asc')->orderBy('created_at', 'desc');
    }
}
