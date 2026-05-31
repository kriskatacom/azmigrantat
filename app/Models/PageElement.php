<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PageElement extends Model
{
    protected $table = 'page_elements';

    protected $fillable = [
        'key_name',
        'label',
        'section_name',
        'type',
        'value',
        'sort_order',
        'is_active',
        'help_text',
        'page_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public $timestamps = false;

    public function values()
    {
        return $this->hasMany(PageElementValue::class, 'element_id');
    }

    public function page()
    {
        return $this->belongsTo(Page::class, 'page_id');
    }

    public function getFinalValueAttribute()
    {
        return $this->values->first()?->value ?? $this->value;
    }
    
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
