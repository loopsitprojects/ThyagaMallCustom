<?php

use App\Http\Controllers\Api\Admin\AdminOrderController;
use App\Http\Controllers\Api\Payment\WebxpayController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Printable merchant waybill view
Route::get('/admin/orders/{id}/waybill/{merchantId?}', [AdminOrderController::class, 'printWaybill']);

// WebXpay return/callback fallbacks
Route::match(['get', 'post'], '/checkout', [WebxpayController::class, 'callback']);
Route::match(['get', 'post'], '/payment/webxpay/callback', [WebxpayController::class, 'callback']);
Route::match(['get', 'post'], '/api/payment/webxpay/callback', [WebxpayController::class, 'callback']);

// Unknown pages get the storefront's 404 page (built into public/404.html) instead of Laravel's plain one.
// Unknown API paths keep their JSON 404.
Route::fallback(function (Request $request) {
    $notFoundPage = public_path('404.html');

    if ($request->expectsJson() || ! is_file($notFoundPage)) {
        abort(404);
    }

    // Sent as a normal body: file responses drop their content when the status isn't 2xx.
    return response(file_get_contents($notFoundPage), 404, ['Content-Type' => 'text/html; charset=utf-8']);
})->where('fallbackPlaceholder', '^(?!api(/|$)).*');
