<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Company extends Model
{
    use SoftDeletes;

    protected $table = 'companies';

    protected $fillable = [
        'name',
        'slug',
        'excerpt',
        'description',
        'your_location',
        'google_map',
        'company_slogan',
        'sort_order',
        'city_id',
        'category_id',
        'services_description',
        'facebook_page_link',
        'website_link',
        'email',
        'phone',
        'address',
        'working_time',
        'is_active',
        'options'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
        'city_id' => 'integer',
        'category_id' => 'integer',
        'options' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class, 'city_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(BusinessCategory::class, 'category_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order', 'asc')->orderBy('name', 'asc');
    }

    public function getProfileImageAttribute(): string
    {
        return $this->options['image_url'] ?? '/assets/img/default-company.jpg';
    }

    public function getOfferImageUrlAttribute(): ?string
    {
        return $this->options['offer_image_url'] ?? null;
    }

    public function getAdsImageUrlAttribute(): ?string
    {
        return $this->options['ads_image_url'] ?? null;
    }

    public function getAdditionalImagesAttribute(): array
    {
        return $this->options['additional_images'] ?? [];
    }

    public function hasWorkingTime(): bool
    {
        return !empty($this->working_time);
    }
    
    public function services()
    {
        return $this->hasMany(CompanyService::class, 'company_id')->orderBy('sort_order');
    }
}
