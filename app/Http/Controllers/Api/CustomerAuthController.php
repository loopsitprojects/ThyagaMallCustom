<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class CustomerAuthController extends Controller
{
    /**
     * Register a new customer account.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'phone' => 'nullable|string|max:30',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => trim($validated['name']),
            'email' => strtolower(trim($validated['email'])),
            'phone' => isset($validated['phone']) ? trim($validated['phone']) : null,
            'password' => Hash::make($validated['password']),
            'role' => 'customer',
            'status' => 'active',
            'last_login_at' => now(),
        ]);

        $token = $user->createToken('customer-token', ['customer'])->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Welcome to Thyaga Mall! Your account has been created.',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'status' => $user->status,
                'created_at' => $user->created_at,
            ],
        ], 201);
    }

    /**
     * Authenticate an existing customer.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $email = strtolower(trim($request->email));
        $user = User::where('email', $email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid email or password.'],
            ]);
        }

        if ($user->role !== 'customer') {
            throw ValidationException::withMessages([
                'email' => ['Please sign in via the admin portal.'],
            ]);
        }

        if ($user->status === 'suspended' || $user->status === 'inactive') {
            return response()->json([
                'success' => false,
                'message' => 'Your account has been deactivated. Please contact support at support@thyaga.lk.',
            ], 403);
        }

        $user->update(['last_login_at' => now()]);
        $token = $user->createToken('customer-token', ['customer'])->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Welcome back, '.$user->name.'!',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'status' => $user->status,
                'created_at' => $user->created_at,
            ],
        ]);
    }

    /**
     * Get the authenticated customer's profile.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        $ordersCount = Order::where('user_id', $user->id)->count();

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'status' => $user->status,
                'created_at' => $user->created_at,
                'orders_count' => $ordersCount,
            ],
        ]);
    }

    /**
     * Get customer orders history.
     */
    public function orders(Request $request): JsonResponse
    {
        $user = $request->user();

        $orders = Order::with('items')
            ->where('user_id', $user->id)
            ->latest()
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $orders->items(),
            'pagination' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    /**
     * Logout customer and revoke token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'You have been signed out successfully.',
        ]);
    }
}
