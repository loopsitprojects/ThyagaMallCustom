<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FlashSale;
use Illuminate\Http\JsonResponse;

class FlashSaleController extends Controller
{
    public function active(): JsonResponse
    {
        $now = now();
        $flashSale = FlashSale::where('is_active', true)
            ->where('start_time', '<=', $now)
            ->where('end_time', '>=', $now)
            ->with(['items' => function ($q) {
                $q->with(['product' => function ($pq) {
                    $pq->with('images', 'category');
                }])->orderBy('sort_order');
            }])
            ->first();

        if (! $flashSale) {
            // Check for active campaign if schedule isn't strictly bounded by minutes
            $flashSale = FlashSale::where('is_active', true)
                ->where(function ($q) use ($now) {
                    $q->whereNull('end_time')
                        ->orWhere('end_time', '>=', $now);
                })
                ->with(['items' => function ($q) {
                    $q->with(['product' => function ($pq) {
                        $pq->with('images', 'category');
                    }])->orderBy('sort_order');
                }])
                ->latest()
                ->first();
        }

        return response()->json([
            'success' => true,
            'data' => $flashSale,
        ]);
    }
}
