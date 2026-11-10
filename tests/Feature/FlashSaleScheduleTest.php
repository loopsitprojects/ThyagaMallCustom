<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\FlashSale;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class FlashSaleScheduleTest extends TestCase
{
    use RefreshDatabase;

    public function test_utc_times_from_the_admin_are_stored_in_sri_lanka_time(): void
    {
        $token = Admin::create([
            'name' => 'Admin', 'email' => 'admin@thyaga.lk', 'password' => Hash::make('admin-pass-123'),
            'role' => 'super_admin', 'status' => 'active',
        ])->createToken('admin-token', ['admin'])->plainTextToken;

        // 10:00 → 18:00 in Colombo, as the browser sends it (UTC ISO strings)
        $this->withToken($token)->postJson('/api/admin/flash-sales', [
            'title' => 'Avurudu Deals', 'start_time' => '2026-10-29T04:30:00.000Z', 'end_time' => '2026-10-29T12:30:00.000Z', 'is_active' => true,
        ])->assertCreated();

        $sale = FlashSale::firstOrFail();
        $this->assertSame('2026-10-29 10:00:00', $sale->getRawOriginal('start_time'));
        $this->assertSame('2026-10-29 18:00:00', $sale->getRawOriginal('end_time'));

        $this->travelTo(Carbon::parse('2026-10-29 09:59:00', 'Asia/Colombo'));
        $this->assertFalse($sale->fresh()->is_currently_active);

        $this->travelTo(Carbon::parse('2026-10-29 10:01:00', 'Asia/Colombo'));
        $this->assertTrue($sale->fresh()->is_currently_active);
    }
}
