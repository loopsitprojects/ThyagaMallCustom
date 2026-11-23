<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Give unused Thyāga gift voucher holds back to the voucher (needs the server cron running `php artisan schedule:run`).
Schedule::command('thyaga:release-expired-holds')->everyMinute()->withoutOverlapping();
