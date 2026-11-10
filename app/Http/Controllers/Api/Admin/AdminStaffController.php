<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Admin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminStaffController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Admin::latest();

        if ($role = $request->query('role')) {
            $query->where('role', $role);
        }

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

        $admins = $query->paginate(15);

        $stats = [
            'total_admins' => Admin::count(),
            'super_admins' => Admin::where('role', 'super_admin')->count(),
            'managers' => Admin::where('role', 'manager')->count(),
            'editors' => Admin::where('role', 'editor')->count(),
            'active_admins' => Admin::where('status', 'active')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $admins->items(),
            'stats' => $stats,
            'pagination' => [
                'current_page' => $admins->currentPage(),
                'last_page' => $admins->lastPage(),
                'per_page' => $admins->perPage(),
                'total' => $admins->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:admins,email',
            'phone' => 'nullable|string|max:30',
            'role' => 'required|in:super_admin,manager,editor',
            'status' => 'nullable|in:active,suspended,inactive',
            'password' => 'required|string|min:10',
        ]);

        $hashedPassword = Hash::make($validated['password']);

        $admin = Admin::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'role' => $validated['role'],
            'status' => $validated['status'] ?? 'active',
            'password' => $hashedPassword,
            'avatar' => 'https://ui-avatars.com/api/?name='.urlencode($validated['name']).'&background=36135d&color=fff',
        ]);

        ActivityLog::record(
            'CREATE_ADMIN',
            "Created administrator '{$admin->name}' ({$admin->email}) with role ".strtoupper($admin->role),
            'Admin',
            $admin->id,
            $request->user(),
            $request
        );

        return response()->json([
            'success' => true,
            'message' => 'Administrator created successfully',
            'data' => $admin,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $admin = Admin::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', Rule::unique('admins')->ignore($admin->id)],
            'phone' => 'nullable|string|max:30',
            'role' => 'sometimes|required|in:super_admin,manager,editor',
            'status' => 'sometimes|required|in:active,suspended,inactive',
            'password' => 'nullable|string|min:10',
        ]);

        // Prevent locking yourself out (or self-promotion) by editing your own role/status.
        if ($admin->is($request->user())
            && ((isset($validated['role']) && $validated['role'] !== $admin->role)
                || (isset($validated['status']) && $validated['status'] !== $admin->status))) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot change your own role or status.',
            ], 422);
        }

        $updateData = [
            'name' => $validated['name'] ?? $admin->name,
            'email' => $validated['email'] ?? $admin->email,
            'phone' => array_key_exists('phone', $validated) ? $validated['phone'] : $admin->phone,
            'role' => $validated['role'] ?? $admin->role,
            'status' => $validated['status'] ?? $admin->status,
        ];

        if (! empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $admin->update($updateData);

        // Sign out existing sessions when access is revoked or the password changes.
        if ($admin->status !== 'active' || ! empty($validated['password'])) {
            $admin->tokens()->delete();
        }

        ActivityLog::record(
            'UPDATE_ADMIN',
            "Updated administrator '{$admin->name}' (Role: ".strtoupper($admin->role).', Status: '.strtoupper($admin->status).')',
            'Admin',
            $admin->id,
            $request->user(),
            $request
        );

        return response()->json([
            'success' => true,
            'message' => 'Administrator updated successfully',
            'data' => $admin,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $admin = Admin::findOrFail($id);

        if ($admin->email === 'admin@thyaga.lk') {
            return response()->json([
                'success' => false,
                'message' => 'Primary system administrator account cannot be deleted.',
            ], 403);
        }

        if ($admin->is($request->user())) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot delete your own account.',
            ], 403);
        }

        $adminName = $admin->name;
        $adminEmail = $admin->email;
        $admin->tokens()->delete();
        $admin->delete();

        ActivityLog::record(
            'DELETE_ADMIN',
            "Deleted administrator '{$adminName}' ({$adminEmail})",
            'Admin',
            $id,
            $request->user(),
            $request
        );

        return response()->json([
            'success' => true,
            'message' => "Administrator {$adminName} removed successfully",
        ]);
    }
}
