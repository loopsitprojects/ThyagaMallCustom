<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('home_section_products', function (Blueprint $table) {
            $table->id();
            $table->string('section', 30);
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['section', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('home_section_products');
    }
};
