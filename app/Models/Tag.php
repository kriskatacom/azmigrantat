<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Tag extends Model
{
    use SoftDeletes;

    public const TABLE_PIVOT_ARTICLE = 'article_tag';

    public const COLOR_BLUE   = 'blue';
    public const COLOR_RED    = 'red';
    public const COLOR_GRAY   = 'gray';
    public const COLOR_EMERALD = 'emerald';

    protected $table = 'tags';

    protected $fillable = [
        'name',
        'slug',
        'color',
        'options'
    ];

    protected $casts = [
        'options' => 'json',
        'deleted_at' => 'datetime'
    ];

    public function articles(): BelongsToMany
    {
        return $this->belongsToMany(Article::class, 'article_tag', 'tag_id', 'article_id');
    }

    public static function getAvailableColors(): array
    {
        return [
            self::COLOR_BLUE    => 'Син',
            self::COLOR_RED     => 'Червен',
            self::COLOR_GRAY    => 'Сив',
            self::COLOR_EMERALD => 'Зелен',
        ];
    }
}
