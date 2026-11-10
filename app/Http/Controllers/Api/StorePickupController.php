<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\StorePickupSettings;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;

class StorePickupController extends Controller
{
    /**
     * The pickup store shown at checkout, or null when store pickup is switched off.
     */
    public function show(StorePickupSettings $settings): JsonResponse
    {
        try {
            $pickup = $settings->get();
        } catch (QueryException $e) {
            report($e);
            $pickup = null;
        }

        return response()->json([
            'success' => true,
            'data' => $pickup && $pickup['enabled'] ? $pickup : null,
        ]);
    }
}
