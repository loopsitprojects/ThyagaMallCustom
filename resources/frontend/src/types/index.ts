export interface Category {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  image: string | null;
  icon: string | null;
  description: string | null;
  subtitle?: string | null;
  color_from?: string | null;
  color_to?: string | null;
  sort_order: number;
  is_featured: boolean;
  show_in_menu?: boolean;
  is_active: boolean;
  products_count?: number;
  /** Products in this category plus all of its sub-categories */
  total_products_count?: number;
  children_count?: number;
  children?: Category[];
}

export type CategoryInput = Partial<Pick<Category,
  'name' | 'slug' | 'parent_id' | 'subtitle' | 'description' | 'icon' | 'color_from' | 'color_to' |
  'image' | 'sort_order' | 'is_active' | 'is_featured' | 'show_in_menu'>>;

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logo?: string | null;
  website_url?: string | null;
  description?: string | null;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  products_count?: number;
  created_at?: string;
  updated_at?: string;
}

export type BrandInput = Partial<Pick<Brand,
  'name' | 'slug' | 'logo' | 'website_url' | 'description' | 'is_featured' | 'is_active' | 'sort_order'>>;

export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Product {
  id: number;
  category_id: number | null;
  brand_id: number | null;
  name: string;
  slug: string;
  sku: string | null;
  short_description: string | null;
  description: string | null;
  regular_price: number | string;
  sale_price: number | string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  rating_avg: number | string;
  reviews_count: number;
  is_featured: boolean;
  is_active: boolean;
  primary_image?: string;
  discount_percentage?: number | null;
  merchant_id?: number | null;
  merchant?: Merchant;
  category?: Category;
  brand?: Brand;
  images?: ProductImage[];
}

export interface Merchant {
  id: number;
  name: string;
  slug: string;
  code: string | null;
  business_type: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  commission_rate: number | string;
  logo_url: string | null;
  banner_url: string | null;
  website: string | null;
  description: string | null;
  status: 'active' | 'pending' | 'inactive';
  is_featured: boolean;
  products_count?: number;
  products?: Product[];
  created_at?: string;
  updated_at?: string;
}

export interface FlashSaleItem {
  id: number;
  flash_sale_id: number;
  product_id: number;
  flash_price: number | string;
  quantity_limit: number;
  quantity_sold: number;
  sort_order: number;
  discount_percentage?: number;
  stock_remaining?: number;
  percentage_sold?: number;
  product: Product;
}

export interface FlashSale {
  id: number;
  title: string;
  banner_url: string | null;
  start_time: string;
  end_time: string;
  is_active: boolean;
  is_currently_active?: boolean;
  items: FlashSaleItem[];
}

export interface Voucher {
  id: number;
  code: string;
  title: string;
  discount_amount: number | string;
  discount_type: 'fixed' | 'percentage';
  min_order_amount: number | string;
  max_discount: number | string | null;
  expires_at: string | null;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
}

export interface ThyagaVoucherDetails {
  id: string;
  code: string;
  ownerName: string;
  ownerMobile: string;
  maskedPhone: string;
  amount: number;
  expiryDate: string | null;
  status: string;
}

export interface ThyagaRedemption {
  redemptionId: string;
  voucherId: string;
  voucherCode: string;
  amount: number;
  ownerName: string;
  maskedPhone?: string;
}

export interface OrderItem {
  id?: number;
  product_id: number;
  product_name: string;
  product_image?: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code?: string;
  subtotal: number | string;
  discount: number | string;
  shipping_fee: number | string;
  total: number | string;
  voucher_code?: string | null;
  voucher_redemption_id?: string | null;
  voucher_owner_name?: string | null;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'refunded';
  order_status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  notes?: string | null;
  created_at: string;
  items?: OrderItem[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  isFlashDeal?: boolean;
}

export interface Admin {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: 'super_admin' | 'manager' | 'editor';
  status: 'active' | 'suspended' | 'inactive';
  avatar?: string | null;
  last_login_at?: string | null;
  created_at?: string;
}

export interface CustomerUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: 'customer';
  status: 'active' | 'suspended' | 'inactive';
  created_at: string;
  orders_count?: number;
  total_spent?: number;
}

