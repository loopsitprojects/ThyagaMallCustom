<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\OrderNotificationRecipient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The list of addresses that receive new-order emails (SMTP itself is configured in .env).
 */
class AdminEmailSettingsController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => OrderNotificationRecipient::orderBy('email')->get(),
        ]);
    }

    public function storeRecipient(Request $request): JsonResponse
    {
        $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);

        $validated = $request->validate([
            'email' => 'required|email|max:255|unique:order_notification_recipients,email',
            'name' => 'nullable|string|max:100',
        ], [
            'email.unique' => 'This email already receives order notifications.',
        ]);

        $recipient = OrderNotificationRecipient::create($validated);

        ActivityLog::record('ADD_ORDER_EMAIL_RECIPIENT', "Added order notification email {$recipient->email}", 'OrderNotificationRecipient', $recipient->id, $request->user(), $request);

        return response()->json([
            'success' => true,
            'message' => "{$recipient->email} will now receive new order emails",
            'data' => $recipient,
        ], 201);
    }

    public function updateRecipient(Request $request, int $id): JsonResponse
    {
        $recipient = OrderNotificationRecipient::findOrFail($id);
        $validated = $request->validate([
            'is_active' => 'required|boolean',
        ]);

        $recipient->update($validated);

        ActivityLog::record('UPDATE_ORDER_EMAIL_RECIPIENT', ($recipient->is_active ? 'Resumed' : 'Paused')." order notification emails for {$recipient->email}", 'OrderNotificationRecipient', $recipient->id, $request->user(), $request);

        return response()->json([
            'success' => true,
            'message' => $recipient->is_active ? "Emails resumed for {$recipient->email}" : "Emails paused for {$recipient->email}",
            'data' => $recipient,
        ]);
    }

    public function destroyRecipient(Request $request, int $id): JsonResponse
    {
        $recipient = OrderNotificationRecipient::findOrFail($id);
        $recipient->delete();

        ActivityLog::record('DELETE_ORDER_EMAIL_RECIPIENT', "Removed order notification email {$recipient->email}", 'OrderNotificationRecipient', $id, $request->user(), $request);

        return response()->json([
            'success' => true,
            'message' => "{$recipient->email} removed",
        ]);
    }
}
