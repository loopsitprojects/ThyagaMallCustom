import {
  Brand,
  BrandInput,
  Category,
  Product,
  FlashSale,
  Order,
  Admin,
  ManagedUser,
  Merchant,
  NewsletterSubscriber,
  ActivityLogItem,
  CustomerAuthUser,
  CustomerAuthResponse,
  ThyagaVoucherDetails,
  ThyagaRedemption,
  HeroSlide,
  HeroSlideInput,
  HeroMode,
  HeroBannerImage,
  HeroBannerConfig,
  HomeSection,
  ProductWithRestockRequests,
  OnboardingAd,
  OnboardingAdInput,
  StorePickup,
  CategoryInput,
  ProductReview,
  ReviewSummary,
  OrderEmailRecipient,
  MerchantWaybill,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001/api';

async function fetcher<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store', // dynamic for ecommerce freshness
  });

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed with status ${res.status}`);
  }

  return json;
}

// Public API
export const api = {
  // Customer Authentication APIs
  async customerRegister(data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    password_confirmation: string;
  }): Promise<CustomerAuthResponse> {
    return fetcher('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async customerLogin(data: {
    email: string;
    password: string;
  }): Promise<CustomerAuthResponse> {
    return fetcher('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async customerGetMe(token: string): Promise<{ success: boolean; user: CustomerAuthUser }> {
    return fetcher('/user/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async customerGetOrders(token: string): Promise<{
    success: boolean;
    data: any[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }> {
    return fetcher('/user/orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async customerLogout(token: string): Promise<{ success: boolean; message: string }> {
    return fetcher('/user/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  // Brands
  async getBrands(params?: { featured?: boolean }): Promise<{ success: boolean; data: Brand[] }> {
    const qs = params?.featured ? '?featured=1' : '';
    return fetcher(`/brands${qs}`);
  },

  async getBrand(slug: string): Promise<{ success: boolean; data: { brand: Brand; products: { data: Product[] } } }> {
    return fetcher(`/brands/${slug}`);
  },

  // Categories
  async getCategories(): Promise<{ success: boolean; data: Category[] }> {
    return fetcher('/categories');
  },

  async getCategory(slug: string): Promise<{ success: boolean; data: Category }> {
    return fetcher(`/categories/${slug}`);
  },

  // Product reviews (customers write one per product; published after admin approval)
  async getProductReviews(slug: string, page: number = 1): Promise<{
    success: boolean;
    data: ProductReview[];
    summary: ReviewSummary;
    pagination: { current_page: number; last_page: number; total: number };
  }> {
    return fetcher(`/products/${encodeURIComponent(slug)}/reviews?page=${page}`);
  },

  async getMyReview(token: string, slug: string): Promise<{ success: boolean; data: ProductReview | null }> {
    return fetcher(`/products/${encodeURIComponent(slug)}/reviews/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async submitReview(token: string, slug: string, data: { rating: number; title?: string; comment: string }): Promise<{ success: boolean; message: string; data: ProductReview }> {
    return fetcher(`/products/${encodeURIComponent(slug)}/reviews`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async deleteMyReview(token: string, slug: string): Promise<{ success: boolean; message: string }> {
    return fetcher(`/products/${encodeURIComponent(slug)}/reviews/mine`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // Admin review moderation
  async getAdminReviews(token: string, params: { status?: 'pending' | 'approved' | 'all'; search?: string; page?: number } = {}): Promise<{
    success: boolean;
    data: ProductReview[];
    counts: { pending: number; approved: number; all: number };
    pagination: { current_page: number; last_page: number; total: number };
  }> {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.search) qs.set('search', params.search);
    if (params.page) qs.set('page', String(params.page));
    return fetcher(`/admin/reviews?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async setAdminReviewStatus(token: string, id: number, isApproved: boolean): Promise<{ success: boolean; message: string; data: ProductReview }> {
    return fetcher(`/admin/reviews/${id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_approved: isApproved }),
    });
  },

  async deleteAdminReview(token: string, id: number): Promise<{ success: boolean; message: string }> {
    return fetcher(`/admin/reviews/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // Admin email settings: new-order notification recipients (super admins only)
  async getEmailSettings(token: string): Promise<{ success: boolean; data: OrderEmailRecipient[] }> {
    return fetcher('/admin/email-settings', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async addOrderEmailRecipient(token: string, data: { email: string; name?: string }): Promise<{ success: boolean; message: string; data: OrderEmailRecipient }> {
    return fetcher('/admin/email-settings/recipients', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async setOrderEmailRecipientActive(token: string, id: number, isActive: boolean): Promise<{ success: boolean; message: string; data: OrderEmailRecipient }> {
    return fetcher(`/admin/email-settings/recipients/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  async deleteOrderEmailRecipient(token: string, id: number): Promise<{ success: boolean; message: string }> {
    return fetcher(`/admin/email-settings/recipients/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // Admin category management (flat list incl. inactive; the UI builds the tree)
  async getAdminCategories(token: string): Promise<{ success: boolean; data: Category[]; icons: string[] }> {
    return fetcher('/admin/categories', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async createAdminCategory(token: string, data: CategoryInput): Promise<{ success: boolean; message: string; data: Category }> {
    return fetcher('/admin/categories', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async updateAdminCategory(token: string, id: number, data: CategoryInput): Promise<{ success: boolean; message: string; data: Category }> {
    return fetcher(`/admin/categories/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async deleteAdminCategory(token: string, id: number): Promise<{ success: boolean; message: string }> {
    return fetcher(`/admin/categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async reorderAdminCategories(token: string, ids: number[]): Promise<{ success: boolean; message: string }> {
    return fetcher('/admin/categories/reorder', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids }),
    });
  },

  // Admin Brands Management
  async getAdminBrands(token: string, params?: { search?: string; status?: string; featured?: boolean }): Promise<{
    success: boolean;
    data: Brand[];
    stats: { total: number; featured: number; active: number; inactive: number };
  }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.featured !== undefined) query.set('featured', params.featured ? '1' : '0');
    const qs = query.toString() ? `?${query.toString()}` : '';

    return fetcher(`/admin/brands${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async createAdminBrand(token: string, data: BrandInput): Promise<{ success: boolean; message: string; data: Brand }> {
    return fetcher('/admin/brands', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async updateAdminBrand(token: string, id: number, data: BrandInput): Promise<{ success: boolean; message: string; data: Brand }> {
    return fetcher(`/admin/brands/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async toggleAdminBrandFeatured(token: string, id: number): Promise<{ success: boolean; message: string; data: Brand }> {
    return fetcher(`/admin/brands/${id}/toggle-featured`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async toggleAdminBrandStatus(token: string, id: number): Promise<{ success: boolean; message: string; data: Brand }> {
    return fetcher(`/admin/brands/${id}/toggle-status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async deleteAdminBrand(token: string, id: number): Promise<{ success: boolean; message: string }> {
    return fetcher(`/admin/brands/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async reorderAdminBrands(token: string, ids: number[]): Promise<{ success: boolean; message: string; data: Brand[] }> {
    return fetcher('/admin/brands/reorder', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids }),
    });
  },

  // Products
  async getProducts(params: {
    search?: string;
    category?: string;
    brand?: string;
    min_price?: number;
    max_price?: number;
    sort?: string;
    page?: number;
    per_page?: number;
    featured?: boolean;
  } = {}): Promise<{
    success: boolean;
    data: Product[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category) query.append('category', params.category);
    if (params.brand) query.append('brand', params.brand);
    if (params.min_price) query.append('min_price', params.min_price.toString());
    if (params.max_price) query.append('max_price', params.max_price.toString());
    if (params.sort) query.append('sort', params.sort);
    if (params.page) query.append('page', params.page.toString());
    if (params.per_page) query.append('per_page', params.per_page.toString());
    if (params.featured) query.append('featured', '1');

    const qs = query.toString();
    return fetcher(`/products${qs ? `?${qs}` : ''}`);
  },

  async getFeaturedProducts(): Promise<{ success: boolean; data: Product[] }> {
    return fetcher('/products/featured');
  },

  async getProduct(slug: string): Promise<{
    success: boolean;
    data: {
      product: Product;
      related: Product[];
    };
  }> {
    return fetcher(`/products/${slug}`);
  },

  // Flash Sale
  async getActiveFlashSale(): Promise<{ success: boolean; data: FlashSale | null }> {
    return fetcher('/flash-sale/active');
  },

  // Voucher
  async applyVoucher(code: string, subtotal: number): Promise<{
    success: boolean;
    data: {
      code: string;
      title: string;
      discount: number;
      new_total: number;
    };
    message: string;
  }> {
    return fetcher('/vouchers/apply', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    });
  },

  // Thyāga (GYF) Gift Voucher API
  async getThyagaVoucherDetails(code: string): Promise<{
    success: boolean;
    data?: ThyagaVoucherDetails;
    message: string;
    error_code?: string;
  }> {
    return fetcher(`/vouchers/thyaga/details/${encodeURIComponent(code)}`);
  },

  async initiateThyagaRedemption(voucherId: string, amount: number): Promise<{
    success: boolean;
    data?: { redemptionId: string; status: string };
    message: string;
    error_code?: string;
  }> {
    return fetcher('/vouchers/thyaga/initiate', {
      method: 'POST',
      body: JSON.stringify({ voucher_id: voucherId, amount }),
    });
  },

  async verifyThyagaOtp(redemptionId: string, amount: number, otp: string): Promise<{
    success: boolean;
    data?: { redemptionId: string; status: string; amount: number };
    message: string;
    error_code?: string;
  }> {
    return fetcher('/vouchers/thyaga/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ redemption_id: redemptionId, amount, otp }),
    });
  },

  async cancelThyagaRedemption(redemptionId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return fetcher('/vouchers/thyaga/cancel', {
      method: 'POST',
      body: JSON.stringify({ redemption_id: redemptionId }),
    });
  },

  // Homepage hero slides
  async getHeroSlides(): Promise<{ success: boolean; data: HeroSlide[] }> {
    return fetcher('/hero-slides');
  },

  async getAdminHeroSlides(token: string): Promise<{ success: boolean; data: HeroSlide[] }> {
    return fetcher('/admin/hero-slides', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async createAdminHeroSlide(token: string, data: HeroSlideInput): Promise<{ success: boolean; message: string; data: HeroSlide }> {
    return fetcher('/admin/hero-slides', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async updateAdminHeroSlide(token: string, id: number, data: Partial<HeroSlideInput>): Promise<{ success: boolean; message: string; data: HeroSlide }> {
    return fetcher(`/admin/hero-slides/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async deleteAdminHeroSlide(token: string, id: number): Promise<{ success: boolean; message: string }> {
    return fetcher(`/admin/hero-slides/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async reorderAdminHeroSlides(token: string, ids: number[]): Promise<{ success: boolean; message: string; data: HeroSlide[] }> {
    return fetcher('/admin/hero-slides/reorder', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids }),
    });
  },

  // Homepage hero: mode switch (3D / image carousel) + carousel images
  async getHeroBanner(): Promise<{ success: boolean; data: HeroBannerConfig }> {
    return fetcher('/hero-banner');
  },

  async getAdminHeroBanner(token: string): Promise<{ success: boolean; data: { mode: HeroMode; images: HeroBannerImage[] } }> {
    return fetcher('/admin/hero-banner', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async updateAdminHeroMode(token: string, mode: HeroMode): Promise<{ success: boolean; message: string; data: { mode: HeroMode } }> {
    return fetcher('/admin/hero-banner/mode', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode }),
    });
  },

  async uploadAdminHeroImage(
    token: string,
    file: File,
    data: { alt_text?: string; title?: string; subtitle?: string; cta_text?: string; link?: string }
  ): Promise<{ success: boolean; message: string; data: HeroBannerImage }> {
    const formData = new FormData();
    formData.append('image', file);
    Object.entries(data).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });

    const res = await fetch(`${API_BASE}/admin/hero-banner/images`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      const firstError = json.errors ? (Object.values(json.errors)[0] as string[])?.[0] : undefined;
      throw new Error(firstError || json.message || 'Image upload failed');
    }
    return json;
  },

  async updateAdminHeroImage(
    token: string,
    id: number,
    data: Partial<Pick<HeroBannerImage, 'alt_text' | 'title' | 'subtitle' | 'cta_text' | 'link' | 'is_active'>>
  ): Promise<{ success: boolean; message: string; data: HeroBannerImage }> {
    return fetcher(`/admin/hero-banner/images/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async deleteAdminHeroImage(token: string, id: number): Promise<{ success: boolean; message: string }> {
    return fetcher(`/admin/hero-banner/images/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async reorderAdminHeroImages(token: string, ids: number[]): Promise<{ success: boolean; message: string; data: HeroBannerImage[] }> {
    return fetcher('/admin/hero-banner/images/reorder', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids }),
    });
  },

  // "Notify me when back in stock"
  async requestRestockAlert(productSlug: string, email: string): Promise<{ success: boolean; message: string }> {
    return fetcher(`/products/${encodeURIComponent(productSlug)}/restock-alerts`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async getAdminRestockRequests(token: string, params: { page?: number; status?: string; search?: string } = {}): Promise<{
    success: boolean;
    data: ProductWithRestockRequests[];
    stats: { waiting: number; notified: number };
    pagination: { current_page: number; last_page: number; per_page: number; total: number };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    const qs = query.toString();
    return fetcher(`/admin/restock-requests${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async deleteAdminRestockRequest(token: string, id: number): Promise<{ success: boolean; message: string }> {
    return fetcher(`/admin/restock-requests/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // Homepage Trending / Best Sellers: the admin's picks, or automatic products when there are none
  async getHomeSection(section: HomeSection, category?: string): Promise<{ success: boolean; data: Product[]; curated: boolean }> {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return fetcher(`/home-sections/${section}${query}`);
  },

  async getAdminHomeSections(token: string): Promise<{ success: boolean; data: Record<HomeSection, Product[]> }> {
    return fetcher('/admin/home-sections', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async addAdminHomeSectionProduct(token: string, section: HomeSection, productId: number): Promise<{ success: boolean; message: string; data: Product[] }> {
    return fetcher(`/admin/home-sections/${section}/products`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ product_id: productId }),
    });
  },

  async removeAdminHomeSectionProduct(token: string, section: HomeSection, productId: number): Promise<{ success: boolean; message: string; data: Product[] }> {
    return fetcher(`/admin/home-sections/${section}/products/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async reorderAdminHomeSection(token: string, section: HomeSection, ids: number[]): Promise<{ success: boolean; message: string; data: Product[] }> {
    return fetcher(`/admin/home-sections/${section}/reorder`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids }),
    });
  },

  // Storefront welcome pop-up (onboarding ad)
  async getOnboardingAd(): Promise<{ success: boolean; data: OnboardingAd | null }> {
    return fetcher('/onboarding-ad');
  },

  async getAdminOnboardingAd(token: string): Promise<{ success: boolean; data: OnboardingAd }> {
    return fetcher('/admin/onboarding-ad', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async updateAdminOnboardingAd(token: string, data: Partial<OnboardingAdInput>): Promise<{ success: boolean; message: string; data: OnboardingAd }> {
    return fetcher('/admin/onboarding-ad', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async uploadAdminOnboardingAdImage(token: string, file: File): Promise<{ success: boolean; message: string; data: OnboardingAd }> {
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`${API_BASE}/admin/onboarding-ad/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      const firstError = json.errors ? (Object.values(json.errors)[0] as string[])?.[0] : undefined;
      throw new Error(firstError || json.message || 'Image upload failed');
    }
    return json;
  },

  async removeAdminOnboardingAdImage(token: string): Promise<{ success: boolean; message: string; data: OnboardingAd }> {
    return fetcher('/admin/onboarding-ad/image', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // Checkout store pickup location (null when switched off)
  async getStorePickup(): Promise<{ success: boolean; data: StorePickup | null }> {
    return fetcher('/store-pickup');
  },

  async getAdminStorePickup(token: string): Promise<{ success: boolean; data: StorePickup }> {
    return fetcher('/admin/store-pickup', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async updateAdminStorePickup(token: string, data: StorePickup): Promise<{ success: boolean; message: string; data: StorePickup }> {
    return fetcher('/admin/store-pickup', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  // Newsletter
  async subscribeNewsletter(email: string, source: string = 'home_banner'): Promise<{
    success: boolean;
    message: string;
    already_subscribed?: boolean;
    data: NewsletterSubscriber;
  }> {
    return fetcher('/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({ email, source }),
    });
  },

  // Orders
  async createOrder(orderData: {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    delivery_method: 'delivery' | 'pickup';
    shipping_address?: string;
    shipping_city?: string;
    shipping_postal_code?: string;
    items: { product_id: number; quantity: number }[];
    voucher_code?: string;
    voucher_redemption_id?: string;
    voucher_owner_name?: string;
    voucher_amount?: number;
    payment_method: string;
    notes?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      order_id: number;
      order_number: string;
      total: number;
      shipping_fee: number;
      discount: number;
      order_status: string;
      payment_method?: string;
      payment_status?: string;
      payment_url?: string;
      payment_params?: Record<string, string>;
      redirect_required?: boolean;
    };
  }> {
    return fetcher('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  async initiateWebxpay(orderNumber: string): Promise<{
    success: boolean;
    data: {
      gateway_url: string;
      params: Record<string, string>;
      order_number: string;
      total: number;
    };
  }> {
    return fetcher(`/payment/webxpay/initiate/${orderNumber}`, {
      method: 'POST',
    });
  },

  async getOrder(orderNumber: string): Promise<{ success: boolean; data: Order }> {
    return fetcher(`/orders/${orderNumber}`);
  },

  // Admin APIs
  async adminLogin(email: string, password: string): Promise<{
    success: boolean;
    message: string;
    token: string;
    admin: Admin;
  }> {
    return fetcher('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async getAdminStats(token: string): Promise<{
    success: boolean;
    data: {
      total_sales: number;
      total_orders: number;
      pending_orders: number;
      total_products: number;
      low_stock_products: number;
      active_flash_sales: number;
      recent_orders: Order[];
      top_categories: Category[];
    };
  }> {
    return fetcher('/admin/stats', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getAdminProducts(token: string, params: {
    page?: number;
    search?: string;
    category_id?: number;
    brand_id?: number;
    merchant_id?: number;
    stock_status?: string;
    per_page?: number;
  } = {}): Promise<{
    success: boolean;
    data: Product[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.search) query.append('search', params.search);
    if (params.category_id) query.append('category_id', params.category_id.toString());
    if (params.brand_id) query.append('brand_id', params.brand_id.toString());
    if (params.merchant_id) query.append('merchant_id', params.merchant_id.toString());
    if (params.stock_status) query.append('stock_status', params.stock_status);
    if (params.per_page) query.append('per_page', params.per_page.toString());

    const qs = query.toString();
    return fetcher(`/admin/products${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async createAdminProduct(token: string, data: Partial<Product> & { image_url?: string }): Promise<{
    success: boolean;
    message: string;
    data: Product;
  }> {
    return fetcher('/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async updateAdminProduct(token: string, id: number, data: Partial<Product> & { image_url?: string }): Promise<{
    success: boolean;
    message: string;
    data: Product;
  }> {
    return fetcher(`/admin/products/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async deleteAdminProduct(token: string, id: number): Promise<{ success: boolean; message: string }> {
    return fetcher(`/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async bulkPricingAdminProducts(token: string, payload: {
    product_ids?: number[];
    select_all_matching?: boolean;
    filters?: {
      search?: string;
      category_id?: number;
      merchant_id?: number;
      brand_id?: number;
      stock_status?: string;
    };
    target: 'discount' | 'regular_price' | 'both';
    regular_action?: 'increase_percent' | 'decrease_percent' | 'increase_flat' | 'decrease_flat' | 'set_exact';
    regular_value?: number;
    discount_action?: 'set_percent' | 'set_flat_discount' | 'set_sale_price' | 'clear_discount';
    discount_value?: number;
    round_to?: 'none' | '1' | '10' | '50' | '100';
    sale_price_handling?: 'keep_discount_percent' | 'keep_sale_price' | 'remove_sale_price';
  }): Promise<{ success: boolean; message: string; updated_count: number }> {
    return fetcher('/admin/products/bulk-pricing', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  },

  async exportAdminProductsCsv(token: string, params: {
    category_id?: number;
    merchant_id?: number;
    search?: string;
  } = {}): Promise<Blob> {
    const query = new URLSearchParams();
    if (params.category_id) query.append('category_id', params.category_id.toString());
    if (params.merchant_id) query.append('merchant_id', params.merchant_id.toString());
    if (params.search) query.append('search', params.search);
    const qs = query.toString();

    const res = await fetch(`${API_BASE}/admin/products/export${qs ? `?${qs}` : ''}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error(`Export failed with status ${res.status}`);
    }
    return res.blob();
  },

  async getAdminProductsSampleTemplate(): Promise<Blob> {
    const res = await fetch(`${API_BASE}/admin/products/template`);
    if (!res.ok) {
      throw new Error(`Template download failed with status ${res.status}`);
    }
    return res.blob();
  },

  async importAdminProducts(token: string, file: File, updateExisting: boolean = false): Promise<{
    success: boolean;
    message: string;
    imported: number;
    updated: number;
    skipped: number;
    errors?: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('update_existing', updateExisting ? '1' : '0');

    const res = await fetch(`${API_BASE}/admin/products/import`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      throw new Error(json.message || 'Product import failed');
    }
    return json;
  },

  async importAdminProductsJson(token: string, products: any[], updateExisting: boolean = false): Promise<{
    success: boolean;
    message: string;
    imported: number;
    updated: number;
    skipped: number;
    errors?: string[];
  }> {
    return fetcher('/admin/products/import', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ products, update_existing: updateExisting }),
    });
  },

  // Merchant Management Methods
  async getAdminMerchants(token: string, params: {
    page?: number;
    search?: string;
    status?: string;
    sort_by?: string;
    per_page?: number | string;
    all?: boolean;
  } = {}): Promise<{
    success: boolean;
    stats: {
      total_merchants: number;
      active_merchants: number;
      pending_merchants: number;
      inactive_merchants: number;
      total_assigned_products: number;
      avg_commission: number;
    };
    data: Merchant[];
    pagination?: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.per_page) query.append('per_page', params.per_page.toString());
    if (params.all) query.append('all', 'true');

    const qs = query.toString();
    return fetcher(`/admin/merchants${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getAdminMerchant(token: string, id: number): Promise<{
    success: boolean;
    data: Merchant;
  }> {
    return fetcher(`/admin/merchants/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async createAdminMerchant(token: string, data: Partial<Merchant>): Promise<{
    success: boolean;
    message: string;
    data: Merchant;
  }> {
    return fetcher('/admin/merchants', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async updateAdminMerchant(token: string, id: number, data: Partial<Merchant>): Promise<{
    success: boolean;
    message: string;
    data: Merchant;
  }> {
    return fetcher(`/admin/merchants/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async deleteAdminMerchant(token: string, id: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return fetcher(`/admin/merchants/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async toggleAdminMerchantStatus(token: string, id: number, status?: string): Promise<{
    success: boolean;
    message: string;
    data: Merchant;
  }> {
    return fetcher(`/admin/merchants/${id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
  },

  async getAdminMerchantProducts(token: string, id: number, params: { page?: number; per_page?: number } = {}): Promise<{
    success: boolean;
    merchant: { id: number; name: string; code: string | null; logo_url: string | null };
    data: Product[];
    pagination: { current_page: number; last_page: number; total: number };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.per_page) query.append('per_page', params.per_page.toString());
    const qs = query.toString();
    return fetcher(`/admin/merchants/${id}/products${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getAdminFlashSales(token: string): Promise<{ success: boolean; data: FlashSale[] }> {
    return fetcher('/admin/flash-sales', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async updateAdminFlashSale(token: string, id: number, data: Partial<FlashSale>): Promise<{
    success: boolean;
    message: string;
    data: FlashSale;
  }> {
    return fetcher(`/admin/flash-sales/${id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-HTTP-Method-Override': 'PUT',
      },
      body: JSON.stringify(data),
    });
  },

  async addAdminFlashSaleItem(token: string, flashSaleId: number, itemData: {
    product_id: number;
    flash_price: number;
    quantity_limit: number;
  }): Promise<{ success: boolean; message: string }> {
    return fetcher(`/admin/flash-sales/${flashSaleId}/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(itemData),
    });
  },

  async removeAdminFlashSaleItem(token: string, flashSaleId: number, itemId: number): Promise<{ success: boolean; message: string }> {
    return fetcher(`/admin/flash-sales/${flashSaleId}/items/${itemId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-HTTP-Method-Override': 'DELETE',
      },
    });
  },

  async getAdminOrders(token: string, params: { status?: string; search?: string; page?: number } = {}): Promise<{
    success: boolean;
    data: Order[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page.toString());

    const qs = query.toString();
    return fetcher(`/admin/orders${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async updateAdminOrderStatus(token: string, id: number, status: string): Promise<{
    success: boolean;
    message: string;
    data: Order;
  }> {
    return fetcher(`/admin/orders/${id}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ order_status: status }),
    });
  },

  async getAdminOrderWaybills(token: string, id: number): Promise<{
    success: boolean;
    data: {
      order: {
        id: number;
        order_number: string;
        customer_name: string;
        customer_phone: string;
        shipping_address: string;
        shipping_city: string;
        created_at: string;
        payment_method: string;
        order_status: string;
      };
      waybills: MerchantWaybill[];
    };
  }> {
    return fetcher(`/admin/orders/${id}/waybills`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getAdminUsers(token: string, params: {
    page?: number;
    role?: string;
    status?: string;
    search?: string;
  } = {}): Promise<{
    success: boolean;
    data: ManagedUser[];
    stats: {
      total_users: number;
      total_admins: number;
      total_customers: number;
      active_users: number;
    };
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.role) query.append('role', params.role);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);

    const qs = query.toString();
    return fetcher(`/admin/users${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async createAdminUser(token: string, data: {
    name: string;
    email: string;
    phone?: string;
    role: string;
    status: string;
    password?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: ManagedUser;
  }> {
    return fetcher('/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async updateAdminUser(token: string, id: number, data: Partial<ManagedUser> & { password?: string }): Promise<{
    success: boolean;
    message: string;
    data: ManagedUser;
  }> {
    return fetcher(`/admin/users/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async deleteAdminUser(token: string, id: number): Promise<{ success: boolean; message: string }> {
    return fetcher(`/admin/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getAdminStaff(token: string, params: {
    page?: number;
    role?: string;
    status?: string;
    search?: string;
  } = {}): Promise<{
    success: boolean;
    data: Admin[];
    stats: {
      total_admins: number;
      super_admins: number;
      managers: number;
      editors: number;
      active_admins: number;
    };
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.role) query.append('role', params.role);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);

    const qs = query.toString();
    return fetcher(`/admin/admins${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async createAdminStaff(token: string, data: {
    name: string;
    email: string;
    phone?: string;
    role: string;
    status: string;
    password?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: Admin;
  }> {
    return fetcher('/admin/admins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async updateAdminStaff(token: string, id: number, data: Partial<Admin> & { password?: string }): Promise<{
    success: boolean;
    message: string;
    data: Admin;
  }> {
    return fetcher(`/admin/admins/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async deleteAdminStaff(token: string, id: number): Promise<{ success: boolean; message: string }> {
    return fetcher(`/admin/admins/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getAdminActivityLogs(token: string, params: {
    page?: number;
    action?: string;
    search?: string;
  } = {}): Promise<{
    success: boolean;
    data: ActivityLogItem[];
    stats: {
      total_activities: number;
      today_activities: number;
      unique_admins: number;
      auth_events: number;
    };
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.action) query.append('action', params.action);
    if (params.search) query.append('search', params.search);

    const qs = query.toString();
    return fetcher(`/admin/activity-logs${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // Admin Newsletter Subscribers Management
  async getAdminNewsletterSubscribers(token: string, params: {
    page?: number;
    search?: string;
    status?: string;
    source?: string;
    sort_by?: string;
    per_page?: number;
    all?: boolean;
  } = {}): Promise<{
    success: boolean;
    stats: {
      total_subscribers: number;
      active_subscribers: number;
      unsubscribed_subscribers: number;
      recent_subscribers_7d: number;
    };
    data: NewsletterSubscriber[];
    pagination?: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.source) query.append('source', params.source);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.per_page) query.append('per_page', params.per_page.toString());
    if (params.all) query.append('all', 'true');

    const qs = query.toString();
    return fetcher(`/admin/newsletter-subscribers${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async createAdminNewsletterSubscriber(token: string, data: {
    email: string;
    status?: 'subscribed' | 'unsubscribed';
    source?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: NewsletterSubscriber;
  }> {
    return fetcher('/admin/newsletter-subscribers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  async toggleAdminNewsletterSubscriberStatus(token: string, id: number, status?: string): Promise<{
    success: boolean;
    message: string;
    data: NewsletterSubscriber;
  }> {
    return fetcher(`/admin/newsletter-subscribers/${id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
  },

  async deleteAdminNewsletterSubscriber(token: string, id: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return fetcher(`/admin/newsletter-subscribers/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
