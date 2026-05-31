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
        'group_key',
        'source'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
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
            COUNT(DISTINCT lang_code) as languages
        ")->first();

        return [
            'total_keys' => (int) $stats->total,
            'unique_languages' => (int) $stats->languages
        ];
    }
}
