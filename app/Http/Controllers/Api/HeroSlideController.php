<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HeroBannerImage;
use App\Models\HeroSlide;
use App\Models\SiteSetting;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;

class HeroSlideController extends Controller
{
    /**
     * Active homepage hero slides, in display order.
     * Returns an empty list (storefront falls back to built-in slides) if the
     * table hasn't been created on this server yet.
     */
    public function index(): JsonResponse
    {
        try {
            $slides = HeroSlide::where('is_active', true)->ordered()->get();
        } catch (QueryException $e) {
            report($e);
            $slides = collect();
        }

        return response()->json([
            'success' => true,
            'data' => $slides,
        ]);
    }

    /**
     * Everything the homepage hero needs: the display mode, the 3D slides and
     * the active carousel images. Falls back to the 3D banner if the settings
     * tables haven't been created on this server yet.
     */
    public function banner(): JsonResponse
    {
        try {
            $slides = HeroSlide::where('is_active', true)->ordered()->get();
        } catch (QueryException $e) {
            report($e);
            $slides = collect();
        }

        try {
            $mode = SiteSetting::getValue(SiteSetting::HERO_MODE, SiteSetting::HERO_MODE_3D);
            $images = HeroBannerImage::where('is_active', true)->ordered()->get();
        } catch (QueryException $e) {
            report($e);
            $mode = SiteSetting::HERO_MODE_3D;
            $images = collect();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'mode' => $mode,
                'slides' => $slides,
                'images' => $images,
            ],
        ]);
    }
}
