<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('product_id')->constrained('users')->nullOnDelete();
            $table->string('title', 120)->nullable()->after('rating');
            $table->boolean('is_verified_purchase')->default(false)->after('is_approved');
            $table->unique(['product_id', 'user_id']);
        });

        // New products start unrated; ratings now come only from approved customer reviews.
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('rating_avg', 3, 2)->default(0)->change();
        });

        // The previous ratings were placeholder seed values with no reviews behind them.
        DB::table('products')->update(['rating_avg' => 0, 'reviews_count' => 0]);
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('rating_avg', 3, 2)->default(4.80)->change();
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropUnique(['product_id', 'user_id']);
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn(['title', 'is_verified_purchase']);
        });
    }
};
