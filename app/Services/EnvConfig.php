<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\EnvVariable;
use Throwable;

final class EnvConfig
{
    public const SOURCE_DEVELOPMENT = 'development';
    public const SOURCE_PRODUCTION = 'production';

    /** @var list<string> */
    public const FILE_ONLY_KEYS = [
        'DB_DRIVER',
        'DB_HOST',
        'DB_PORT',
        'DB_NAME',
        'DB_USER',
        'DB_PASS',
        'DB_CHARSET',
        'DB_COLLATION',
        'DATABASE_ADMIN_EMAIL',
        'DATABASE_ADMIN_PASSWORD',
        'MIGRATION_PASSWORD',
        'APP_ENV',
    ];

    private static bool $applied = false;

    public static function isProduction(): bool
    {
        return self::source() === self::SOURCE_PRODUCTION;
    }

    public static function source(): string
    {
        $raw = AppSetting::getValue(AppSetting::ENV_SOURCE, self::SOURCE_DEVELOPMENT);

        return $raw === self::SOURCE_PRODUCTION
            ? self::SOURCE_PRODUCTION
            : self::SOURCE_DEVELOPMENT;
    }

    public static function apply(): void
    {
        if (self::$applied) {
            return;
        }

        self::$applied = true;

        try {
            self::syncCatalog();

            $useProd = self::isProduction();
            $rows = EnvVariable::query()->orderBy('sort_order')->get();
        } catch (Throwable) {
            return;
        }

        foreach ($rows as $row) {
            $key = (string) $row->var_key;
            if ($key === '' || in_array($key, self::FILE_ONLY_KEYS, true)) {
                continue;
            }

            $value = $useProd ? (string) ($row->prod_value ?? '') : (string) ($row->dev_value ?? '');
            self::put($key, $value);
        }
    }

    public static function syncCatalog(): void
    {
        $order = 0;

        foreach (self::definitions() as $definition) {
            $order++;
            $key = $definition['key'];
            $existing = EnvVariable::query()->where('var_key', $key)->first();

            [$dev, $prod] = self::defaultPair($definition);

            if ($existing) {
                $existing->fill([
                    'label' => $definition['label'],
                    'group_name' => $definition['group'],
                    'sort_order' => $order,
                    'is_secret' => $definition['secret'],
                ]);

                if (trim((string) $existing->dev_value) === '') {
                    $existing->dev_value = $dev;
                }

                if (trim((string) $existing->prod_value) === '') {
                    $existing->prod_value = $prod;
                }

                if ($existing->isDirty()) {
                    $existing->save();
                }

                continue;
            }

            EnvVariable::query()->create([
                'var_key' => $key,
                'label' => $definition['label'],
                'group_name' => $definition['group'],
                'sort_order' => $order,
                'is_secret' => $definition['secret'],
                'dev_value' => $dev,
                'prod_value' => $prod,
            ]);
        }
    }

