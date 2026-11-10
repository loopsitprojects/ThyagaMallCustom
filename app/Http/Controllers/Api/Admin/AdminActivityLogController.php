<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ActivityLog::latest();

        if ($action = $request->query('action')) {
            if ($action === 'auth') {
                $query->whereIn('action', ['LOGIN', 'LOGOUT']);
            } elseif ($action === 'orders') {
                $query->where('action', 'like', '%ORDER%');
            } elseif ($action === 'products') {
                $query->where('action', 'like', '%PRODUCT%');
            } elseif ($action === 'users') {
                $query->where('action', 'like', '%USER%');
            } elseif ($action === 'flash_sales') {
                $query->where('action', 'like', '%FLASH%');
            } else {
                $query->where('action', strtoupper($action));
            }
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('admin_name', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%")
                    ->orWhere('entity_id', 'like', "%{$search}%");
            });
        }

        $logs = $query->paginate(20);

        // Summary statistics
        $stats = [
            'total_activities' => ActivityLog::count(),
            'today_activities' => ActivityLog::whereDate('created_at', today())->count(),
            'unique_admins' => ActivityLog::distinct('admin_name')->count('admin_name'),
            'auth_events' => ActivityLog::whereIn('action', ['LOGIN', 'LOGOUT'])->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $logs->items(),
            'stats' => $stats,
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
