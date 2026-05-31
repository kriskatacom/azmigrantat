<?php

namespace App\Core;

class Session
{
    public function __construct()
    {
        self::start();
    }

    public static function start(?int $customLifetime = null): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            $sessionName = $_ENV['SESSION_NAME'] ?? 'KRISKATA_SESS';
            session_name($sessionName);

            session_set_cookie_params([
                'lifetime' => $customLifetime ?? 0,
                'path'     => '/',
                'domain'   => '',
                'secure'   => isset($_SERVER['HTTPS']) || ($_ENV['APP_ENV'] ?? '') === 'production',
                'httponly' => true,
                'samesite' => 'Lax'
            ]);

            session_start();
        }
    }

    public static function set(string $key, $value): void
    {
        self::start();
        $_SESSION[$key] = $value;
    }

    public static function get(string $key, $default = null)
    {
        self::start();
        return $_SESSION[$key] ?? $default;
    }

    public static function has(string $key): bool
    {
        self::start();
        return isset($_SESSION[$key]);
    }

    public static function remove(string $key): void
    {
        self::start();
        unset($_SESSION[$key]);
    }

    public static function setFlash(string $type, string $message): void
    {
        $flash = self::get('_flash', []);
        $flash[$type] = $message;
        self::set('_flash', $flash);
    }

    public static function getFlash(string $type): ?string
    {
        $flash = self::get('_flash', []);
        if (isset($flash[$type])) {
            $message = $flash[$type];
            unset($flash[$type]);
            self::set('_flash', $flash);
            return $message;
        }
        return null;
    }

    public static function setOld(array $data): void
    {
        self::set('_old', $data);
    }

    public static function getOld(string $key, $default = '')
    {
        $old = self::get('_old', []);
        return $old[$key] ?? $default;
    }

    public static function clearOld(): void
    {
        self::remove('_old');
    }

    public static function csrfToken(): string
    {
        if (!self::has('csrf_token')) {
            self::set('csrf_token', bin2hex(random_bytes(32)));
        }
        return self::get('csrf_token');
    }

    public static function destroy(): void
    {
        self::start();

        $_SESSION = [];

        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params["path"],
                $params["domain"],
                $params["secure"],
                $params["httponly"]
            );
        }

        session_destroy();
    }
}
