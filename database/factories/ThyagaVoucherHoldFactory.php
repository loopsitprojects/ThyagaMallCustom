<?php

namespace Database\Factories;

use App\Models\ThyagaVoucherHold;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ThyagaVoucherHold>
 */
class ThyagaVoucherHoldFactory extends Factory
{
    protected $model = ThyagaVoucherHold::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'redemption_id' => 'RED-'.Str::upper(Str::random(12)),
            'voucher_code' => fake()->numerify('########').Str::upper(fake()->lexify('??')),
            'amount' => 1000,
            'status' => ThyagaVoucherHold::STATUS_HELD,
            'expires_at' => now()->addMinutes(ThyagaVoucherHold::LIFETIME_MINUTES),
        ];
    }

    /**
     * A hold whose time to be used in an order has run out.
     */
    public function expired(): static
    {
        return $this->state(fn (): array => ['expires_at' => now()->subMinute()]);
    }
}
