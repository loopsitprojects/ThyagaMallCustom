<?php

use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureCustomer;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin' => EnsureAdmin::class,
            'customer' => EnsureCustomer::class,
        ]);

        $middleware->validateCsrfTokens(except: [
            'api/*',
            'payment/*',
            'payment/webxpay/*',
            'api/payment/webxpay/*',
            'checkout',
            'checkout/*',
            '*webxpay*',
            '*checkout*',
            'ThyagaMall/api/payment/webxpay/*',
            'ThyagaMall/checkout',
            'ThyagaMall/checkout/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API errors are always JSON with their real status code (404, 422, ...).
        // Laravel only includes file paths / stack traces when APP_DEBUG=true.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson()
        );
    })->create();
