<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class SubscriptionCancellationRequest extends Model
{
    protected $table = 'subscription_cancellation_requests';

    protected $fillable = [
        'request_id',
        'user_id',
        'subscription_id',
        'stripe_subscription_id',
        'status',
        'error_code',
    ];
}
