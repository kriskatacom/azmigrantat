<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingEvent extends Model
{
    public $timestamps = false;
    protected $table = 'billing_events';
    protected $fillable = ['stripe_event_id', 'event_type', 'processed_at'];
    protected $casts = ['processed_at' => 'datetime'];
}
