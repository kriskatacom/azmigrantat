<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Page extends Model
{
    use SoftDeletes;

    protected $table = 'pages';

    protected $fillable = [
        'parent_id',
        'title',
        'slug',
        'custom_path',
        'content',
        'template',
        'view_name',
        'seo',
        'options',
        'menu_order',
        'image_url',
        'is_active'
    ];

    protected $casts = [
        'seo' => 'array',
        'options' => 'array',
        'is_active' => 'boolean',
        'menu_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Page::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Page::class, 'parent_id')->orderBy('menu_order', 'asc');
    }


    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function getActiveViewAttribute()
    {
        return $this->template === 'none' ? $this->view_name : $this->template;
    }

    public function elements()
    {
        return $this->hasMany(PageElement::class);
    }

    public function elementValues()
    {
        return $this->hasMany(PageElementValue::class);
    }
}
