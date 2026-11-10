<?php

namespace App\Services;

use App\Models\SiteSetting;

/**
 * The store customers can collect orders from when they choose "Store pickup" at checkout.
 * Edited in Admin → Store Pickup and stored as JSON in site_settings.
 */
class StorePickupSettings
{
    public const KEY = 'store_pickup';

    /**
     * @return array{enabled: bool, name: string, address: string, city: string, phone: ?string, opening_hours: ?string, instructions: ?string}
     */
    public function defaults(): array
    {
        return [
            'enabled' => true,
            'name' => 'Thyaga Mall Store',
            'address' => '2A, Suleiman Terrace',
            'city' => 'Colombo 05',
            'phone' => null,
            'opening_hours' => null,
            'instructions' => "We'll call you when your order is ready to collect. Please bring your order number.",
        ];
    }

    /**
     * Saved settings merged over the defaults.
     *
     * @return array{enabled: bool, name: string, address: string, city: string, phone: ?string, opening_hours: ?string, instructions: ?string}
     */
    public function get(): array
    {
        $stored = json_decode((string) SiteSetting::getValue(self::KEY), true);

        return array_merge($this->defaults(), is_array($stored) ? array_intersect_key($stored, $this->defaults()) : []);
    }

    /**
     * @param  array<string, mixed>  $changes
     * @return array{enabled: bool, name: string, address: string, city: string, phone: ?string, opening_hours: ?string, instructions: ?string}
     */
    public function update(array $changes): array
    {
        $next = array_merge($this->get(), array_intersect_key($changes, $this->defaults()));

        SiteSetting::setValue(self::KEY, json_encode($next));

        return $this->get();
    }
}
