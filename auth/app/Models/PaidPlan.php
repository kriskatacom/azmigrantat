<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class PaidPlan extends Model
{
    public const KEY = 'paid';

    protected $table = 'paid_plans';

    protected $fillable = [
        'plan_key',
        'name',
        'amount_cents',
        'currency',
        'interval_unit',
        'interval_count',
        'stripe_account_id',
        'stripe_product_id',
        'stripe_price_id',
        'stripe_mode',
        'version',
        'is_active',
    ];

    protected $casts = [
        'amount_cents' => 'integer',
        'version' => 'integer',
        'interval_count' => 'integer',
        'is_active' => 'boolean',
    ];
}
