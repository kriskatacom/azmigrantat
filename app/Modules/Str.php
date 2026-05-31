<?php

namespace App\Modules;

class Str
{
    public static function initial(?string $string, string $default = 'U'): string
    {
        if (empty(trim($string))) {
            return $default;
        }

        return mb_strtoupper(mb_substr($string, 0, 1, 'UTF-8'), 'UTF-8');
    }

    public static function limit(?string $value, int $limit = 100, string $end = '...'): string
    {
        if (mb_strlen($value, 'UTF-8') <= $limit) {
            return $value;
        }

        return rtrim(mb_substr($value, 0, $limit, 'UTF-8')) . $end;
    }
    
    public static function slug(?string $title, string $separator = '-'): string
    {
        if (empty($title)) {
            return '';
        }

        $cyrillic = [
            'а', 'б', 'в', 'г', 'д', 'е', 'ё', 'ж', 'з', 'и', 'й', 'к', 'л', 'м', 'н', 'о', 'п',
            'р', 'с', 'т', 'у', 'ф', 'х', 'ц', 'ч', 'ш', 'щ', 'ъ', 'ы', 'ь', 'э', 'ю', 'я',
            'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'Й', 'К', 'Л', 'М', 'Н', 'О', 'П',
            'Р', 'С', 'Т', 'У', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь', 'Э', 'Ю', 'Я'
        ];
        $latin = [
            'a', 'b', 'v', 'g', 'd', 'e', 'io', 'zh', 'z', 'i', 'y', 'k', 'l', 'm', 'n', 'o', 'p',
            'r', 's', 't', 'u', 'f', 'h', 'ts', 'ch', 'sh', 'shch', '', 'y', '', 'e', 'yu', 'ya',
            'a', 'b', 'v', 'g', 'd', 'e', 'io', 'zh', 'z', 'i', 'y', 'k', 'l', 'm', 'n', 'o', 'p',
            'r', 's', 't', 'u', 'f', 'h', 'ts', 'ch', 'sh', 'shch', '', 'y', '', 'e', 'yu', 'ya'
        ];

        $title = str_replace($cyrillic, $latin, $title);

        $title = mb_strtolower($title, 'UTF-8');

        $title = preg_replace('/[^a-z0-9]+/i', $separator, $title);

        $title = trim($title, $separator);
        $title = preg_replace('/' . preg_quote($separator) . '+/', $separator, $title);

        return $title;
    }
}
