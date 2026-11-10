<?php

use App\Http\Controllers\Api\Admin\AdminOrderController;
use App\Http\Controllers\Api\Payment\WebxpayController;
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
