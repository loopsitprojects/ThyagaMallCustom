<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\HeroBannerImage;
use App\Models\SiteSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * Homepage hero display mode (3D scene vs. image carousel) and the carousel's images.
 */
class AdminHeroBannerController extends Controller
{
    // Site-relative path or an https URL — never javascript:, data:, etc.
    private const LINK = 'regex:/^(\/(?!\/)[^\s]*|https:\/\/[^\s]+)$/';

    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'mode' => SiteSetting::getValue(SiteSetting::HERO_MODE, SiteSetting::HERO_MODE_3D),
                'images' => HeroBannerImage::ordered()->get(),
            ],
        ]);
    }

    public function updateMode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mode' => ['required', Rule::in([SiteSetting::HERO_MODE_3D, SiteSetting::HERO_MODE_IMAGES])],
        ]);

        SiteSetting::setValue(SiteSetting::HERO_MODE, $validated['mode']);

        $label = $validated['mode'] === SiteSetting::HERO_MODE_IMAGES ? 'image carousel' : '3D banner';
        ActivityLog::record('UPDATE_HERO_MODE', "Switched homepage hero to the {$label}", 'SiteSetting', null, $request->user(), $request);

        return response()->json([
            'success' => true,
            'message' => "Homepage hero now shows the {$label}",
            'data' => ['mode' => $validated['mode']],
        ]);
    }

    public function storeImage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // SVG is excluded on purpose: it can carry script.
            'image' => 'required|file|mimes:jpg,jpeg,png,webp|max:4096',
            ...$this->detailRules(),
        ]);

        $path = $request->file('image')->store(HeroBannerImage::DIRECTORY, HeroBannerImage::DISK);

        if ($path === false) {
            return response()->json(['success' => false, 'message' => 'Could not save the image. Please try again.'], 500);
        }

        $image = HeroBannerImage::create([
            'image_path' => $path,
            'alt_text' => $validated['alt_text'] ?? null,
            'title' => $validated['title'] ?? null,
            'subtitle' => $validated['subtitle'] ?? null,
            'cta_text' => $validated['cta_text'] ?? null,
            'link' => $validated['link'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => (int) HeroBannerImage::max('sort_order') + 1,
        ]);

        ActivityLog::record('CREATE_HERO_IMAGE', 'Uploaded a homepage hero carousel image', 'HeroBannerImage', $image->id, $request->user(), $request);

        return response()->json([
            'success' => true,
            'message' => 'Image added to the carousel',
            'data' => $image,
        ], 201);
    }

    public function updateImage(Request $request, int $id): JsonResponse
    {
        $image = HeroBannerImage::findOrFail($id);
        $validated = $request->validate($this->detailRules());

        $image->update($validated);

        ActivityLog::record('UPDATE_HERO_IMAGE', 'Updated a homepage hero carousel image', 'HeroBannerImage', $image->id, $request->user(), $request);

        return response()->json([
            'success' => true,
            'message' => 'Image updated',
            'data' => $image,
        ]);
    }

    public function destroyImage(Request $request, int $id): JsonResponse
    {
        $image = HeroBannerImage::findOrFail($id);
        Storage::disk(HeroBannerImage::DISK)->delete($image->image_path);
        $image->delete();

        ActivityLog::record('DELETE_HERO_IMAGE', 'Deleted a homepage hero carousel image', 'HeroBannerImage', $id, $request->user(), $request);

        return response()->json([
            'success' => true,
            'message' => 'Image removed from the carousel',
        ]);
    }

    /**
     * Save a new display order: { "ids": [3, 1, 2, ...] }
     */
    public function reorderImages(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|distinct|exists:hero_banner_images,id',
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['ids'] as $position => $id) {
                HeroBannerImage::whereKey($id)->update(['sort_order' => $position]);
            }
        });

        ActivityLog::record('REORDER_HERO_IMAGES', 'Reordered homepage hero carousel images', 'HeroBannerImage', null, $request->user(), $request);

        return response()->json([
            'success' => true,
            'message' => 'Image order saved',
            'data' => HeroBannerImage::ordered()->get(),
        ]);
    }

    /**
     * Editable text shown on a carousel image: headline, description and the button that uses `link`.
     *
     * @return array<string, mixed>
     */
    private function detailRules(): array
    {
        return [
            'alt_text' => 'nullable|string|max:120',
            'title' => 'nullable|string|max:60',
            'subtitle' => 'nullable|string|max:160',
            'cta_text' => 'nullable|string|max:30',
            'link' => ['nullable', 'string', 'max:255', self::LINK],
            'is_active' => 'sometimes|boolean',
        ];
    }
}
