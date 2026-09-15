<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use SoftDeletes;

    public const ORDER_COLUMN_SORT = 'sort_order';
    public const ORDER_COLUMN_NAME = 'name';
    public const ORDER_DIRECTION_ASC = 'asc';
    public const ORDER_DIRECTION_DESC = 'desc';

    protected $table = 'categories';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'sort_order',
        'options'
    ];

    protected $casts = [
        'options' => 'json',
        'sort_order' => 'integer',
        'deleted_at' => 'datetime'
    ];

    public function articles(): HasMany
    {
        return $this->hasMany(Article::class, 'category_id', 'id');
    }

    public function scopeOrdered($query, string $direction = self::ORDER_DIRECTION_ASC)
    {
        return $query->orderBy(self::ORDER_COLUMN_SORT, $direction)
            ->orderBy(self::ORDER_COLUMN_NAME, $direction);
    }
}