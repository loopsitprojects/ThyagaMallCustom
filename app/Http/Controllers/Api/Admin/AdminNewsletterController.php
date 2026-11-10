<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\NewsletterSubscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminNewsletterController extends Controller
{
    public function index(Request $request): JsonResponse|StreamedResponse
    {
        $query = NewsletterSubscriber::query();

        // Search
        if ($search = $request->input('search')) {
            $query->where('email', 'like', "%{$search}%");
        }

        // Status filter
        if ($status = $request->input('status')) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        // Source filter
        if ($source = $request->input('source')) {
            if ($source !== 'all') {
                $query->where('source', $source);
            }
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'latest');
        switch ($sortBy) {
            case 'oldest':
                $query->orderBy('created_at', 'asc');
                break;
            case 'email_asc':
                $query->orderBy('email', 'asc');
                break;
            case 'email_desc':
                $query->orderBy('email', 'desc');
                break;
            case 'latest':
            default:
                $query->latest();
                break;
        }

        // Export to CSV
        if ($request->input('export') === 'csv') {
            $subscribers = $query->get();
            $filename = 'newsletter_subscribers_'.date('Ymd_His').'.csv';

            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            ];

            return response()->stream(function () use ($subscribers) {
                $handle = fopen('php://output', 'w');
                fputcsv($handle, ['ID', 'Email', 'Status', 'Source', 'Subscribed At', 'Unsubscribed At', 'IP Address']);
                foreach ($subscribers as $sub) {
                    fputcsv($handle, [
                        $sub->id,
                        $sub->email,
                        $sub->status,
                        $sub->source,
                        $sub->subscribed_at ? $sub->subscribed_at->toDateTimeString() : '',
                        $sub->unsubscribed_at ? $sub->unsubscribed_at->toDateTimeString() : '',
                        $sub->ip_address,
                    ]);
                }
                fclose($handle);
            }, 200, $headers);
        }

        // Dashboard Stats
        $stats = [
            'total_subscribers' => NewsletterSubscriber::count(),
            'active_subscribers' => NewsletterSubscriber::where('status', 'subscribed')->count(),
            'unsubscribed_subscribers' => NewsletterSubscriber::where('status', 'unsubscribed')->count(),
            'recent_subscribers_7d' => NewsletterSubscriber::where('created_at', '>=', now()->subDays(7))->count(),
        ];

        // All vs Paginated
        if ($request->input('all') === 'true') {
            return response()->json([
                'success' => true,
                'stats' => $stats,
                'data' => $query->get(),
            ]);
        }

        $perPage = (int) $request->input('per_page', 20);
        $paginated = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'stats' => $stats,
            'data' => $paginated->items(),
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email|max:255|unique:newsletter_subscribers,email',
            'status' => 'nullable|in:subscribed,unsubscribed',
            'source' => 'nullable|string|max:50',
        ]);

        $subscriber = NewsletterSubscriber::create([
            'email' => strtolower(trim($validated['email'])),
            'status' => $validated['status'] ?? 'subscribed',
            'source' => $validated['source'] ?? 'admin',
            'ip_address' => $request->ip(),
            'subscribed_at' => now(),
        ]);

        if ($request->user()) {
            ActivityLog::record(
                'CREATE_SUBSCRIBER',
                "Manually added newsletter subscriber '{$subscriber->email}'",
                'NewsletterSubscriber',
                $subscriber->id,
                $request->user(),
                $request
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Subscriber email registered successfully',
            'data' => $subscriber,
        ], 201);
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $subscriber = NewsletterSubscriber::findOrFail($id);
        $newStatus = $request->input('status');

        if (! $newStatus) {
            $newStatus = $subscriber->status === 'subscribed' ? 'unsubscribed' : 'subscribed';
        }

        $subscriber->update([
            'status' => $newStatus,
            'unsubscribed_at' => $newStatus === 'unsubscribed' ? now() : null,
            'subscribed_at' => $newStatus === 'subscribed' ? now() : $subscriber->subscribed_at,
        ]);

        if ($request->user()) {
            ActivityLog::record(
                'UPDATE_SUBSCRIBER_STATUS',
                "Changed newsletter subscriber '{$subscriber->email}' status to ".strtoupper($newStatus),
                'NewsletterSubscriber',
                $subscriber->id,
                $request->user(),
                $request
            );
        }

        return response()->json([
            'success' => true,
            'message' => "Subscriber status updated to {$newStatus}",
            'data' => $subscriber,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $subscriber = NewsletterSubscriber::findOrFail($id);
        $email = $subscriber->email;
        $subscriber->delete();

        if ($request->user()) {
            ActivityLog::record(
                'DELETE_SUBSCRIBER',
                "Deleted newsletter subscriber '{$email}'",
                'NewsletterSubscriber',
                $id,
                $request->user(),
                $request
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Subscriber removed successfully',
        ]);
    }
}
