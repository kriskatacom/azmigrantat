<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class SubscriptionRenewalChange extends Model
{
    protected $table = 'subscription_renewal_changes';

    protected $fillable = [
        'request_id',
        'user_id',
        'subscription_id',
        'stripe_subscription_id',
        'previous_auto_renewal',
        'requested_auto_renewal',
        'status',
        'error_code',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'subscription_id' => 'integer',
        'previous_auto_renewal' => 'boolean',
        'requested_auto_renewal' => 'boolean',
    ];
}
