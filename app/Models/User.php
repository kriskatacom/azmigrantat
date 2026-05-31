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

    public static function getRoles(): array {
        return [self::ROLE_USER, self::ROLE_ADMIN, self::ROLE_MODERATOR];
    }

    public static function getGenders(): array {
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
        'role',
        'gender',
        'options',
        'profile_image',
        'bio',
        'last_login',
        'is_active'
    ];

    protected $hidden = [
        'password_hash',
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
            'total'         => (int) $stats->total,
            'admins'        => (int) $stats->admins,
            'users'         => (int) $stats->regulars,
            'active'        => (int) $stats->active,
            'inactive'      => (int) $stats->inactive,
            'logged_today'  => (int) $stats->logged_today,
            'trashed'       => (int) $stats->trashed,
            'activity_rate' => $stats->total > 0 ? round(($stats->active / $stats->total) * 100, 1) : 0
        ];
    }

    public function getStatusData(): array
    {
        return match ((int)$this->is_active) {
            self::STATUS_ACTIVE => [
                'label' => 'Активен',
                'color' => 'text-green-600',
                'dot'   => 'bg-green-500'
            ],
            default => [
                'label' => 'Неактивен',
                'color' => 'text-slate-400',
                'dot'   => 'bg-slate-300'
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
}