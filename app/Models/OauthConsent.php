<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OauthConsent extends Model
{
    protected $table = 'oauth_user_consents';

    protected $fillable = [
        'user_id',
        'app_id'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function application()
    {
        return $this->belongsTo(OauthApp::class, 'app_id');
    }
}
