<?php

namespace App\Core;

class Redirect
{
    public static function to(string $url): void
    {
        $url = trim($url);

        if (!preg_match('~^(?:f|ht)tps?://~i', $url) && !str_starts_with($url, '/')) {
            $url = '/' . $url;
        }

        header("Location: $url");
        exit;
    }

    public static function back(): void
    {
        $referer = $_SERVER['HTTP_REFERER'] ?? '/';
        self::to($referer);
    }

    public static function with(string $url, string $type, string $message): void
    {
        Session::setFlash($type, $message);
        self::to($url);
    }

    public static function withInput(string $url, array $data, string $errorType = 'error', string $errorMessage = ''): void
    {
        Session::setOld($data);
        if (!empty($errorMessage)) {
            Session::setFlash($errorType, $errorMessage);
        }
        self::to($url);
    }
}
