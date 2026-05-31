<?php

namespace App\Helpers;

class SecurityHelper
{
    public static function csrfField(): string
    {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }

        return '<input type="hidden" name="csrf_token" value="' . $_SESSION['csrf_token'] . '">';
    }

    public static function spamFields(): string
    {
        $html = '<div style="display:none !important;">';
        $html .= '<input type="text" name="hp_website_url" value="" tabindex="-1" autocomplete="off">';
        $html .= '</div>';
        $html .= '<input type="hidden" name="form_load_time" value="' . time() . '">';

        return $html;
    }

    public static function checkCsrf(): bool
    {
        $sessionToken = $_SESSION['csrf_token'] ?? '';
        $postToken = $_POST['csrf_token'] ?? '';

        if (empty($sessionToken) || empty($postToken)) {
            return false;
        }

        return hash_equals($sessionToken, $postToken);
    }

    public static function checkSpam(): bool
    {
        if (!empty($_POST['hp_website_url'])) {
            error_log("Spam Blocked: Honeypot filled by " . $_SERVER['REMOTE_ADDR']);
            return false;
        }

        $loadTime = (int) ($_POST['form_load_time'] ?? 0);
        if ($loadTime > 0) {
            $totalTime = time() - $loadTime;
            if ($totalTime < 2) {
                error_log("Spam Blocked: Form filled too fast ($totalTime sec) by " . $_SERVER['REMOTE_ADDR']);
                return false;
            }
        }

        return true;
    }
}
