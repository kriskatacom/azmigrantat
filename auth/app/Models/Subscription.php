<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    protected $table = 'subscriptions';

    protected $fillable = [
        'user_id', 'plan', 'stripe_customer_id', 'stripe_subscription_id',
        'stripe_price_id', 'status', 'cancel_at_period_end',
        'current_period_start', 'current_period_end',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'cancel_at_period_end' => 'boolean',
        'current_period_start' => 'datetime',
        'current_period_end' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
