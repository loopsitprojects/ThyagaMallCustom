<?php

namespace App\Models;

use App\Jobs\SendRestockEmails;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'brand_id',
        'merchant_id',
        'name',
        'slug',
        'sku',
        'short_description',
        'description',
        'regular_price',
        'sale_price',
        'stock_quantity',
        'low_stock_threshold',
        'rating_avg',
        'reviews_count',
        'is_featured',
        'is_active',
    ];

    protected $casts = [
        'regular_price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'rating_avg' => 'decimal:2',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
    ];

    protected $appends = [
        'primary_image',
        'discount_percentage',
        'is_in_stock',
    ];

    /**
     * Whenever a product becomes buyable again, tell the shoppers waiting on it.
     * Hooked here so every way of changing stock (admin form, CSV import, commands) is covered.
     */
    protected static function booted(): void
    {
        static::updated(function (Product $product) {
            $wasAvailable = $product->getOriginal('is_active') && $product->getOriginal('stock_quantity') > 0;

            if (! $wasAvailable && $product->is_active && $product->stock_quantity > 0) {
                DB::afterCommit(fn () => SendRestockEmails::dispatchAfterResponse($product));
            }
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    public function flashSaleItems(): HasMany
    {
        return $this->hasMany(FlashSaleItem::class);
    }

    public function restockRequests(): HasMany
    {
        return $this->hasMany(RestockRequest::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class)->where('is_approved', true);
    }

    /**
     * Recalculate the stored rating average and review count from approved reviews.
     */
    public function refreshRatingStats(): void
    {
        $stats = Review::where('product_id', $this->id)
            ->where('is_approved', true)
            ->selectRaw('COUNT(*) as total, AVG(rating) as average')
            ->first();

        $this->forceFill([
            'reviews_count' => (int) $stats->total,
            'rating_avg' => round((float) $stats->average, 2),
        ])->save();
    }

    public function getPrimaryImageAttribute(): ?string
    {
        $primary = $this->images->firstWhere('is_primary', true);
        if ($primary) {
            return $primary->image_url;
        }
        $first = $this->images->first();

        return $first ? $first->image_url : 'https://placehold.co/600x600/f3f4f6/36135d?text=Thyaga+Mall';
    }

    public function getDiscountPercentageAttribute(): ?int
    {
        if ($this->sale_price && $this->regular_price > 0 && $this->sale_price < $this->regular_price) {
            return (int) round((($this->regular_price - $this->sale_price) / $this->regular_price) * 100);
        }

        return null;
    }

    public function getIsInStockAttribute(): bool
    {
        return $this->stock_quantity > 0;
    }
}
