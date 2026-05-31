<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Menu extends Model
{
    use SoftDeletes;

    protected $table = 'menus';

    protected $fillable = [
        'title',
        'slug',
        'description'
    ];

    public function menuItems(): HasMany
    {
        return $this->hasMany(MenuItem::class, 'menu_id');
    }

    public function getItems()
    {
        return $this->menuItems()
            ->whereNull('parent_id')
            ->where('is_active', 1)
            ->orderBy('order_index', 'ASC')
            ->get();
    }

    public function getTree()
    {
        return $this->menuItems()
            ->whereNull('parent_id')
            ->where('is_active', 1)
            ->with(['children' => function ($query) {
                $query->where('is_active', 1)->orderBy('order_index', 'asc');
            }])
            ->orderBy('order_index', 'asc')
            ->get();
    }
}
