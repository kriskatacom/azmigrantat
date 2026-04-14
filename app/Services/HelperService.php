<?php

namespace App\Services;

use App\Models\Translation;

class HelperService
{
    private static ?array $translations = null;

    public const AVAILABLE_LANGUAGES = [
        'bg' => ['name' => 'Български', 'flag' => '🇧🇬'],
        'en' => ['name' => 'English', 'flag' => '🇺🇸'],
        'de' => ['name' => 'Deutsch', 'flag' => '🇩🇪'],
        'fr' => ['name' => 'Français', 'flag' => '🇫🇷'],
        'it' => ['name' => 'Italiano', 'flag' => '🇮🇹'],
        'es' => ['name' => 'Español', 'flag' => '🇪🇸'],
        'nl' => ['name' => 'Nederlands', 'flag' => '🇳🇱'],
        'gr' => ['name' => 'Ελληνικά', 'flag' => '🇬🇷'],
        'tr' => ['name' => 'Türkçe', 'flag' => '🇹🇷'],
        'ro' => ['name' => 'Română', 'flag' => '🇷🇴'],
        'ru' => ['name' => 'Русский', 'flag' => '🇷🇺'],
        'pl' => ['name' => 'Polski', 'flag' => '🇵🇱'],
        'pt' => ['name' => 'Português', 'flag' => '🇵🇹'],
        'hu' => ['name' => 'Magyar', 'flag' => '🇭🇺'],
        'cz' => ['name' => 'Čeština', 'flag' => '🇨🇿'],
        'sk' => ['name' => 'Slovenčina', 'flag' => '🇸🇰'],
        'at' => ['name' => 'Österreich', 'flag' => '🇦🇹'],
        'be' => ['name' => 'België', 'flag' => '🇧🇪'],
        'dk' => ['name' => 'Dansk', 'flag' => '🇩🇰'],
        'fi' => ['name' => 'Suomi', 'flag' => '🇫🇮'],
        'se' => ['name' => 'Svenska', 'flag' => '🇸🇪'],
        'no' => ['name' => 'Norsk', 'flag' => '🇳🇴'],
        'ch' => ['name' => 'Schweiz', 'flag' => '🇨🇭'],
        'ua' => ['name' => 'Українська', 'flag' => '🇺🇦'],
        'hr' => ['name' => 'Hrvatski', 'flag' => '🇭🇷'],
        'rs' => ['name' => 'Српски', 'flag' => '🇷🇸'],
        'si' => ['name' => 'Slovenščina', 'flag' => '🇸🇮'],
        'lt' => ['name' => 'Lietuvių', 'flag' => '🇱🇹'],
        'lv' => ['name' => 'Latviešu', 'flag' => '🇱🇻'],
        'ee' => ['name' => 'Eesti', 'flag' => '🇪🇪'],
        'cy' => ['name' => 'Кύπρος', 'flag' => '🇨🇾'],
    ];

    public static function icon(string $name, string $class = "w-6 h-6"): void
    {
        $filePath = BASE_PATH . "/app/Icons/{$name}.php";

        if (file_exists($filePath)) {
            echo '<span class="' . htmlspecialchars($class) . ' inline-flex items-center justify-center">';
            include $filePath;
            echo '</span>';
        } else {
            if (strpos($name, 'fa-') === 0) {
                echo '<i class="fa-solid ' . htmlspecialchars($name) . ' ' . htmlspecialchars($class) . '"></i>';
            }
        }
    }

    public static function navLinkClasses(string $path): string
    {
        $currentUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        if (strpos($currentUri, '/public') === 0) {
            $currentUri = substr($currentUri, 7);
        }

        $supportedCodes = implode('|', array_keys(self::AVAILABLE_LANGUAGES));
        $cleanCurrentUri = preg_replace("#^/($supportedCodes)\b#", '', $currentUri) ?: '/';
        $cleanCurrentUri = rtrim($cleanCurrentUri, '/') ?: '/';

        $cleanPath = rtrim($path, '/') ?: '/';

        $base = "whitespace-nowrap md:text-lg transition-colors duration-200 px-5 py-2 rounded-full text-primary-light";

        if ($cleanCurrentUri === $cleanPath) {
            return "{$base} bg-primary-dark";
        }
        return "{$base} hover:bg-primary-dark";
    }

    public static function isHome(): bool
    {
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $uri = trim($uri, '/');

        return $uri === '' || array_key_exists($uri, self::AVAILABLE_LANGUAGES);
    }

