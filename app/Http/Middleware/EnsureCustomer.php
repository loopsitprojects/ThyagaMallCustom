<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Only lets through requests authenticated with a customer-issued token
 * belonging to an active customer account.
 */
class EnsureCustomer
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User || ! $user->tokenCan('customer') || $user->role !== 'customer') {
            return response()->json([
                'success' => false,
                'message' => 'Customer account required.',
            ], 403);
        }

        if (in_array($user->status, ['suspended', 'inactive'], true)) {
            $user->currentAccessToken()?->delete();

            return response()->json([
                'success' => false,
                'message' => 'Your account has been deactivated. Please contact support at support@thyaga.lk.',
            ], 403);
        }

        return $next($request);
    }
}
