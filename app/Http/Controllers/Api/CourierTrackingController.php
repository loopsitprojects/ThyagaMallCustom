<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PromptXpressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class CourierTrackingController extends Controller
{
    /**
     * Look up a Prompt Xpress consignment's delivery history.
     */
    public function show(string $trackingNumber, PromptXpressService $promptXpress): JsonResponse
    {
        $normalised = PromptXpressService::normaliseTrackingNumber($trackingNumber);

        if ($normalised === null) {
            return response()->json([
                'success' => false,
                'message' => 'Please enter a valid courier tracking number (letters and numbers only).',
            ], 422);
        }

        try {
            $events = $promptXpress->getTrackingHistory($normalised);
        } catch (RuntimeException $exception) {
            Log::warning('Courier tracking lookup failed', ['tracking_number' => $normalised, 'error' => $exception->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'The courier tracking service is not responding right now. Please try again shortly.',
            ], 502);
        }

        if ($events === []) {
            return response()->json([
                'success' => false,
                'message' => 'No delivery found for this tracking number yet. Please check the number, or try again later if it was just dispatched.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'tracking_number' => $normalised,
                'courier' => 'Prompt Xpress',
                'events' => $events,
            ],
        ]);
    }
}
