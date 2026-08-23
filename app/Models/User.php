<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Model
{
    const STATUS_ACTIVE = 1;
    const STATUS_INACTIVE = 0;

    const ROLE_ADMIN = 'admin';
    const ROLE_USER = 'user';
    const ROLE_MODERATOR = 'moderator';

    const GENDER_MALE = 'male';
    const GENDER_FEMALE = 'female';
    const GENDER_OTHER = 'other';

    public static function getRoles(): array
    {
        return [self::ROLE_USER, self::ROLE_ADMIN, self::ROLE_MODERATOR];
    }

    public static function getGenders(): array
    {
        return [self::GENDER_MALE, self::GENDER_FEMALE, self::GENDER_OTHER];
    }

    use SoftDeletes;

    protected $table = 'users';

    protected $fillable = [
        'email',
        'email_verified',
        'password_hash',
        'name',
        'username',
        'public_code',
        'role',
        'gender',
        'options',
        'profile_image',
        'bio',
        'last_login',
        'phone',
        'phone_verified_at',
        'phone_verification_hash',
        'phone_verification_expires_at',
        'phone_verification_sent_at',
        'phone_verification_phone',
        'two_factor_verified_at',
        'is_active',
        'password_reset_hash',
        'password_reset_expires_at',
        'password_reset_sent_at',
        'password_reset_attempts',
        'password_reset_locked_until',
    ];

    protected $hidden = [
        'password_hash',
        'password_reset_hash',
        'reset_token',
        'verification_token',
        'phone_verification_hash',
    ];

    protected $dateFormat = 'Y-m-d H:i:s.u';

    protected $dates = ['deleted_at', 'last_login'];

    protected $casts = [
        'is_active' => 'boolean',
        'last_login' => 'datetime',
        'email_verified' => 'boolean',
        'options' => 'array'
    ];

    public function setPasswordHashAttribute($value)
    {
        $this->attributes['password_hash'] = password_hash($value, PASSWORD_BCRYPT);
    }

    public function scopeAdmins($query)
    {
        return $query->where('role', 'admin');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public static function getDashboardStats(): array
    {
        $stats = self::selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
            SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as regulars,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive,
            SUM(CASE WHEN last_login >= CURDATE() THEN 1 ELSE 0 END) as logged_today,
            SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) as trashed
        ")
            ->withTrashed()
            ->first();

        return [
            'total' => (int) $stats->total,
            'admins' => (int) $stats->admins,
            'users' => (int) $stats->regulars,
            'active' => (int) $stats->active,
            'inactive' => (int) $stats->inactive,
            'logged_today' => (int) $stats->logged_today,
            'trashed' => (int) $stats->trashed,
            'activity_rate' => $stats->total > 0 ? round(($stats->active / $stats->total) * 100, 1) : 0
        ];
    }

    public function getStatusData(): array
    {
        return match ((int) $this->is_active) {
            self::STATUS_ACTIVE => [
                'label' => 'Активен',
                'color' => 'text-green-600',
                'dot' => 'bg-green-500'
            ],
            default => [
                'label' => 'Неактивен',
                'color' => 'text-slate-400',
                'dot' => 'bg-slate-300'
            ],
        };
    }

    public function getRoleData(): array
    {
        return match ($this->role) {
            self::ROLE_ADMIN => [
                'label' => 'Администратор',
                'class' => 'bg-purple-50 text-purple-600 border-purple-100'
            ],
            self::ROLE_MODERATOR => [
                'label' => 'Редактор',
                'class' => 'bg-amber-50 text-amber-600 border-amber-100'
            ],
            default => [
                'label' => 'Потребител',
                'class' => 'bg-blue-50 text-blue-600 border-blue-100'
            ],
        };
    }

    public function generateVerificationToken()
    {
        $this->verification_token = bin2hex(random_bytes(32));
        $this->save();
        return $this->verification_token;
    }

    public function isTwoFactorVerified(): bool
    {
        return isset($_SESSION['2fa_verified']) && $_SESSION['2fa_verified'] === true;
    }

    public function pushTokens()
    {
        return $this->hasMany(
            PushToken::class,
            'user_id'
        );
    }

    public function getProfileImageUrlAttribute(): ?string
    {
        $options = $this->options;

        if (!is_array($options)) {
            return null;
        }

        $image = $options['profile_image'] ?? null;

        return is_string($image) && trim($image) !== ''
            ? trim($image)
            : null;
    }

    public function getBioAttribute($value = null): ?string
    {
        $options = is_array($this->options) ? $this->options : [];
        $bio = $options['bio'] ?? null;

        return is_string($bio) && trim($bio) !== '' ? trim($bio) : null;
    }

    public function setBioAttribute($value): void
    {
        $options = is_array($this->options) ? $this->options : [];
        $bio = is_string($value) ? trim($value) : '';

        if ($bio === '') {
            unset($options['bio']);
        } else {
            $options['bio'] = $bio;
        }

        $this->options = $options;
    }

    public const PUBLIC_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public static function normalizePublicCode(?string $code): string
    {
        return strtoupper(
            preg_replace('/[^A-Za-z0-9]/', '', (string) $code) ?? ''
        );
    }

    public static function formatPublicCode(string $code): string
    {
        $normalized = self::normalizePublicCode($code);

        if (strlen($normalized) === 8) {
            return substr($normalized, 0, 4) . '-' . substr($normalized, 4);
        }

        return $normalized;
    }

    public static function findByPublicCode(string $code): ?self
    {
        $normalized = self::normalizePublicCode($code);

        if (strlen($normalized) !== 8) {
            return null;
        }

        return self::query()
            ->where('public_code', $normalized)
            ->first();
    }

    public function ensurePublicCode(): string
    {
        $existing = self::normalizePublicCode($this->public_code ?? '');

        if (strlen($existing) === 8) {
            return $existing;
        }

        do {
            $code = '';
            $alphabet = self::PUBLIC_CODE_ALPHABET;
            $max = strlen($alphabet) - 1;

            for ($i = 0; $i < 8; $i++) {
                $code .= $alphabet[random_int(0, $max)];
            }
        } while (self::query()->where('public_code', $code)->exists());

        $this->public_code = $code;
        $this->save();

        return $code;
    }

    public function formattedPublicCode(): string
    {
        return self::formatPublicCode($this->ensurePublicCode());
    }

    public function toChatUserArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'username' => $this->username,
            'public_code' => $this->formattedPublicCode(),
            'profile_image' => $this->profile_image_url,
            'is_active' => (bool) $this->is_active,
        ];
    }

    public function toMobileUserArray(): array
    {
        $image = $this->profile_image_url;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'firstName' => $this->first_name,
            'lastName' => $this->last_name,
            'username' => $this->username,
            'public_code' => $this->formattedPublicCode(),
            'email' => $this->email,
            'role' => $this->role,
            'gender' => $this->gender,
            'phone' => $this->phone,
            'phone_verified' => (bool) $this->phone_verified_at,
            'country' => $this->country,
            'city' => $this->city,
            'address' => $this->address,
            'bio' => $this->bio,
            'profile_image' => $image,
            'avatar' => $image,
            'is_active' => (bool) $this->is_active,
            'auto_renewal' => $this->wantsAutoRenewal(),
            'totp_enabled' => $this->totpEnabled(),
            'has_password' => $this->hasPassword(),
            'has_pin' => $this->hasLoginPin(),
            'pin_login_enabled' => $this->pinLoginEnabled(),
            'email_login_enabled' => $this->emailLoginEnabled(),
            'phone_visible' => $this->phoneVisible(),
        ];
    }

    public function phoneVisible(): bool
    {
        $options = is_array($this->options) ? $this->options : [];

        return filter_var($options['phone_visible'] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    public function setPhoneVisible(bool $visible): void
    {
        $options = is_array($this->options) ? $this->options : [];
        $options['phone_visible'] = $visible;
        $this->options = $options;
        $this->save();
    }

    /**
     * @param array{
     *   is_self?: bool,
     *   blocked_by_me?: bool,
     *   blocked_me?: bool
     * } $context
     * @return array<string, mixed>
     */
    public function toPublicProfileArray(array $context = []): array
    {
        $isSelf = (bool) ($context['is_self'] ?? false);
        $blockedByMe = (bool) ($context['blocked_by_me'] ?? false);
        $blockedMe = (bool) ($context['blocked_me'] ?? false);
        $phoneVisible = $this->phoneVisible();
        $phoneVerified = (bool) $this->phone_verified_at;
        $showPhone = $phoneVerified
            && is_string($this->phone)
            && $this->phone !== ''
            && ($isSelf || ($phoneVisible && !$blockedByMe && !$blockedMe));

        $location = trim(implode(', ', array_filter([
            is_string($this->city) ? trim($this->city) : '',
            is_string($this->country) ? trim($this->country) : '',
        ])));

        return [
            'id' => $this->id,
            'is_self' => $isSelf,
            'name' => $this->name,
            'firstName' => $this->first_name,
            'lastName' => $this->last_name,
            'username' => $this->username,
            'public_code' => $this->formattedPublicCode(),
            'profile_image' => $this->profile_image_url,
            'gender' => $this->gender,
            'city' => $this->city,
            'country' => $this->country,
            'location' => $location !== '' ? $location : null,
            'bio' => $this->bio,
            'is_active' => (bool) $this->is_active,
            'phone_visible' => $phoneVisible,
            'phone_verified' => $phoneVerified,
            'phone' => $showPhone ? $this->phone : null,
            'email' => $isSelf ? $this->email : null,
            'address' => $isSelf ? $this->address : null,
            'is_blocked_by_me' => $blockedByMe,
            'is_blocked_me' => $blockedMe,
            'can_contact' => !$isSelf && !$blockedByMe && !$blockedMe && (bool) $this->is_active,
        ];
    }

    public function wantsAutoRenewal(): bool
    {
        $options = is_array($this->options) ? $this->options : [];

        return filter_var($options['auto_renewal'] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    public function setAutoRenewal(bool $enabled): void
    {
        $options = is_array($this->options) ? $this->options : [];
        $options['auto_renewal'] = $enabled;
        $this->options = $options;
        $this->save();
    }

    public function hasPassword(): bool
    {
        $hash = $this->getAttributes()['password_hash'] ?? '';

        return is_string($hash) && $hash !== '';
    }

    public function hasLoginPin(): bool
    {
        $options = is_array($this->options) ? $this->options : [];
        $hash = $options['login_pin_hash'] ?? '';

        return is_string($hash) && $hash !== '';
    }

    public function pinLoginEnabled(): bool
    {
        $options = is_array($this->options) ? $this->options : [];

        return $this->hasLoginPin()
            && filter_var($options['login_pin_enabled'] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    public function emailLoginEnabled(): bool
    {
        $options = is_array($this->options) ? $this->options : [];

        return filter_var($options['email_login_enabled'] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    public function totpEnabled(): bool
    {
        $options = is_array($this->options) ? $this->options : [];

        return filter_var($options['totp_enabled'] ?? false, FILTER_VALIDATE_BOOLEAN)
            && !empty($options['totp_secret']);
    }

    public function totpSecret(): ?string
    {
        $options = is_array($this->options) ? $this->options : [];
        $secret = $options['totp_secret'] ?? null;

        return is_string($secret) && $secret !== '' ? $secret : null;
    }

    public function totpPendingSecret(): ?string
    {
        $options = is_array($this->options) ? $this->options : [];
        $secret = $options['totp_pending_secret'] ?? null;

        return is_string($secret) && $secret !== '' ? $secret : null;
    }

    public function setTotpPendingSecret(string $ciphertext): void
    {
        $options = is_array($this->options) ? $this->options : [];
        $options['totp_pending_secret'] = $ciphertext;
        $this->options = $options;
        $this->save();
    }

    public function enableTotp(string $ciphertext): void
    {
        $options = is_array($this->options) ? $this->options : [];
        $options['totp_secret'] = $ciphertext;
        $options['totp_enabled'] = true;
        unset($options['totp_pending_secret']);
        unset($options['family_proximity']);
        $this->options = $options;
        $this->save();
    }

    public function clearTotp(): void
    {
        $options = is_array($this->options) ? $this->options : [];
        unset($options['totp_secret'], $options['totp_pending_secret'], $options['totp_enabled'], $options['family_proximity']);
        $this->options = $options;
        $this->save();
    }
}
