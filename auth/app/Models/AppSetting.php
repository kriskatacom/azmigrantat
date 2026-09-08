<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Throwable;

class AppSetting extends Model
{
    public const PHONE_VERIFY_TEST_MODE = 'phone_verify_test_mode';
    public const ENV_SOURCE = 'env_source';

    protected $table = 'app_settings';

    protected $fillable = [
        'setting_key',
        'setting_value',
    ];

    public static function getValue(string $key, ?string $default = null): ?string
    {
        try {
            $row = static::query()->where('setting_key', $key)->first();
        } catch (Throwable) {
            return $default;
        }

        if (!$row || $row->setting_value === null || $row->setting_value === '') {
            return $default;
        }

        return (string) $row->setting_value;
    }

    public static function setValue(string $key, string $value): void
    {
        static::query()->updateOrCreate(
            ['setting_key' => $key],
            ['setting_value' => $value]
        );
    }

    public static function bool(string $key, bool $default = false): bool
    {
        $raw = static::getValue($key);

        if ($raw === null) {
            return $default;
        }

        return filter_var($raw, FILTER_VALIDATE_BOOLEAN);
    }
}
