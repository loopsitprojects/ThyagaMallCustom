<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class FlashSale extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'banner_url',
        'start_time',
        'end_time',
        'is_active',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'is_active' => 'boolean',
    ];

    protected $appends = [
        'is_currently_active',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(FlashSaleItem::class)->orderBy('sort_order');
    }

    public function setStartTimeAttribute(mixed $value): void
    {
        $this->attributes['start_time'] = $this->toAppTimezone($value);
    }

    public function setEndTimeAttribute(mixed $value): void
    {
        $this->attributes['end_time'] = $this->toAppTimezone($value);
    }

    /**
     * The admin sends ISO strings in UTC ("...Z"). Eloquent would store their UTC
     * wall-clock time as-is, so convert to the app timezone (Sri Lanka) first.
     */
    private function toAppTimezone(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return $this->fromDateTime(Carbon::parse($value)->setTimezone(config('app.timezone')));
    }

    public function getIsCurrentlyActiveAttribute(): bool
    {
        $now = now();

        return $this->is_active && $this->start_time <= $now && $this->end_time >= $now;
    }
}
