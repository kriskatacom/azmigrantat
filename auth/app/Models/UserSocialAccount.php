<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserSocialAccount extends Model
{
    protected $table = 'user_social_accounts';

    protected $fillable = [
        'user_id',
        'provider',
        'provider_user_id',
        'email',
    ];

    public function user()
    {
        return $this->belongsTo(
            User::class,
            'user_id'
        );
    }
}