    /**
     * @return list<array{
     *     key: string,
     *     label: string,
     *     group: string,
     *     secret: bool,
     *     mode_flag?: bool,
     *     generate?: bool,
     *     default?: string,
     *     prod_default?: string
     * }>
     */
    public static function definitions(): array
    {
        $papagalAddress = 'ул. Цар Симеон 14, 3400 Монтана, България';
        $officeAddress = 'бул. Христо Ботев 69, 3400 Монтана, България';
        $manager = 'Алеко Валентинов Начов';

        return [
            ['key' => 'SMTP_HOST', 'label' => 'SMTP хост', 'group' => 'Имейл (SMTP)', 'secret' => false, 'default' => 'mail.kriskata.com'],
            ['key' => 'SMTP_AUTH', 'label' => 'SMTP автентикация', 'group' => 'Имейл (SMTP)', 'secret' => false, 'default' => 'true'],
            ['key' => 'SMTP_USER', 'label' => 'SMTP потребител', 'group' => 'Имейл (SMTP)', 'secret' => false, 'default' => 'info@kriskata.com'],
            ['key' => 'SMTP_PASS', 'label' => 'SMTP парола', 'group' => 'Имейл (SMTP)', 'secret' => true],
            ['key' => 'SMTP_SECURE', 'label' => 'SMTP криптиране (tls/ssl)', 'group' => 'Имейл (SMTP)', 'secret' => false, 'default' => 'tls'],
            ['key' => 'SMTP_PORT', 'label' => 'SMTP порт', 'group' => 'Имейл (SMTP)', 'secret' => false, 'default' => '587'],
            ['key' => 'SMTP_DOMAIN', 'label' => 'SMTP домейн / HELO', 'group' => 'Имейл (SMTP)', 'secret' => false, 'default' => 'kriskata.com'],

            ['key' => 'SMSAPI_TOKEN', 'label' => 'SMSAPI токен', 'group' => 'SMS и WhatsApp', 'secret' => true],
            ['key' => 'SMSAPI_BASE_URL', 'label' => 'SMSAPI базов URL', 'group' => 'SMS и WhatsApp', 'secret' => false, 'default' => 'https://smsapi.io'],
            ['key' => 'SMSAPI_FROM', 'label' => 'SMSAPI подател', 'group' => 'SMS и WhatsApp', 'secret' => false, 'default' => '1511'],
            ['key' => 'WHATSAPP_ACCESS_TOKEN', 'label' => 'WhatsApp access token', 'group' => 'SMS и WhatsApp', 'secret' => true, 'default' => 'demo-whatsapp-token'],
            ['key' => 'WHATSAPP_PHONE_NUMBER_ID', 'label' => 'WhatsApp phone number ID', 'group' => 'SMS и WhatsApp', 'secret' => false, 'default' => '000000000000000'],
            ['key' => 'WHATSAPP_TEMPLATE_NAME', 'label' => 'WhatsApp template', 'group' => 'SMS и WhatsApp', 'secret' => false, 'default' => 'phone_verify'],
            ['key' => 'WHATSAPP_TEMPLATE_LANGUAGE', 'label' => 'WhatsApp език на template', 'group' => 'SMS и WhatsApp', 'secret' => false, 'default' => 'bg'],
            ['key' => 'WHATSAPP_GRAPH_VERSION', 'label' => 'WhatsApp Graph версия', 'group' => 'SMS и WhatsApp', 'secret' => false, 'default' => 'v22.0'],
            ['key' => 'PHONE_VERIFY_PEPPER', 'label' => 'Pepper за телефонен код', 'group' => 'SMS и WhatsApp', 'secret' => true, 'generate' => true],

            ['key' => 'B2_KEY_ID', 'label' => 'Backblaze key ID', 'group' => 'Файлове (Backblaze)', 'secret' => false],
            ['key' => 'B2_APPLICATION_KEY', 'label' => 'Backblaze application key', 'group' => 'Файлове (Backblaze)', 'secret' => true],
            ['key' => 'B2_BUCKET', 'label' => 'Backblaze bucket', 'group' => 'Файлове (Backblaze)', 'secret' => false, 'default' => 'azmigrantat--bucket'],
            ['key' => 'B2_ENDPOINT', 'label' => 'Backblaze endpoint', 'group' => 'Файлове (Backblaze)', 'secret' => false, 'default' => 'https://s3.eu-central-003.backblazeb2.com'],
            ['key' => 'B2_REGION', 'label' => 'Backblaze регион', 'group' => 'Файлове (Backblaze)', 'secret' => false, 'default' => 'eu-central-003'],
            ['key' => 'B2_CDN_BASE_URL', 'label' => 'Backblaze CDN URL', 'group' => 'Файлове (Backblaze)', 'secret' => false, 'default' => 'https://cdn.azmigrantat.com'],
            ['key' => 'B2_USE_PROXY', 'label' => 'Backblaze през прокси', 'group' => 'Файлове (Backblaze)', 'secret' => false, 'default' => 'false'],

            ['key' => 'ETOME_BASE_URL', 'label' => 'Базов URL на приложението', 'group' => 'Realtime и сигурност', 'secret' => false, 'default' => 'http://localhost:8000', 'prod_default' => 'https://users.azmigrantat.com'],
            ['key' => 'REALTIME_SERVER_URL', 'label' => 'Realtime сървър', 'group' => 'Realtime и сигурност', 'secret' => false, 'default' => 'http://127.0.0.1:3001', 'prod_default' => 'https://realtime.azmigrantat.com'],
            ['key' => 'REALTIME_INTERNAL_SECRET', 'label' => 'Realtime вътрешен секрет', 'group' => 'Realtime и сигурност', 'secret' => true, 'generate' => true],
            ['key' => 'CARD_ENCRYPTION_KEY', 'label' => 'Ключ за криптиране на карти', 'group' => 'Realtime и сигурност', 'secret' => true, 'generate' => true],
            ['key' => 'PASSWORD_RESET_PEPPER', 'label' => 'Pepper за reset на парола', 'group' => 'Realtime и сигурност', 'secret' => true, 'generate' => true],

            ['key' => 'GOOGLE_WEB_CLIENT_ID', 'label' => 'Google Web Client ID', 'group' => 'Google', 'secret' => false],

            ['key' => 'COMPANY_NAME', 'label' => 'Търговско име', 'group' => 'Компания', 'secret' => false, 'default' => 'Аз мигрантът'],
            ['key' => 'COMPANY_LEGAL_NAME', 'label' => 'Юридическо име', 'group' => 'Компания', 'secret' => false, 'default' => 'АЗ МИГРАНТЪТ ЕООД'],
            ['key' => 'COMPANY_LEGAL_FORM', 'label' => 'Правна форма', 'group' => 'Компания', 'secret' => false, 'default' => 'Еднолично дружество с ограничена отговорност (ЕООД)'],
            ['key' => 'COMPANY_STATUS', 'label' => 'Статус', 'group' => 'Компания', 'secret' => false, 'default' => 'Активен'],
            ['key' => 'COMPANY_EIK', 'label' => 'ЕИК / ПИК', 'group' => 'Компания', 'secret' => false, 'default' => '206860375'],
            ['key' => 'COMPANY_VAT', 'label' => 'ДДС номер', 'group' => 'Компания', 'secret' => false, 'default' => 'BG206860375'],
            ['key' => 'COMPANY_VAT_REGISTERED_AT', 'label' => 'ДДС регистрация', 'group' => 'Компания', 'secret' => false, 'default' => '09.08.2023 (чл. 100 ал. 1 ЗДДС)'],
            ['key' => 'COMPANY_REGISTERED_AT', 'label' => 'Дата на регистрация', 'group' => 'Компания', 'secret' => false, 'default' => '14.03.2022'],
            ['key' => 'COMPANY_CAPITAL', 'label' => 'Капитал', 'group' => 'Компания', 'secret' => false, 'default' => '5 €'],
            ['key' => 'COMPANY_ADDRESS', 'label' => 'Седалище (Търговски регистър)', 'group' => 'Компания', 'secret' => false, 'default' => $papagalAddress],
            ['key' => 'COMPANY_OFFICE_ADDRESS', 'label' => 'Адрес на офис', 'group' => 'Компания', 'secret' => false, 'default' => $officeAddress],
            ['key' => 'COMPANY_MANAGER', 'label' => 'Управител', 'group' => 'Компания', 'secret' => false, 'default' => $manager],
            ['key' => 'COMPANY_OWNER', 'label' => 'Едноличен собственик', 'group' => 'Компания', 'secret' => false, 'default' => $manager],
            ['key' => 'COMPANY_PHONE', 'label' => 'Централен офис телефон', 'group' => 'Компания', 'secret' => false, 'default' => '+359 96 593 333'],
            ['key' => 'COMPANY_EMAIL', 'label' => 'Имейл за контакт', 'group' => 'Компания', 'secret' => false, 'default' => 'i.the.migrant@gmail.com'],
            ['key' => 'COMPANY_WEBSITE', 'label' => 'Уебсайт', 'group' => 'Компания', 'secret' => false, 'default' => 'https://azmigrantat.com'],
            ['key' => 'HOME_REDIRECT_URL', 'label' => 'Пренасочване от началната страница', 'group' => 'Компания', 'secret' => false, 'default' => 'https://azmigrantat.com'],

            ['key' => 'APP_TEST_MODE', 'label' => 'Тестов режим за вход (код 123456)', 'group' => 'Режим', 'secret' => false, 'mode_flag' => true],
            ['key' => 'PASSWORD_RESET_TEST_MODE', 'label' => 'Тестов режим за забравена парола', 'group' => 'Режим', 'secret' => false, 'mode_flag' => true],
            ['key' => 'DEBUG', 'label' => 'Debug', 'group' => 'Режим', 'secret' => false, 'mode_flag' => true],
            ['key' => 'SESSION_NAME', 'label' => 'Име на сесията', 'group' => 'Режим', 'secret' => false, 'default' => 'AZMIGRANTAT_SESS'],
        ];
    }

