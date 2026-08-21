<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OauthAccessToken extends Model
{
    protected $table = 'oauth_access_tokens';

    public $timestamps = false;

    protected $fillable = [
        'token',
        'refresh_token',
        'user_id',
        'app_id',
        'expires_at',
        'refresh_expires_at',
    ];

    protected $hidden = [
        'token',
        'refresh_token',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'app_id' => 'integer',
        'expires_at' => 'datetime',
        'refresh_expires_at' => 'datetime',
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

    public function isRefreshExpired(): bool
    {
        return $this->refresh_expires_at === null || $this->refresh_expires_at->isPast();
    }

    public static function hashPlainToken(string $plainToken): string
    {
        return hash('sha256', $plainToken);
    }

    /**
     * @return array{access_token: string, refresh_token: string}
     */
    public static function issue(
        int $userId,
        int $appId,
        string $expiresAt,
        ?string $refreshExpiresAt = null
    ): array {
        $plainAccess = bin2hex(random_bytes(40));
        $plainRefresh = bin2hex(random_bytes(40));

        self::create([
            'token' => self::hashPlainToken($plainAccess),
            'refresh_token' => self::hashPlainToken($plainRefresh),
            'user_id' => $userId,
            'app_id' => $appId,
            'expires_at' => $expiresAt,
            'refresh_expires_at' => $refreshExpiresAt
                ?? date('Y-m-d H:i:s', strtotime('+60 days')),
        ]);

        return [
            'access_token' => $plainAccess,
            'refresh_token' => $plainRefresh,
        ];
    }

    public static function findByRefreshToken(string $plainToken): ?self
    {
        $plainToken = trim($plainToken);

        if ($plainToken === '') {
            return null;
        }

        return self::query()
            ->where('refresh_token', self::hashPlainToken($plainToken))
            ->with('user')
            ->first();
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
        if (array_key_exists('_etome_bearer_user', $GLOBALS)) {
            $cached = $GLOBALS['_etome_bearer_user'];

            return $cached instanceof User ? $cached : null;
        }

        $authorization = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

        if (!preg_match('/Bearer\s+(\S+)/i', $authorization, $matches)) {
            $GLOBALS['_etome_bearer_user'] = null;
            return null;
        }

        $accessToken = self::findByPlainToken($matches[1]);

        if (
            !$accessToken ||
            $accessToken->isExpired() ||
            !$accessToken->user ||
            !$accessToken->user->is_active
        ) {
            $GLOBALS['_etome_bearer_user'] = null;
            return null;
        }

        return $GLOBALS['_etome_bearer_user'] = $accessToken->user;
    }
}
