<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Admin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AdminAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $admin = Admin::where('email', $request->email)->first();

        if (! $admin || ! Hash::check($request->password, $admin->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid admin credentials provided.'],
            ]);
        }

        if ($admin->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['This administrator account is not active.'],
            ]);
        }

        $admin->update(['last_login_at' => now()]);
        $token = $admin->createToken('admin-token', ['admin'])->plainTextToken;

        ActivityLog::record(
            'LOGIN',
            "Administrator {$admin->name} signed into the admin portal",
            'Auth',
            $admin->id,
            $admin,
            $request
        );

        return response()->json([
            'success' => true,
            'message' => 'Admin authenticated successfully',
            'token' => $token,
            'admin' => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'role' => $admin->role,
                'avatar' => $admin->avatar,
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $admin = $request->user();

        return response()->json([
            'success' => true,
            'admin' => $admin,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $admin = $request->user();
        if ($admin) {
            ActivityLog::record(
                'LOGOUT',
                "Administrator {$admin->name} logged out of session",
                'Auth',
                $admin->id,
                $admin,
                $request
            );
            $admin->currentAccessToken()->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }
}
