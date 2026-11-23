<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('thyaga_voucher_holds', function (Blueprint $table) {
            $table->id();
            $table->string('redemption_id', 128)->unique();
            $table->string('voucher_code', 64)->nullable();
            $table->decimal('amount', 12, 2);
            // held → used (by an order) | releasing → released / release_failed
            $table->string('status', 20)->default('held');
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->timestamp('expires_at');
            $table->timestamp('released_at')->nullable();
            $table->unsignedTinyInteger('release_attempts')->default(0);
            $table->timestamps();

            $table->index(['status', 'expires_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('thyaga_voucher_holds');
    }
};
