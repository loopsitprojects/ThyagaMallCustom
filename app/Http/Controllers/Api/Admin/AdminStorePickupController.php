<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Services\StorePickupSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin → Store Pickup: switch the checkout pickup option on/off and set the store's details.
 */
class AdminStorePickupController extends Controller
{
    public function __construct(private StorePickupSettings $settings) {}

    public function show(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->settings->get(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'enabled' => 'required|boolean',
            'name' => 'required|string|max:100',
            'address' => 'required|string|max:255',
            'city' => 'required|string|max:100',
            'phone' => 'nullable|string|max:50',
            'opening_hours' => 'nullable|string|max:150',
            'instructions' => 'nullable|string|max:300',
        ]);

        $pickup = $this->settings->update($validated);

        ActivityLog::record(
            'UPDATE_STORE_PICKUP',
            $pickup['enabled'] ? "Updated store pickup ({$pickup['name']}, {$pickup['city']})" : 'Switched store pickup off',
            'SiteSetting',
            null,
            $request->user(),
            $request,
        );

        return response()->json([
            'success' => true,
            'message' => $pickup['enabled'] ? 'Store pickup saved and offered at checkout' : 'Store pickup saved (switched off at checkout)',
            'data' => $pickup,
        ]);
    }
}