    public static function trans(string $key): string
    {
        if (self::$translations === null) {
            $lang = $_SESSION['lang'] ?? 'bg';
            // Адаптирано за новия модел Translation
            self::$translations = Translation::where('lang_code', $lang)
                ->pluck('translation_value', 'translation_key')
                ->toArray();
        }

        return self::$translations[$key] ?? $key;
    }

    public static function langUrl($path = null, $targetLang = null): string
    {
        if ($path === null) {
            $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        }

        $supportedCodes = implode('|', array_keys(self::AVAILABLE_LANGUAGES));
        $cleanPath = preg_replace('/^\/(' . $supportedCodes . ')\b/', '', $path);
        $cleanPath = rtrim($cleanPath, '/') ?: '/';

        if ($targetLang === 'bg') {
            return $cleanPath;
        }

        return '/' . $targetLang . ($cleanPath === '/' ? '' : $cleanPath);
    }

    public static function initLanguage(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $parts = explode('/', trim($uri, '/'));
        $firstPart = $parts[0] ?? '';

        if (array_key_exists($firstPart, self::AVAILABLE_LANGUAGES)) {
            $_SESSION['lang'] = $firstPart;
        } else {
            $_SESSION['lang'] = 'bg';
        }
    }

    public static function url(string $path): string
    {
        $lang = $_SESSION['lang'] ?? 'bg';
        $path = ltrim($path, '/');

        if ($lang === 'bg') {
            return "/{$path}";
        }

        return "/{$lang}/{$path}";
    }

    public static function getLangFromUrl(): string
    {
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $parts = explode('/', trim($uri, '/'));
        $firstPart = $parts[0] ?? '';

        if (array_key_exists($firstPart, self::AVAILABLE_LANGUAGES)) {
            return $firstPart;
        }

        return 'bg';
    }

    public static function getImage(?string $path, string $default = '/assets/images/no-image.png'): string
    {
        $publicRoot = dirname(__DIR__, 2) . '/public';
        $absolutePath = $publicRoot . $path;

        if (!empty($path) && file_exists($absolutePath) && is_file($absolutePath)) {
            return $path;
        }

        return $default;
    }

    public static function slug(string $text): string
    {
        $cyr = ['а', 'б', 'в', 'г', 'д', 'е', 'ж', 'з', 'и', 'й', 'к', 'л', 'м', 'н', 'о', 'п', 'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ъ', 'ь', 'ю', 'я'];
        $lat = ['a', 'b', 'v', 'g', 'd', 'e', 'zh', 'z', 'i', 'y', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'f', 'h', 'ts', 'ch', 'sh', 'sht', 'a', 'y', 'yu', 'ya'];

        $text = mb_strtolower($text);
        $text = str_replace($cyr, $lat, $text);
        $text = preg_replace('/[^a-z0-9\s-]/', '', $text);
        $text = preg_replace('/[\s-]+/', ' ', $text);
        $text = trim($text);
        $text = str_replace(' ', '-', $text);

        return $text;
    }

    public static function getTranslation(?array $item, string $field, string $entity = null): string
    {
        if (!$item) {
            return '';
        }

        $lang = $_SESSION['lang'] ?? 'bg';

        if ($lang === 'bg') {
            return $item[$field] ?? '';
        }

        if (!isset($item['id'])) {
            return $item[$field] ?? '';
        }

        $entityType = $entity ?? $item['entity_type'] ?? 'country';

        $key = "{$entityType}_{$item['id']}_{$field}";
        $translatedValue = self::trans($key);

        return ($translatedValue !== $key) ? $translatedValue : ($item[$field] ?? '');
    }

    public static function formatUrl(string $url): string
    {
        if (empty($url)) return '';

        if (str_starts_with($url, '/') || str_starts_with($url, '#') || preg_match('/^https?:\/\//i', $url)) {
            return $url;
        }

        if (str_starts_with($url, '//')) {
            return $url;
        }

        return 'https://' . $url;
    }

    public static function isExternalLink(string $url): bool
    {
        if (empty($url) || str_starts_with($url, '/') || str_starts_with($url, '#')) {
            return false;
        }

        $myHost = str_replace('www.', '', $_SERVER['HTTP_HOST'] ?? '');

        $formattedUrl = self::formatUrl($url);
        $linkHost = parse_url($formattedUrl, PHP_URL_HOST);

        if (empty($linkHost)) return false;

        $linkHost = str_replace('www.', '', $linkHost);

        return $linkHost !== $myHost;
    }
}
