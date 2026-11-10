<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FlashSaleItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'flash_sale_id',
        'product_id',
        'flash_price',
        'quantity_limit',
        'quantity_sold',
        'sort_order',
    ];

    protected $casts = [
        'flash_price' => 'decimal:2',
        'quantity_limit' => 'integer',
        'quantity_sold' => 'integer',
    ];

    protected $appends = [
        'discount_percentage',
        'stock_remaining',
        'percentage_sold',
    ];

    public function flashSale(): BelongsTo
    {
        return $this->belongsTo(FlashSale::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function getDiscountPercentageAttribute(): ?int
    {
        if ($this->product && $this->product->regular_price > 0 && $this->flash_price < $this->product->regular_price) {
            return (int) round((($this->product->regular_price - $this->flash_price) / $this->product->regular_price) * 100);
        }

        return null;
    }

    public function getStockRemainingAttribute(): int
    {
        return max(0, $this->quantity_limit - $this->quantity_sold);
    }

    public function getPercentageSoldAttribute(): int
    {
        if ($this->quantity_limit <= 0) {
            return 0;
        }

        return (int) min(100, round(($this->quantity_sold / $this->quantity_limit) * 100));
    }
}
