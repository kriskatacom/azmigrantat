<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OauthAccessToken extends Model
{
    protected $table = 'oauth_access_tokens';

    public $timestamps = false;

    protected $fillable = [
        'token',
        'user_id',
        'app_id',
        'expires_at',
    ];

    protected $hidden = [
        'token',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'app_id' => 'integer',
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function application()
    {
        return $this->belongsTo(OauthApp::class, 'app_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at === null || $this->expires_at->isPast();
    }

    public static function hashPlainToken(string $plainToken): string
    {
        return hash('sha256', $plainToken);
    }

    public static function issue(int $userId, int $appId, string $expiresAt): string
    {
        $plainToken = bin2hex(random_bytes(40));

        self::create([
            'token' => self::hashPlainToken($plainToken),
            'user_id' => $userId,
            'app_id' => $appId,
            'expires_at' => $expiresAt,
        ]);

        return $plainToken;
    }

    public static function findByPlainToken(string $plainToken): ?self
    {
        $plainToken = trim($plainToken);

        if ($plainToken === '') {
            return null;
        }

        $hash = self::hashPlainToken($plainToken);
        $accessToken = self::query()
            ->where('token', $hash)
            ->with('user')
            ->first();

        if ($accessToken) {
            return $accessToken;
        }

        $legacy = self::query()
            ->where('token', $plainToken)
            ->with('user')
            ->first();

        if (!$legacy) {
            return null;
        }

        $legacy->token = $hash;
        $legacy->save();

        return $legacy->load('user');
    }

    public static function userFromRequest(): ?User
    {
        $authorization = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

        if (!preg_match('/Bearer\s+(\S+)/i', $authorization, $matches)) {
            return null;
        }

        $accessToken = self::findByPlainToken($matches[1]);

        if (
            !$accessToken ||
            $accessToken->isExpired() ||
            !$accessToken->user ||
            !$accessToken->user->is_active
        ) {
            return null;
        }

        return $accessToken->user;
    }
}