export type ManagedUser = CustomerUser;

export interface ActivityLogItem {
  id: number;
  admin_id?: number | null;
  admin_name: string;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  description: string;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface CustomerAuthUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  status: string;
  created_at?: string;
  orders_count?: number;
}

export interface CustomerAuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: CustomerAuthUser;
}

export interface NewsletterSubscriber {
  id: number;
  email: string;
  status: 'subscribed' | 'unsubscribed';
  source?: string | null;
  ip_address?: string | null;
  subscribed_at?: string | null;
  unsubscribed_at?: string | null;
  created_at: string;
  updated_at: string;
}


export interface HeroSlide {
  id: number;
  title_line1: string;
  title_line2?: string | null;
  subtext?: string | null;
  show_badge: boolean;
  badge_top?: string | null;
  badge_value?: string | null;
  badge_bottom?: string | null;
  cta_text: string;
  cta_link: string;
  box_color: string;
  accent_color: string;
  gradient_from: string;
  gradient_via: string;
  gradient_to: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type HeroSlideInput = Omit<HeroSlide, 'id' | 'sort_order' | 'created_at' | 'updated_at'>;

/** '3d' = animated gift-box slides, 'images' = uploaded image carousel */
export type HeroMode = '3d' | 'images';

export interface HeroBannerImage {
  id: number;
  image_path: string;
  /** Site-relative URL, e.g. /uploads/hero/abc.jpg — wrap with getAssetUrl() */
  image_url: string;
  alt_text?: string | null;
  /** Headline shown over the image, e.g. "Electronics" */
  title?: string | null;
  /** Supporting text; line breaks are kept */
  subtitle?: string | null;
  /** Button label, e.g. "Shop Electronics" (shown only when `link` is set) */
  cta_text?: string | null;
  link?: string | null;
  sort_order: number;
  is_active: boolean;
}

/** An email waiting to hear when an out-of-stock product returns */
export interface RestockRequest {
  id: number;
  product_id: number;
  email: string;
  /** When the back-in-stock email was sent; null while still waiting */
  notified_at: string | null;
  created_at: string;
}

export interface ProductWithRestockRequests extends Product {
  restock_requests: RestockRequest[];
}

/** Homepage product sections whose products are picked in Admin → Homepage Sections */
export type HomeSection = 'trending' | 'best_sellers';

/** Storefront welcome pop-up configured in Admin → Onboarding Ad */
export interface OnboardingAd {
  enabled: boolean;
  /** 'split' = image + text side by side, 'image' = clickable image only */
  layout: 'split' | 'image';
  badge?: string | null;
  title?: string | null;
  body?: string | null;
  coupon_code?: string | null;
  cta_text?: string | null;
  cta_link?: string | null;
  dismiss_text?: string | null;
  accent_color: string;
  /** Site-relative URL — wrap with getAssetUrl() */
  image_url?: string | null;
  delay_seconds: number;
  /** once = until the ad changes, daily = at most once a day, session = once per browser tab session */
  frequency: 'once' | 'daily' | 'session';
  pages: 'all' | 'home';
  /** Increases on every admin save so a changed ad is shown again */
  version: number;
}

export type OnboardingAdInput = Omit<OnboardingAd, 'image_url' | 'version'>;

export interface HeroBannerConfig {
  mode: HeroMode;
  slides: HeroSlide[];
  images: HeroBannerImage[];
}

export interface ProductReview {
  id: number;
  product_id?: number;
  user_name: string;
  /** Only present in admin responses */
  user_email?: string;
  rating: number;
  title?: string | null;
  comment: string;
  is_approved?: boolean;
  is_verified_purchase: boolean;
  created_at: string;
  updated_at?: string;
  product?: { id: number; name: string; slug: string } | null;
}

export interface ReviewSummary {
  average: number;
  count: number;
  /** Number of approved reviews per star rating, keyed "5" … "1" */
  distribution: Record<string, number>;
}

export interface OrderEmailRecipient {
  id: number;
  email: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
}
