<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Only lets through requests authenticated with an admin-issued token belonging
 * to an active Admin. Optional role arguments restrict access further,
 * e.g. `admin:super_admin`.
 */
class EnsureAdmin
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user instanceof Admin || ! $user->tokenCan('admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Administrator access required.',
            ], 403);
        }

        if ($user->status !== 'active') {
            $user->currentAccessToken()?->delete();

            return response()->json([
                'success' => false,
                'message' => 'This administrator account is not active.',
            ], 403);
        }

        if (! empty($roles) && ! in_array($user->role, $roles, true)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to perform this action.',
            ], 403);
        }

        return $next($request);
    }
}
