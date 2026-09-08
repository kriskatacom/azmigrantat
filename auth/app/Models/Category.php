<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use SoftDeletes;

    protected $table = 'categories';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'image_url',
        'parent_id',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'deleted_at' => 'datetime',
    ];

    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeInactive($query)
    {
        return $query->where('is_active', false);
    }

    public function scopeFilterByStatus($query, $status)
    {
        return match ($status) {
            'inactive' => $query->inactive(),
            'deleted' => $query->onlyTrashed(),
            'all' => $query->withTrashed(),
            default => $query->active(),
        };
    }

    public function hasHiddenChildren()
    {
        return $this->children()->where('is_active', false)->exists();
    }

    public function hasHiddenDescendants()
    {
        foreach ($this->children as $child) {
            if (!$child->is_active || $child->hasHiddenDescendants()) {
                return true;
            }
        }
        return false;
    }

    public function matchesTab($tab)
    {
        if ($tab === 'all')
            return true;

        $check = function ($cat) use ($tab, &$check) {
            $matches = match ($tab) {
                'inactive' => !$cat->is_active && is_null($cat->deleted_at),
                'deleted' => !is_null($cat->deleted_at),
                default => $cat->is_active && is_null($cat->deleted_at),
            };

            if ($matches)
                return true;

            $children = $cat->children()->withTrashed()->get();
            foreach ($children as $child) {
                if ($check($child))
                    return true;
            }
            return false;
        };

        return $check($this);
    }
}
