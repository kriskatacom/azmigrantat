<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentMethod extends Model
{
    protected $table = 'payment_methods';

    protected $fillable = [
        'user_id',
        'brand',
        'last4',
        'exp_month',
        'exp_year',
        'holder_name',
        'pan_ciphertext',
        'is_default',
    ];

    protected $hidden = [
        'pan_ciphertext',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'exp_month' => 'integer',
        'exp_year' => 'integer',
        'is_default' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
