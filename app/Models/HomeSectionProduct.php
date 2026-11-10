<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HomeSectionProduct extends Model
{
    public const TRENDING = 'trending';

    public const BEST_SELLERS = 'best_sellers';

    public const SECTIONS = [self::TRENDING, self::BEST_SELLERS];

    /** How many products each homepage grid (or Best Sellers tab) shows. */
    public const DISPLAY_LIMIT = 6;

    protected $fillable = ['section', 'product_id', 'sort_order'];

    protected function casts(): array
    {
        return [
            'product_id' => 'integer',
            'sort_order' => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
