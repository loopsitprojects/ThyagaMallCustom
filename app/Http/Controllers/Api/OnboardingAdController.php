<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OnboardingAdSettings;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Arr;

class OnboardingAdController extends Controller
{
    /**
     * The welcome pop-up for storefront visitors, or null when it is switched off.
     */
    public function show(OnboardingAdSettings $settings): JsonResponse
    {
        try {
            $ad = $settings->get();
        } catch (QueryException $e) {
            report($e);
            $ad = null;
        }

        return response()->json([
            'success' => true,
            'data' => $ad && $ad['enabled'] ? Arr::except($ad, ['image_path']) : null,
        ]);
    }
}
