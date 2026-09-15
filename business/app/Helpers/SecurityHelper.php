<?php

namespace App\Helpers;

class SecurityHelper
{
    public static function checkSpam(): bool
    {
        if (!empty($_POST['hp_website_url'])) {
            error_log("Spam Blocked: Honeypot filled by " . $_SERVER['REMOTE_ADDR']);
            return false;
        }

        $loadTime = (int)($_POST['form_load_time'] ?? 0);
        $totalTime = time() - $loadTime;

        if ($totalTime < 3) {
            error_log("Spam Blocked: Form filled too fast ($totalTime sec) by " . $_SERVER['REMOTE_ADDR']);
            return false;
        }

        return true;
    }

    public static function checkCsrf(): bool
    {
        $sessionToken = $_SESSION['csrf_token'] ?? '';
        $postToken = $_POST['csrf_token'] ?? '';

        return !empty($sessionToken) && hash_equals($sessionToken, $postToken);
    }
}