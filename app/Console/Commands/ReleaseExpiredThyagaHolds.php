<?php

namespace App\Console\Commands;

use App\Models\ThyagaVoucherHold;
use App\Services\ThyagaVoucherService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Gives unused Thyāga voucher holds back to the voucher (e.g. the shopper verified the OTP,
 * then left or refreshed checkout without ordering). Runs every minute from the scheduler.
 */
class ReleaseExpiredThyagaHolds extends Command
{
    protected $signature = 'thyaga:release-expired-holds';

    protected $description = 'Release Thyāga gift voucher holds that expired without being used in an order';

    /**
     * Thyāga error codes meaning the hold is already gone, so there is nothing left to release.
     */
    private const ALREADY_GONE = ['CANCELLED', 'EXPIRED'];

    public function handle(ThyagaVoucherService $thyaga): int
    {
        if (! $thyaga->isConfigured()) {
            $this->warn('Thyāga voucher API is not configured; nothing released.');

            return self::SUCCESS;
        }

        $released = 0;
        $failed = 0;

        $expiredIds = ThyagaVoucherHold::where('status', ThyagaVoucherHold::STATUS_HELD)
            ->where('expires_at', '<=', now())
            ->orderBy('expires_at')
            ->limit(100)
            ->pluck('id');

        foreach ($expiredIds as $id) {
            // Claim the hold first, so an order placed at the same moment can't also use it.
            $claimed = ThyagaVoucherHold::whereKey($id)
                ->where('status', ThyagaVoucherHold::STATUS_HELD)
                ->update(['status' => ThyagaVoucherHold::STATUS_RELEASING]);

            if ($claimed === 0) {
                continue;
            }

            $hold = ThyagaVoucherHold::findOrFail($id);
            $hold->increment('release_attempts');
            $result = $thyaga->cancelRedemption($hold->redemption_id);

            if ($result['success'] || in_array($result['error_code'] ?? null, self::ALREADY_GONE, true)) {
                $hold->update(['status' => ThyagaVoucherHold::STATUS_RELEASED, 'released_at' => now()]);
                $released++;

                continue;
            }

            $gaveUp = $hold->release_attempts >= ThyagaVoucherHold::MAX_RELEASE_ATTEMPTS;
            // Try again on the next run, unless it has failed too many times.
            $hold->update(['status' => $gaveUp ? ThyagaVoucherHold::STATUS_RELEASE_FAILED : ThyagaVoucherHold::STATUS_HELD]);
            $failed++;

            if ($gaveUp) {
                Log::error('Thyāga voucher hold could not be released', [
                    'hold_id' => $hold->id,
                    'error_code' => $result['error_code'] ?? null,
                ]);
            }
        }

        $this->info("Released {$released} expired Thyāga voucher hold(s); {$failed} failed.");

        return self::SUCCESS;
    }
}
