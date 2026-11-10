<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\HeroBannerImage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class HeroBannerImageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake(HeroBannerImage::DISK);
    }

    private function adminToken(): string
    {
        return Admin::create([
            'name' => 'Editor', 'email' => 'editor@thyaga.lk', 'password' => Hash::make('admin-pass-123'),
            'role' => 'editor', 'status' => 'active',
        ])->createToken('admin-token', ['admin'])->plainTextToken;
    }

    public function test_storefront_defaults_to_the_3d_banner(): void
    {
        $this->getJson('/api/hero-banner')
            ->assertOk()
            ->assertJsonPath('data.mode', '3d')
            ->assertJsonCount(5, 'data.slides')
            ->assertJsonCount(0, 'data.images');
    }

    public function test_admin_can_switch_the_hero_to_the_image_carousel(): void
    {
        $this->withToken($this->adminToken())
            ->putJson('/api/admin/hero-banner/mode', ['mode' => 'images'])
            ->assertOk();

        $this->getJson('/api/hero-banner')->assertJsonPath('data.mode', 'images');
    }

    public function test_mode_must_be_a_known_value(): void
    {
        $this->withToken($this->adminToken())
            ->putJson('/api/admin/hero-banner/mode', ['mode' => 'video'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('mode');
    }

    public function test_admin_can_upload_update_reorder_and_delete_images(): void
    {
        $token = $this->adminToken();

        $first = $this->withToken($token)->post('/api/admin/hero-banner/images', [
            'image' => UploadedFile::fake()->image('first.jpg', 1200, 500),
            'alt_text' => 'Avurudu sale',
            'title' => 'Home',
            'subtitle' => 'Everything Your Home Needs',
            'cta_text' => 'Shop Home',
            'link' => '/shop?category=home',
        ], ['Accept' => 'application/json'])->assertCreated()
            ->assertJsonPath('data.title', 'Home')
            ->assertJsonPath('data.cta_text', 'Shop Home');

        $path = $first->json('data.image_path');
        Storage::disk(HeroBannerImage::DISK)->assertExists($path);
        $this->assertSame('/uploads/'.$path, $first->json('data.image_url'));

        $secondId = $this->withToken($token)->post('/api/admin/hero-banner/images', [
            'image' => UploadedFile::fake()->image('second.png'),
        ], ['Accept' => 'application/json'])->assertCreated()->json('data.id');

        $this->withToken($token)->putJson("/api/admin/hero-banner/images/{$secondId}", ['is_active' => false, 'cta_text' => 'Shop Beauty'])
            ->assertOk()->assertJsonPath('data.is_active', false)->assertJsonPath('data.cta_text', 'Shop Beauty');

        $this->getJson('/api/hero-banner')
            ->assertJsonCount(1, 'data.images')
            ->assertJsonPath('data.images.0.alt_text', 'Avurudu sale');

        $this->withToken($token)->putJson('/api/admin/hero-banner/images/reorder', ['ids' => [$secondId, $first->json('data.id')]])
            ->assertOk()->assertJsonPath('data.0.id', $secondId);

        $this->withToken($token)->deleteJson('/api/admin/hero-banner/images/'.$first->json('data.id'))->assertOk();

        Storage::disk(HeroBannerImage::DISK)->assertMissing($path);
        $this->assertDatabaseCount('hero_banner_images', 1);
    }

    public function test_upload_rejects_non_image_files_unsafe_links_and_long_button_text(): void
    {
        $token = $this->adminToken();

        $this->withToken($token)->post('/api/admin/hero-banner/images', [
            'image' => UploadedFile::fake()->create('banner.svg', 10, 'image/svg+xml'),
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('image');

        $this->withToken($token)->post('/api/admin/hero-banner/images', [
            'image' => UploadedFile::fake()->image('ok.jpg'),
            'link' => 'javascript:alert(1)',
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('link');

        $this->withToken($token)->post('/api/admin/hero-banner/images', [
            'image' => UploadedFile::fake()->image('ok.jpg'),
            'cta_text' => str_repeat('x', 31),
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('cta_text');

        $this->assertDatabaseCount('hero_banner_images', 0);
    }

    public function test_customers_and_guests_cannot_manage_the_hero_banner(): void
    {
        $this->putJson('/api/admin/hero-banner/mode', ['mode' => 'images'])->assertUnauthorized();

        $customer = User::create([
            'name' => 'C', 'email' => 'c@example.com', 'password' => Hash::make('x-pass-123'),
            'role' => 'customer', 'status' => 'active',
        ])->createToken('customer-token', ['customer'])->plainTextToken;

        $this->withToken($customer)->putJson('/api/admin/hero-banner/mode', ['mode' => 'images'])->assertForbidden();
        $this->withToken($customer)->post('/api/admin/hero-banner/images', [
            'image' => UploadedFile::fake()->image('x.jpg'),
        ], ['Accept' => 'application/json'])->assertForbidden();
    }
}
