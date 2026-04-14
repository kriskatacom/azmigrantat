<?php

namespace App\Models;

use App\Services\HelperService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class City extends Model
{
    use SoftDeletes;

    protected $table = 'cities';

    protected $fillable = [
        'name',
        'slug',
        'type',
        'parent_id',
        'sort_order',
        'options'
    ];

    protected $casts = [
        'options' => 'array',
        'sort_order' => 'integer',
        'parent_id' => 'integer'
    ];

    public function parent()
    {
        return $this->belongsTo(City::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(City::class, 'parent_id')->orderBy('sort_order');
    }

    public function getTypeName(): string
    {
        return match($this->type) {
            'region'  => 'Област',
            'city'    => 'Град',
            'village' => 'Село',
            default   => 'Неизвестно'
        };
    }

    public function scopeSorted($query)
    {
        return $query->orderBy('sort_order', 'asc')->orderBy('name', 'asc');
    }

    public function getTranslatedName(): string
    {
        $key = "city_{$this->id}_name";
        $translated = HelperService::trans($key);

        return ($translated !== $key) ? $translated : $this->name;
    }

    public function getOptionTranslation(string $field, ?string $default = null): string
    {
        $lang = $_SESSION['lang'] ?? 'bg';

        if ($lang === 'bg') {
            return $this->options[$field] ?? ($default ?? '');
        }

        $translationKey = "city_{$this->id}_options_{field}";

        $translatedValue = HelperService::trans($translationKey);

        if ($translatedValue !== $translationKey) {
            return $translatedValue;
        }

        return $this->options[$field] ?? ($default ?? '');
    }
}
