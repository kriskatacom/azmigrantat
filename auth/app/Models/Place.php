<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class Place extends Model
{
    protected $table = 'places';

    protected $fillable = [
        'provider', 'provider_id', 'osm_type', 'osm_id', 'name', 'type',
        'country_code', 'country', 'region', 'county', 'city', 'latitude', 'longitude',
    ];

    protected $casts = [
        'osm_id' => 'integer',
        'latitude' => 'float',
        'longitude' => 'float',
    ];
}
