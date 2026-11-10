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
        Schema::table('brands', function (Blueprint $table) {
            if (! Schema::hasColumn('brands', 'website_url')) {
                $table->string('website_url', 500)->nullable()->after('logo');
            }
            if (! Schema::hasColumn('brands', 'description')) {
                $table->text('description')->nullable()->after('website_url');
            }
            if (! Schema::hasColumn('brands', 'sort_order')) {
                $table->integer('sort_order')->default(0)->after('description');
            }
            if (! Schema::hasColumn('brands', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('is_featured');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('brands', function (Blueprint $table) {
            $columnsToDrop = [];
            foreach (['website_url', 'description', 'sort_order', 'is_active'] as $col) {
                if (Schema::hasColumn('brands', $col)) {
                    $columnsToDrop[] = $col;
                }
            }
            if (! empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
