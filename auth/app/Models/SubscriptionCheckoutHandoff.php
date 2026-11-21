<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class SubscriptionCheckoutHandoff extends Model
{
    protected $table = 'subscription_checkout_handoffs';

    protected $fillable = [
        'public_id',
        'token_hash',
        'user_id',
        'plan_key',
        'status',
        'stripe_account_id',
        'stripe_price_id',
        'stripe_session_id',
        'stripe_subscription_id',
        'play_external_transaction_token',
        'expires_at',
        'completed_at',
    ];

    protected $hidden = [
        'token_hash',
        'play_external_transaction_token',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'completed_at' => 'datetime',
    ];
}

