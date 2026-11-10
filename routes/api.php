<?php

use App\Http\Controllers\Api\Admin\AdminActivityLogController;
use App\Http\Controllers\Api\Admin\AdminAuthController;
use App\Http\Controllers\Api\Admin\AdminBrandController;
use App\Http\Controllers\Api\Admin\AdminCategoryController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminEmailSettingsController;
use App\Http\Controllers\Api\Admin\AdminFlashSaleController;
use App\Http\Controllers\Api\Admin\AdminHeroBannerController;
use App\Http\Controllers\Api\Admin\AdminHeroSlideController;
use App\Http\Controllers\Api\Admin\AdminHomeSectionController;
use App\Http\Controllers\Api\Admin\AdminMerchantController;
use App\Http\Controllers\Api\Admin\AdminNewsletterController;
use App\Http\Controllers\Api\Admin\AdminOnboardingAdController;
use App\Http\Controllers\Api\Admin\AdminOrderController;
use App\Http\Controllers\Api\Admin\AdminProductController;
use App\Http\Controllers\Api\Admin\AdminRestockRequestController;
use App\Http\Controllers\Api\Admin\AdminReviewController;
use App\Http\Controllers\Api\Admin\AdminStaffController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CustomerAuthController;
use App\Http\Controllers\Api\FlashSaleController;
use App\Http\Controllers\Api\HeroSlideController;
use App\Http\Controllers\Api\HomeSectionController;
use App\Http\Controllers\Api\NewsletterController;
use App\Http\Controllers\Api\OnboardingAdController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\Payment\WebxpayController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductReviewController;
use App\Http\Controllers\Api\RestockRequestController;
use App\Http\Controllers\Api\ThyagaVoucherController;
use App\Http\Controllers\Api\VoucherController;
use App\Models\HomeSectionProduct;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// Health Check & Root API Status
Route::get('/', function () {
    return response()->json([
        'status' => 'online',
        'app' => 'Thyaga Mall API',
        'version' => '1.0.0',
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::get('/health', function () {
    try {
        $dbStatus = DB::connection()->getPdo() ? 'connected' : 'disconnected';
    } catch (Throwable $e) {
        // Don't reveal driver/paths/credentials publicly — details go to the log.
        report($e);
        $dbStatus = 'error';
    }

    return response()->json([
        'status' => 'ok',
        'database' => $dbStatus,
    ]);
});

// Public Customer Authentication
Route::prefix('auth')->middleware('throttle:10,1')->group(function () {
    Route::post('/register', [CustomerAuthController::class, 'register']);
    Route::post('/login', [CustomerAuthController::class, 'login']);
});

// Authenticated Customer Endpoints
Route::middleware(['auth:sanctum', 'customer'])->prefix('user')->group(function () {
    Route::get('/me', [CustomerAuthController::class, 'me']);
    Route::get('/orders', [CustomerAuthController::class, 'orders']);
    Route::post('/logout', [CustomerAuthController::class, 'logout']);
});

// Public Storefront Endpoints
Route::prefix('brands')->group(function () {
    Route::get('/', [BrandController::class, 'index']);
    Route::get('/{slug}', [BrandController::class, 'show']);
});

Route::prefix('categories')->group(function () {
    Route::get('/', [CategoryController::class, 'index']);
    Route::get('/{slug}', [CategoryController::class, 'show']);
});

Route::prefix('products')->group(function () {
    Route::get('/', [ProductController::class, 'index']);
    Route::get('/featured', [ProductController::class, 'featured']);
    Route::get('/{slug}', [ProductController::class, 'show']);
    Route::get('/{slug}/reviews', [ProductReviewController::class, 'index']);
});

// Customer product reviews (one per customer per product; published after admin approval)
Route::middleware(['auth:sanctum', 'customer'])->prefix('products/{slug}/reviews')->group(function () {
    Route::get('/mine', [ProductReviewController::class, 'mine']);
    Route::post('/', [ProductReviewController::class, 'store'])->middleware('throttle:5,1');
    Route::delete('/mine', [ProductReviewController::class, 'destroy']);
});

Route::post('/products/{slug}/restock-alerts', [RestockRequestController::class, 'store'])->middleware('throttle:5,1');

Route::get('/flash-sale/active', [FlashSaleController::class, 'active']);
Route::get('/hero-slides', [HeroSlideController::class, 'index']);
Route::get('/home-sections/{section}', [HomeSectionController::class, 'show'])->whereIn('section', HomeSectionProduct::SECTIONS);
Route::get('/hero-banner', [HeroSlideController::class, 'banner']);
Route::get('/onboarding-ad', [OnboardingAdController::class, 'show']);

Route::post('/vouchers/apply', [VoucherController::class, 'apply'])->middleware('throttle:20,1');

// Thyāga Gift Voucher Endpoints
Route::prefix('vouchers/thyaga')->middleware('throttle:10,1')->group(function () {
    Route::get('/health', [ThyagaVoucherController::class, 'health']);
    Route::get('/details/{code}', [ThyagaVoucherController::class, 'details']);
    Route::post('/initiate', [ThyagaVoucherController::class, 'initiate']);
    Route::post('/verify-otp', [ThyagaVoucherController::class, 'verifyOtp']);
    Route::post('/cancel', [ThyagaVoucherController::class, 'cancel']);
});

Route::post('/newsletter/subscribe', [NewsletterController::class, 'subscribe'])->middleware('throttle:5,1');

Route::prefix('orders')->group(function () {
    Route::post('/', [OrderController::class, 'store'])->middleware('throttle:10,1');
    Route::get('/{order_number}', [OrderController::class, 'show'])->middleware('throttle:30,1');
});

// WebXpay Payment Gateway Endpoints
Route::prefix('payment/webxpay')->group(function () {
    Route::post('/initiate/{order_number}', [WebxpayController::class, 'initiate'])->middleware('throttle:10,1');
    Route::match(['get', 'post'], '/callback', [WebxpayController::class, 'callback'])->name('payment.webxpay.callback');
});

// Admin Authentication (Public)
Route::post('/admin/login', [AdminAuthController::class, 'login'])->middleware('throttle:5,1');

// Admin Protected Routes
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    Route::get('/me', [AdminAuthController::class, 'me']);
    Route::post('/logout', [AdminAuthController::class, 'logout']);

    // Dashboard
    Route::get('/stats', [AdminDashboardController::class, 'stats']);

    // Products Management
    Route::get('/products/export', [AdminProductController::class, 'export']);
    Route::get('/products/template', [AdminProductController::class, 'sampleTemplate']);
    Route::post('/products/import', [AdminProductController::class, 'import']);
    Route::post('/products/bulk-pricing', [AdminProductController::class, 'bulkPricing']);
    Route::get('/products', [AdminProductController::class, 'index']);
    Route::post('/products', [AdminProductController::class, 'store']);
    Route::put('/products/{id}', [AdminProductController::class, 'update']);
    Route::delete('/products/{id}', [AdminProductController::class, 'destroy']);

    // Merchants Management
    Route::get('/merchants', [AdminMerchantController::class, 'index']);
    Route::post('/merchants', [AdminMerchantController::class, 'store']);
    Route::get('/merchants/{id}', [AdminMerchantController::class, 'show']);
    Route::put('/merchants/{id}', [AdminMerchantController::class, 'update']);
    Route::delete('/merchants/{id}', [AdminMerchantController::class, 'destroy']);
    Route::patch('/merchants/{id}/status', [AdminMerchantController::class, 'toggleStatus']);
    Route::get('/merchants/{id}/products', [AdminMerchantController::class, 'products']);

    // Flash Sales Management
    Route::get('/flash-sales', [AdminFlashSaleController::class, 'index']);
    Route::post('/flash-sales', [AdminFlashSaleController::class, 'store']);
    Route::match(['put', 'post'], '/flash-sales/{id}', [AdminFlashSaleController::class, 'update']);
    Route::post('/flash-sales/{id}/items', [AdminFlashSaleController::class, 'addItem']);
    Route::match(['delete', 'post'], '/flash-sales/{id}/items/{itemId}', [AdminFlashSaleController::class, 'removeItem']);

    // Categories & Sub-categories
    Route::get('/categories', [AdminCategoryController::class, 'index']);
    Route::post('/categories', [AdminCategoryController::class, 'store']);
    Route::put('/categories/reorder', [AdminCategoryController::class, 'reorder']);
    Route::put('/categories/{id}', [AdminCategoryController::class, 'update']);
    Route::delete('/categories/{id}', [AdminCategoryController::class, 'destroy']);

    // Brands Management
    Route::get('/brands', [AdminBrandController::class, 'index']);
    Route::post('/brands', [AdminBrandController::class, 'store']);
    Route::put('/brands/reorder', [AdminBrandController::class, 'reorder']);
    Route::get('/brands/{id}', [AdminBrandController::class, 'show']);
    Route::put('/brands/{id}', [AdminBrandController::class, 'update']);
    Route::delete('/brands/{id}', [AdminBrandController::class, 'destroy']);
    Route::patch('/brands/{id}/toggle-featured', [AdminBrandController::class, 'toggleFeatured']);
    Route::patch('/brands/{id}/toggle-status', [AdminBrandController::class, 'toggleStatus']);

    // Product Reviews moderation
    Route::get('/reviews', [AdminReviewController::class, 'index']);
    Route::patch('/reviews/{id}/status', [AdminReviewController::class, 'updateStatus']);
    Route::delete('/reviews/{id}', [AdminReviewController::class, 'destroy']);

    // Homepage Hero Slides
    Route::get('/hero-slides', [AdminHeroSlideController::class, 'index']);
    Route::post('/hero-slides', [AdminHeroSlideController::class, 'store']);
    Route::put('/hero-slides/reorder', [AdminHeroSlideController::class, 'reorder']);
    Route::put('/hero-slides/{id}', [AdminHeroSlideController::class, 'update']);
    Route::delete('/hero-slides/{id}', [AdminHeroSlideController::class, 'destroy']);

    // Homepage hero mode (3D / image carousel) and carousel images
    Route::get('/hero-banner', [AdminHeroBannerController::class, 'index']);
    Route::put('/hero-banner/mode', [AdminHeroBannerController::class, 'updateMode']);
    Route::post('/hero-banner/images', [AdminHeroBannerController::class, 'storeImage']);
    Route::put('/hero-banner/images/reorder', [AdminHeroBannerController::class, 'reorderImages']);
    Route::put('/hero-banner/images/{id}', [AdminHeroBannerController::class, 'updateImage']);
    Route::delete('/hero-banner/images/{id}', [AdminHeroBannerController::class, 'destroyImage']);

    // Emails waiting on out-of-stock products
    Route::get('/restock-requests', [AdminRestockRequestController::class, 'index']);
    Route::delete('/restock-requests/{id}', [AdminRestockRequestController::class, 'destroy']);

    // Homepage Trending / Best Sellers product picks
    Route::get('/home-sections', [AdminHomeSectionController::class, 'index']);
    Route::whereIn('section', HomeSectionProduct::SECTIONS)->group(function () {
        Route::post('/home-sections/{section}/products', [AdminHomeSectionController::class, 'store']);
        Route::put('/home-sections/{section}/reorder', [AdminHomeSectionController::class, 'reorder']);
        Route::delete('/home-sections/{section}/products/{productId}', [AdminHomeSectionController::class, 'destroy']);
    });

    // Storefront welcome pop-up (onboarding ad)
    Route::get('/onboarding-ad', [AdminOnboardingAdController::class, 'show']);
    Route::put('/onboarding-ad', [AdminOnboardingAdController::class, 'update']);
    Route::post('/onboarding-ad/image', [AdminOnboardingAdController::class, 'uploadImage']);
    Route::delete('/onboarding-ad/image', [AdminOnboardingAdController::class, 'removeImage']);

    // Orders Management
    Route::get('/orders', [AdminOrderController::class, 'index']);
    Route::get('/orders/{id}', [AdminOrderController::class, 'show']);
    Route::put('/orders/{id}/status', [AdminOrderController::class, 'updateStatus']);

    // Customers Management (users table)
    Route::get('/users', [AdminUserController::class, 'index']);
    Route::post('/users', [AdminUserController::class, 'store']);
    Route::put('/users/{id}', [AdminUserController::class, 'update']);
    Route::delete('/users/{id}', [AdminUserController::class, 'destroy']);

    // Administrators Management (admins table) — super admins only
    Route::middleware('admin:super_admin')->group(function () {
        Route::get('/admins', [AdminStaffController::class, 'index']);
        Route::post('/admins', [AdminStaffController::class, 'store']);
        Route::put('/admins/{id}', [AdminStaffController::class, 'update']);
        Route::delete('/admins/{id}', [AdminStaffController::class, 'destroy']);

        // Email addresses that receive new-order notifications
        Route::get('/email-settings', [AdminEmailSettingsController::class, 'index']);
        Route::post('/email-settings/recipients', [AdminEmailSettingsController::class, 'storeRecipient']);
        Route::patch('/email-settings/recipients/{id}', [AdminEmailSettingsController::class, 'updateRecipient']);
        Route::delete('/email-settings/recipients/{id}', [AdminEmailSettingsController::class, 'destroyRecipient']);
    });

    // Activity Logs
    Route::get('/activity-logs', [AdminActivityLogController::class, 'index']);

    // Newsletter Subscribers Management
    Route::get('/newsletter-subscribers', [AdminNewsletterController::class, 'index']);
    Route::post('/newsletter-subscribers', [AdminNewsletterController::class, 'store']);
    Route::patch('/newsletter-subscribers/{id}/status', [AdminNewsletterController::class, 'toggleStatus']);
    Route::delete('/newsletter-subscribers/{id}', [AdminNewsletterController::class, 'destroy']);
});
