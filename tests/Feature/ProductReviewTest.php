<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProductReviewTest extends TestCase
{
    use RefreshDatabase;

    private function product(): Product
    {
        return Product::create(['name' => 'Gift Hamper', 'slug' => 'gift-hamper', 'regular_price' => 5000, 'is_active' => true]);
    }

    private function customer(string $email = 'nimal@example.com'): User
    {
        return User::create([
            'name' => 'Nimal Perera', 'email' => $email, 'password' => Hash::make('x-pass-123'),
            'role' => 'customer', 'status' => 'active',
        ]);
    }

    private function customerToken(User $user): string
    {
        return $user->createToken('customer-token', ['customer'])->plainTextToken;
    }

    private function adminToken(): string
    {
        return Admin::create([
            'name' => 'Editor', 'email' => 'editor@thyaga.lk', 'password' => Hash::make('admin-pass-123'),
            'role' => 'editor', 'status' => 'active',
        ])->createToken('admin-token', ['admin'])->plainTextToken;
    }

    private function review(Product $product, User $user, int $rating, bool $approved): Review
    {
        return Review::create([
            'product_id' => $product->id, 'user_id' => $user->id, 'user_name' => $user->name, 'user_email' => $user->email,
            'rating' => $rating, 'comment' => 'Lovely hamper, great value.', 'is_approved' => $approved,
        ]);
    }

    public function test_guests_get_401_when_posting_a_review(): void
    {
        $this->postJson("/api/products/{$this->product()->slug}/reviews", ['rating' => 5, 'comment' => 'Great product!'])
            ->assertUnauthorized();
    }

    public function test_admin_tokens_get_403_when_posting_a_customer_review(): void
    {
        $this->withToken($this->adminToken())
            ->postJson("/api/products/{$this->product()->slug}/reviews", ['rating' => 5, 'comment' => 'Great product!'])
            ->assertForbidden();
    }

    public function test_rating_outside_one_to_five_returns_422(): void
    {
        $this->withToken($this->customerToken($this->customer()))
            ->postJson("/api/products/{$this->product()->slug}/reviews", ['rating' => 6, 'comment' => 'Great product!'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['rating' => 'The rating field must be between 1 and 5.']);
    }

    public function test_comment_shorter_than_ten_characters_returns_422(): void
    {
        $this->withToken($this->customerToken($this->customer()))
            ->postJson("/api/products/{$this->product()->slug}/reviews", ['rating' => 4, 'comment' => 'Nice'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['comment' => 'The comment field must be at least 10 characters.']);
    }

    public function test_new_review_waits_for_approval_and_is_not_public(): void
    {
        $product = $this->product();
        $user = $this->customer();

        $this->withToken($this->customerToken($user))
            ->postJson("/api/products/{$product->slug}/reviews", ['rating' => 4, 'title' => 'Good', 'comment' => 'Nicely packed and on time.'])
            ->assertCreated()
            ->assertJsonPath('data.is_approved', false)
            ->assertJsonPath('data.is_verified_purchase', false);

        $this->assertDatabaseHas('reviews', ['product_id' => $product->id, 'user_id' => $user->id, 'rating' => 4, 'is_approved' => false]);
        $this->getJson("/api/products/{$product->slug}/reviews")->assertJsonCount(0, 'data')->assertJsonPath('summary.count', 0);
    }

    public function test_review_is_marked_verified_when_the_customer_ordered_the_product(): void
    {
        $product = $this->product();
        $user = $this->customer();
        $order = Order::create([
            'order_number' => 'THY-TEST-0001', 'user_id' => $user->id, 'customer_name' => $user->name, 'customer_email' => $user->email,
            'customer_phone' => '0771234567', 'shipping_address' => '1 Main St', 'shipping_city' => 'Colombo',
            'subtotal' => 5000, 'total' => 5000, 'payment_method' => 'cod', 'order_status' => 'delivered',
        ]);
        OrderItem::create(['order_id' => $order->id, 'product_id' => $product->id, 'product_name' => $product->name, 'unit_price' => 5000, 'quantity' => 1, 'total_price' => 5000]);

        $this->withToken($this->customerToken($user))
            ->postJson("/api/products/{$product->slug}/reviews", ['rating' => 5, 'comment' => 'Exactly as pictured, loved it.'])
            ->assertCreated()
            ->assertJsonPath('data.is_verified_purchase', true);
    }

    public function test_approving_a_review_publishes_it_and_updates_the_product_rating(): void
    {
        $product = $this->product();
        $this->review($product, $this->customer('a@example.com'), 4, true);
        $pending = $this->review($product, $this->customer('b@example.com'), 2, false);
        $product->refreshRatingStats();

        $this->withToken($this->adminToken())
            ->patchJson("/api/admin/reviews/{$pending->id}/status", ['is_approved' => true])
            ->assertOk();

        $this->assertSame(2, $product->fresh()->reviews_count);
        $this->assertSame('3.00', (string) $product->fresh()->rating_avg);
        $this->getJson("/api/products/{$product->slug}/reviews")
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('summary.distribution.4', 1)
            ->assertJsonPath('summary.distribution.2', 1)
            ->assertJsonPath('summary.distribution.5', 0);
    }

    public function test_editing_an_approved_review_sends_it_back_for_approval_without_duplicating_it(): void
    {
        $product = $this->product();
        $user = $this->customer();
        $this->review($product, $user, 5, true);
        $product->refreshRatingStats();

        $this->withToken($this->customerToken($user))
            ->postJson("/api/products/{$product->slug}/reviews", ['rating' => 3, 'comment' => 'Changed my mind a little.'])
            ->assertOk();

        $this->assertSame(1, Review::where('product_id', $product->id)->count());
        $this->assertDatabaseHas('reviews', ['product_id' => $product->id, 'rating' => 3, 'is_approved' => false]);
        $this->assertSame(0, $product->fresh()->reviews_count);
    }

    public function test_customer_deletes_their_own_review(): void
    {
        $product = $this->product();
        $user = $this->customer();
        $review = $this->review($product, $user, 5, true);

        $this->withToken($this->customerToken($user))->deleteJson("/api/products/{$product->slug}/reviews/mine")->assertOk();

        $this->assertModelMissing($review);
    }

    public function test_public_reviews_do_not_expose_reviewer_emails(): void
    {
        $product = $this->product();
        $this->review($product, $this->customer(), 5, true);

        $response = $this->getJson("/api/products/{$product->slug}/reviews")->assertOk();

        $this->assertStringNotContainsString('nimal@example.com', $response->getContent());
        $this->assertStringNotContainsString('nimal@example.com', $this->getJson("/api/products/{$product->slug}")->getContent());
    }

    public function test_customers_get_403_on_the_moderation_queue(): void
    {
        $this->withToken($this->customerToken($this->customer()))->getJson('/api/admin/reviews')->assertForbidden();
    }

    public function test_admin_sees_pending_reviews_with_reviewer_email(): void
    {
        $product = $this->product();
        $this->review($product, $this->customer('a@example.com'), 4, true);
        $this->review($product, $this->customer('pending@example.com'), 2, false);

        $this->withToken($this->adminToken())->getJson('/api/admin/reviews?status=pending')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.user_email', 'pending@example.com')
            ->assertJsonPath('counts.pending', 1)
            ->assertJsonPath('counts.approved', 1);
    }

    public function test_admin_deleting_an_approved_review_updates_the_product_rating(): void
    {
        $product = $this->product();
        $review = $this->review($product, $this->customer(), 5, true);
        $product->refreshRatingStats();

        $this->withToken($this->adminToken())->deleteJson("/api/admin/reviews/{$review->id}")->assertOk();

        $this->assertModelMissing($review);
        $this->assertSame(0, $product->fresh()->reviews_count);
    }
}
