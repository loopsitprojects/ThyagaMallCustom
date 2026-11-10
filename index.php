<?php

declare(strict_types=1);

/**
 * Root entrypoint for subfolder deployments (e.g. cPanel / LiteSpeed).
 *
 * If the webserver reaches this file instead of rewriting directly to public/,
 * this file serves static index.html for storefront root visits or delegates
 * to public/index.php for Laravel routes and API requests.
 */
$uri = urldecode(
    parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/'
);

$publicPath = __DIR__.'/public';

// If requesting storefront home directly (e.g. /Thyaga, /Thyaga/, /thyaga, /thyaga/)
$cleanPath = rtrim($uri, '/');
$baseFolder = basename($cleanPath);

if ($cleanPath === '' || in_array(strtolower($baseFolder), ['thyaga', 'thyagamall'], true)) {
    $staticIndex = $publicPath.'/index.html';
    if (file_exists($staticIndex)) {
        header('Content-Type: text/html; charset=UTF-8');
        readfile($staticIndex);
        exit;
    }
}

// Forward to Laravel's public entrypoint
require_once $publicPath.'/index.php';
