<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BusinessCategory extends Model
{
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

    /**
     * Връзка към родителската бизнес категория
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(BusinessCategory::class, 'parent_id');
    }

    /**
     * Връзка към подкатегориите (децата)
     */
    public function children(): HasMany
    {
        return $this->hasMany(BusinessCategory::class, 'parent_id')
            ->active()
            ->orderBy('sort_order', 'asc');
    }

    /**
     * Филтър за активни категории
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Филтър за главни категории (без родител)
     */
    public function scopeRoot($query)
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Помощен метод за преведено име (за съвместимост с View-тата)
     */
    public function getTranslatedName(): string
    {
        return $this->name ?? '';
    }

    /**
     * Помощен метод за превод на опции/SEO (ако имаш такава логика в другите модели)
     */
    public function getOptionTranslation(string $key, $default = null)
    {
        // Ако нямаш отделна таблица за опции тук, връщаме заглавието или дефолтната стойност
        if ($key === 'h1_title') return $this->heading ?? $this->name;
        return $default;
    }
}