    public static function pagePassword(): string
    {
        return (string) (
            $_ENV['MIGRATION_PASSWORD']
            ?? getenv('MIGRATION_PASSWORD')
            ?: ''
        );
    }

    public static function passwordMatches(string $provided): bool
    {
        $expected = self::pagePassword();

        return $expected !== '' && hash_equals($expected, $provided);
    }

    /**
     * @param array{
     *     key: string,
     *     mode_flag?: bool,
     *     generate?: bool,
     *     default?: string,
     *     prod_default?: string
     * } $definition
     * @return array{0: string, 1: string}
     */
    private static function defaultPair(array $definition): array
    {
        $fromFile = self::fileValue($definition['key']);
        $devDefault = (string) ($definition['default'] ?? '');
        $prodDefault = (string) ($definition['prod_default'] ?? $devDefault);

        if (!empty($definition['mode_flag'])) {
            return [
                $fromFile !== '' ? $fromFile : 'true',
                'false',
            ];
        }

        $dev = $fromFile !== '' ? $fromFile : $devDefault;
        $prod = $fromFile !== '' ? $fromFile : $prodDefault;

        if (!empty($definition['generate'])) {
            if ($dev === '' && $prod === '') {
                $shared = self::randomSecret();
                $dev = $shared;
                $prod = $shared;
            } elseif ($dev === '') {
                $dev = $prod;
            } elseif ($prod === '') {
                $prod = $dev;
            }
        }

        return [$dev, $prod];
    }

    private static function randomSecret(): string
    {
        return bin2hex(random_bytes(32));
    }

    private static function fileValue(string $key): string
    {
        if (array_key_exists($key, $_ENV) && $_ENV[$key] !== null && (string) $_ENV[$key] !== '') {
            return (string) $_ENV[$key];
        }

        $value = getenv($key);

        return $value === false || $value === '' ? '' : (string) $value;
    }

    private static function put(string $key, string $value): void
    {
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
        putenv($key . '=' . $value);
    }
}
