<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RestockRequest extends Model
{
    protected $fillable = ['product_id', 'email', 'notified_at'];

    protected function casts(): array
    {
        return [
            'product_id' => 'integer',
            'notified_at' => 'datetime',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Requests still waiting for their back-in-stock email.
     */
    public function scopeWaiting(Builder $query): Builder
    {
        return $query->whereNull('notified_at');
    }
}
