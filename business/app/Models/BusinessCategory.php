<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class BusinessCategory extends Model
{
    use SoftDeletes;
    
    protected $table = 'business_categories';

    protected $fillable = [
        'name',
        'slug',
        'heading',
        'excerpt',
        'image_url',
        'companies_background_url',
        'content',
        'parent_id',
        'sort_order',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(BusinessCategory::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(BusinessCategory::class, 'parent_id')
            ->active()
            ->orderBy('sort_order', 'asc');
    }

    public function companies()
    {
        return $this->hasMany(Company::class, 'category_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeRoot($query)
    {
        return $query->whereNull('parent_id');
    }

    public function getTranslatedName(): string
    {
        return $this->name ?? '';
    }

    public function getOptionTranslation(string $key, $default = null)
    {
        if ($key === 'h1_title') return $this->heading ?? $this->name;
        return $default;
    }
}
