<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\User;
use App\Services\OnboardingAdSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OnboardingAdTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake(OnboardingAdSettings::DISK);
    }

    private function adminToken(): string
    {
        return Admin::create([
            'name' => 'Editor', 'email' => 'editor@thyaga.lk', 'password' => Hash::make('admin-pass-123'),
            'role' => 'editor', 'status' => 'active',
        ])->createToken('admin-token', ['admin'])->plainTextToken;
    }

    private function uploadImage(string $token): string
    {
        return $this->withToken($token)->post('/api/admin/onboarding-ad/image', [
            'image' => UploadedFile::fake()->image('ad.jpg', 800, 600),
        ], ['Accept' => 'application/json'])->assertOk()->json('data.image_path');
    }

    public function test_ad_is_hidden_from_the_storefront_until_enabled(): void
    {
        $this->getJson('/api/onboarding-ad')->assertOk()->assertJsonPath('data', null);
    }

    public function test_admin_can_customise_and_publish_the_ad(): void
    {
        $token = $this->adminToken();

        $this->withToken($token)->putJson('/api/admin/onboarding-ad', [
            'enabled' => true,
            'title' => 'Avurudu Welcome Gift',
            'coupon_code' => 'WELCOME1000',
            'cta_link' => '/shop?category=home',
            'delay_seconds' => 5,
            'frequency' => 'daily',
            'pages' => 'home',
        ])->assertOk();

        $this->getJson('/api/onboarding-ad')
            ->assertJsonPath('data.title', 'Avurudu Welcome Gift')
            ->assertJsonPath('data.coupon_code', 'WELCOME1000')
            ->assertJsonPath('data.frequency', 'daily')
            ->assertJsonPath('data.pages', 'home')
            ->assertJsonPath('data.cta_text', 'Start Shopping')
            ->assertJsonMissingPath('data.image_path');
    }

    public function test_every_save_bumps_the_version_so_visitors_see_the_new_ad(): void
    {
        $token = $this->adminToken();

        $first = $this->withToken($token)->putJson('/api/admin/onboarding-ad', ['enabled' => true])->json('data.version');
        $second = $this->withToken($token)->putJson('/api/admin/onboarding-ad', ['title' => 'New offer'])->json('data.version');

        $this->assertSame($first + 1, $second);
    }

    public function test_settings_are_validated(): void
    {
        $this->withToken($this->adminToken())->putJson('/api/admin/onboarding-ad', [
            'cta_link' => 'javascript:alert(1)',
            'accent_color' => 'purple',
            'delay_seconds' => 120,
            'frequency' => 'hourly',
        ])->assertUnprocessable()->assertJsonValidationErrors(['cta_link', 'accent_color', 'delay_seconds', 'frequency']);
    }

    public function test_image_only_ad_cannot_go_live_without_an_image(): void
    {
        $this->withToken($this->adminToken())
            ->putJson('/api/admin/onboarding-ad', ['enabled' => true, 'layout' => 'image'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('layout');

        $this->getJson('/api/onboarding-ad')->assertJsonPath('data', null);
    }

    public function test_uploading_a_new_image_replaces_and_deletes_the_old_file(): void
    {
        $token = $this->adminToken();

        $old = $this->uploadImage($token);
        $new = $this->uploadImage($token);

        Storage::disk(OnboardingAdSettings::DISK)->assertMissing($old);
        Storage::disk(OnboardingAdSettings::DISK)->assertExists($new);

        $this->withToken($token)->putJson('/api/admin/onboarding-ad', ['enabled' => true, 'layout' => 'image'])->assertOk();
        $this->getJson('/api/onboarding-ad')->assertJsonPath('data.image_url', '/uploads/'.$new);
    }

    public function test_image_of_a_live_image_only_ad_cannot_be_removed(): void
    {
        $token = $this->adminToken();
        $path = $this->uploadImage($token);
        $this->withToken($token)->putJson('/api/admin/onboarding-ad', ['enabled' => true, 'layout' => 'image'])->assertOk();

        $this->withToken($token)->deleteJson('/api/admin/onboarding-ad/image')->assertUnprocessable();
        Storage::disk(OnboardingAdSettings::DISK)->assertExists($path);

        $this->withToken($token)->putJson('/api/admin/onboarding-ad', ['layout' => 'split'])->assertOk();
        $this->withToken($token)->deleteJson('/api/admin/onboarding-ad/image')->assertOk()->assertJsonPath('data.image_url', null);
        Storage::disk(OnboardingAdSettings::DISK)->assertMissing($path);
    }

    public function test_upload_rejects_svg_files(): void
    {
        $this->withToken($this->adminToken())->post('/api/admin/onboarding-ad/image', [
            'image' => UploadedFile::fake()->create('ad.svg', 10, 'image/svg+xml'),
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('image');
    }

    public function test_customers_and_guests_cannot_change_the_ad(): void
    {
        $this->putJson('/api/admin/onboarding-ad', ['enabled' => true])->assertUnauthorized();

        $customer = User::create([
            'name' => 'C', 'email' => 'c@example.com', 'password' => Hash::make('x-pass-123'),
            'role' => 'customer', 'status' => 'active',
        ])->createToken('customer-token', ['customer'])->plainTextToken;

        $this->withToken($customer)->putJson('/api/admin/onboarding-ad', ['enabled' => true])->assertForbidden();
        $this->getJson('/api/onboarding-ad')->assertJsonPath('data', null);
    }
}
