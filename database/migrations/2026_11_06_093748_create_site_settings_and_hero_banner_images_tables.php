<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        Schema::create('hero_banner_images', function (Blueprint $table) {
            $table->id();
            $table->string('image_path', 255);
            $table->string('alt_text', 120)->nullable();
            $table->string('title', 60)->nullable();
            $table->string('subtitle', 160)->nullable();
            $table->string('cta_text', 30)->nullable();
            $table->string('link', 255)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hero_banner_images');
        Schema::dropIfExists('site_settings');
    }
};
