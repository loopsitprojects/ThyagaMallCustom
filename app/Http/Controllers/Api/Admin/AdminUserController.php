<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::where('role', 'customer')->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->paginate(15);

        // Append order count and total spent for each customer
        $data = collect($users->items())->map(function ($u) {
            $orderCount = Order::where('customer_email', $u->email)->count();
            $totalSpent = Order::where('customer_email', $u->email)->where('payment_status', 'paid')->sum('total');
            $userArray = $u->toArray();
            $userArray['orders_count'] = $orderCount;
            $userArray['total_spent'] = $totalSpent;

            return $userArray;
        });

        // Customer Summary statistics
        $stats = [
            'total_customers' => User::where('role', 'customer')->count(),
            'active_customers' => User::where('role', 'customer')->where('status', 'active')->count(),
            'total_orders' => Order::count(),
            'suspended_customers' => User::where('role', 'customer')->where('status', 'suspended')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $data,
            'stats' => $stats,
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:30',
            'status' => 'required|in:active,suspended,inactive',
            'password' => 'required|string|min:8',
        ]);

        $hashedPassword = Hash::make($validated['password']);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'role' => 'customer',
            'status' => $validated['status'],
            'password' => $hashedPassword,
        ]);

        ActivityLog::record(
            'CREATE_CUSTOMER',
            "Created customer account for '{$user->name}' ({$user->email})",
            'Customer',
            $user->id,
            $request->user(),
            $request
        );

        return response()->json([
            'success' => true,
            'message' => 'Customer created successfully',
            'data' => $user,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::where('role', 'customer')->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', Rule::unique('users')->ignore($user->id)],
            'phone' => 'nullable|string|max:30',
            'status' => 'sometimes|required|in:active,suspended,inactive',
            'password' => 'nullable|string|min:8',
        ]);

        $updateData = [
            'name' => $validated['name'] ?? $user->name,
            'email' => $validated['email'] ?? $user->email,
            'phone' => array_key_exists('phone', $validated) ? $validated['phone'] : $user->phone,
            'status' => $validated['status'] ?? $user->status,
        ];

        if (! empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        ActivityLog::record(
            'UPDATE_CUSTOMER',
            "Updated customer profile for '{$user->name}' (Status: ".strtoupper($user->status).')',
            'Customer',
            $user->id,
            $request->user(),
            $request
        );

        return response()->json([
            'success' => true,
            'message' => 'Customer updated successfully',
            'data' => $user,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = User::where('role', 'customer')->findOrFail($id);
        $userName = $user->name;
        $userEmail = $user->email;

        $user->delete();

        ActivityLog::record(
            'DELETE_CUSTOMER',
            "Deleted customer account '{$userName}' ({$userEmail})",
            'Customer',
            $id,
            $request->user(),
            $request
        );

        return response()->json([
            'success' => true,
            'message' => "Customer {$userName} removed successfully",
        ]);
    }
}
