<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Article extends Model
{
    use SoftDeletes;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_SCHEDULED = 'scheduled';

    protected $table = 'articles';

    protected $fillable = [
        'category_id',
        'title',
        'slug',
        'excerpt',
        'content',
        'image',
        'status',
        'options',
        'published_at'
    ];

    protected $casts = [
        'options' => 'json',
        'published_at' => 'datetime',
        'deleted_at' => 'datetime'
    ];

    public static function getStatuses(): array
    {
        return [
            self::STATUS_DRAFT     => 'Чернова',
            self::STATUS_PUBLISHED => 'Публикувана',
            self::STATUS_SCHEDULED => 'Планирана',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id', 'id')->withDefault([
            'name' => 'Без категория'
        ]);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'article_tag', 'article_id', 'tag_id')
            ->withTimestamps();
    }

    public function scopeWithStatus($query, string $status = self::STATUS_PUBLISHED)
    {
        $query->where('status', $status);

        if ($status === self::STATUS_PUBLISHED) {
            $query->where('published_at', '<=', now());
        }

        return $query;
    }
}