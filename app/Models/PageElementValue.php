<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PageElementValue extends Model
{
    protected $table = 'page_element_values';

    protected $fillable = [
        'page_id',
        'element_id',
        'value',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function element()
    {
        return $this->belongsTo(PageElement::class, 'element_id');
    }

    public function page()
    {
        return $this->belongsTo(Page::class, 'page_id');
    }

    public static function getMappedByPageId($pageId): array
    {
        $values = self::where('page_id', $pageId)->get();

        $mapped = [];

        foreach ($values as $val) {
            $mapped[$val->element_id] = $val->value;
        }

        return $mapped;
    }
}