<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class PaidPlanPriceChange extends Model
{
    protected $table = 'paid_plan_price_changes';

    protected $fillable = [
        'paid_plan_id',
        'actor_user_id',
        'request_id',
        'old_amount_cents',
        'new_amount_cents',
        'old_stripe_account_id',
        'new_stripe_account_id',
        'old_stripe_product_id',
        'new_stripe_product_id',
        'old_stripe_price_id',
        'new_stripe_price_id',
        'stripe_mode',
        'status',
        'error_code',
    ];

    protected $casts = [
        'old_amount_cents' => 'integer',
        'new_amount_cents' => 'integer',
    ];
}

