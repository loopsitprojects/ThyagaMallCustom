<?php

namespace App\Models;

use Database\Factories\ThyagaVoucherHoldFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A Thyāga gift voucher amount put on hold after the owner's OTP was verified at checkout.
 * It is used once by an order, or released back to the voucher when it expires unused.
 */
class ThyagaVoucherHold extends Model
{
    /** @use HasFactory<ThyagaVoucherHoldFactory> */
    use HasFactory;

    public const STATUS_HELD = 'held';

    public const STATUS_USED = 'used';

    public const STATUS_RELEASING = 'releasing';

    public const STATUS_RELEASED = 'released';

    public const STATUS_RELEASE_FAILED = 'release_failed';

    /** How long a verified hold can be used to place an order before it is released. */
    public const LIFETIME_MINUTES = 30;

    /** Give up asking Thyāga to release a hold after this many failed attempts. */
    public const MAX_RELEASE_ATTEMPTS = 5;

    protected $fillable = [
        'redemption_id',
        'voucher_code',
        'amount',
        'status',
        'order_id',
        'expires_at',
        'released_at',
        'release_attempts',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'expires_at' => 'datetime',
            'released_at' => 'datetime',
            'release_attempts' => 'integer',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Holds that can still be applied to an order.
     *
     * @param  Builder<self>  $query
     */
    public function scopeUsable(Builder $query): void
    {
        $query->where('status', self::STATUS_HELD)->where('expires_at', '>', now());
    }
}
