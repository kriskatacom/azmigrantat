<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Translation extends Model
{
    protected $table = 'translations';

    protected $fillable = [
        'lang_code',
        'translation_key',
        'translation_value',
        'source',
        'group_key'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'source' => 'string'
    ];

    public function getTranslationValue($langCode)
    {
        return self::where('translation_key', $this->translation_key)
            ->where('lang_code', $langCode)
            ->value('translation_value');
    }

    public function scopeByLang($query, string $code)
    {
        return $query->where('lang_code', $code);
    }

    // НОВО: Филтър по източник
    public function scopeBySource($query, string $source)
    {
        return $query->where('source', $source);
    }

    public static function getTranslation(string $lang, string $key): ?string
    {
        return self::where('lang_code', $lang)
            ->where('translation_key', $key)
            ->value('translation_value');
    }

    public static function getStats(): array
    {
        $stats = self::selectRaw("
            COUNT(*) as total,
            COUNT(DISTINCT lang_code) as languages,
            SUM(CASE WHEN source = 'static' THEN 1 ELSE 0 END) as static_count,
            SUM(CASE WHEN source = 'dynamic' THEN 1 ELSE 0 END) as dynamic_count
        ")->first();

        return [
            'total_keys' => (int) $stats->total,
            'unique_languages' => (int) $stats->languages,
            'static_translations' => (int) $stats->static_count,
            'dynamic_translations' => (int) $stats->dynamic_count
        ];
    }
}
