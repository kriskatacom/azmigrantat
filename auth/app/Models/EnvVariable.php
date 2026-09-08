<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EnvVariable extends Model
{
    protected $table = 'env_variables';

    protected $fillable = [
        'var_key',
        'label',
        'group_name',
        'sort_order',
        'is_secret',
        'dev_value',
        'prod_value',
    ];

    protected $casts = [
        'is_secret' => 'boolean',
        'sort_order' => 'integer',
    ];
}
