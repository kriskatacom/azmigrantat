<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MenuItem extends Model
{
    protected $table = 'menu_items';

    protected $fillable = [
        'menu_id',
        'parent_id',
        'page_id',
        'title',
        'url',
        'target',
        'order_index',
        'is_active'
    ];

    public function children(): HasMany
    {
        return $this->hasMany(MenuItem::class, 'parent_id', 'id')
                    ->orderBy('order_index', 'asc');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class, 'parent_id', 'id');
    }

    public function menu(): BelongsTo
    {
        return $this->belongsTo(Menu::class, 'menu_id', 'id');
    }

    public function page(): BelongsTo
    {
        return $this->belongsTo(Page::class, 'page_id', 'id');
    }

    public function getChildren()
    {
        return self::where('parent_id', $this->id)
            ->where('is_active', 1)
            ->orderBy('order_index', 'ASC')
            ->get();
    }

    public function getUrl(): string
    {
        if ($this->page_id) {
            $page = Page::find($this->page_id);
            if ($page) {
                return !empty($page->custom_path) ? $page->custom_path : $page->slug;
            }
        }

        return $this->url ?? '#';
    }
}