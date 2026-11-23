<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

class NotFoundPageTest extends TestCase
{
    private string $publicPath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->publicPath = storage_path('framework/testing/public-'.uniqid());
        File::ensureDirectoryExists($this->publicPath);
        File::put($this->publicPath.'/404.html', '<html><body>Storefront 404 marker</body></html>');
        $this->app->usePublicPath($this->publicPath);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->publicPath);

        parent::tearDown();
    }

    public function test_unknown_page_shows_the_storefront_404_page_with_a_404_status(): void
    {
        $response = $this->get('/this-page-does-not-exist');

        $response->assertNotFound();
        $this->assertStringContainsString('Storefront 404 marker', $response->baseResponse->getFile()->getContent());
    }

    public function test_unknown_api_path_still_returns_json(): void
    {
        $this->getJson('/api/this-endpoint-does-not-exist')
            ->assertNotFound()
            ->assertHeader('Content-Type', 'application/json');
    }

    public function test_plain_404_is_used_when_the_built_page_is_missing(): void
    {
        File::delete($this->publicPath.'/404.html');

        $this->get('/this-page-does-not-exist')->assertNotFound();
    }
}
