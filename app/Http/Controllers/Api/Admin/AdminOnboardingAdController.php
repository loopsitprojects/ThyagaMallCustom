<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Services\OnboardingAdSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * Admin → Onboarding Ad: switch the storefront welcome pop-up on/off and customise it.
 */
class AdminOnboardingAdController extends Controller
{
    // Site-relative path or an https URL — never javascript:, data:, etc.
    private const LINK = 'regex:/^(\/(?!\/)[^\s]*|https:\/\/[^\s]+)$/';

    public function __construct(private OnboardingAdSettings $settings) {}

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
            'enabled' => 'sometimes|boolean',
            'layout' => ['sometimes', Rule::in(OnboardingAdSettings::LAYOUTS)],
            'badge' => 'nullable|string|max:40',
            'title' => 'nullable|string|max:80',
            'body' => 'nullable|string|max:300',
            'coupon_code' => 'nullable|string|max:30',
            'cta_text' => 'nullable|string|max:30',
            'cta_link' => ['nullable', 'string', 'max:255', self::LINK],
            'dismiss_text' => 'nullable|string|max:30',
            'accent_color' => ['sometimes', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'delay_seconds' => 'sometimes|integer|min:0|max:60',
            'frequency' => ['sometimes', Rule::in(OnboardingAdSettings::FREQUENCIES)],
            'pages' => ['sometimes', Rule::in(OnboardingAdSettings::PAGES)],
        ]);

        $current = $this->settings->get();
        $enabling = ($validated['enabled'] ?? $current['enabled']) === true;

        if ($enabling && ($validated['layout'] ?? $current['layout']) === 'image' && ! $current['image_path']) {
            return response()->json([
                'success' => false,
                'message' => 'Upload an image before publishing an image-only ad.',
                'errors' => ['layout' => ['Upload an image before publishing an image-only ad.']],
            ], 422);
        }

        $ad = $this->settings->update($validated);

        ActivityLog::record('UPDATE_ONBOARDING_AD', $ad['enabled'] ? 'Updated and published the onboarding ad' : 'Updated the onboarding ad (switched off)', 'SiteSetting', null, $request->user(), $request);

        return response()->json([
            'success' => true,
            'message' => $ad['enabled'] ? 'Onboarding ad saved and live on the storefront' : 'Onboarding ad saved (switched off)',
            'data' => $ad,
        ]);
    }

    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            // SVG is excluded on purpose: it can carry script.
            'image' => 'required|file|mimes:jpg,jpeg,png,webp|max:4096',
        ]);

        $path = $request->file('image')->store(OnboardingAdSettings::DIRECTORY, OnboardingAdSettings::DISK);

        if ($path === false) {
            return response()->json(['success' => false, 'message' => 'Could not save the image. Please try again.'], 500);
        }

        $previous = $this->settings->get()['image_path'];
        $ad = $this->settings->update(['image_path' => $path]);

        if ($previous) {
            Storage::disk(OnboardingAdSettings::DISK)->delete($previous);
        }

        ActivityLog::record('UPDATE_ONBOARDING_AD', 'Uploaded a new onboarding ad image', 'SiteSetting', null, $request->user(), $request);

        return response()->json([
            'success' => true,
            'message' => 'Image uploaded',
            'data' => $ad,
        ]);
    }

    public function removeImage(Request $request): JsonResponse
    {
        $current = $this->settings->get();

        if ($current['enabled'] && $current['layout'] === 'image') {
            return response()->json([
                'success' => false,
                'message' => 'This live ad is image-only. Switch the layout or turn the ad off before removing its image.',
            ], 422);
        }

        if ($current['image_path']) {
            Storage::disk(OnboardingAdSettings::DISK)->delete($current['image_path']);
        }

        $ad = $this->settings->update(['image_path' => null]);

        ActivityLog::record('UPDATE_ONBOARDING_AD', 'Removed the onboarding ad image', 'SiteSetting', null, $request->user(), $request);

        return response()->json([
            'success' => true,
            'message' => 'Image removed',
            'data' => $ad,
        ]);
    }
}
