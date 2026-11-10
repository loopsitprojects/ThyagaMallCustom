'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShoppingBag,
  Truck,
  ShieldCheck,
  RefreshCw,
  Plus,
  Minus,
  Check,
  Ticket,
  ChevronRight,
  Flame,
  Zap,
  Loader2,
  Heart,
} from 'lucide-react';
import OutOfStockBadge from '@/components/product/OutOfStockBadge';
import RestockNotifyForm from '@/components/product/RestockNotifyForm';
import { api } from '@/services/api';
import { Product } from '@/types';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import ProductCard from '@/components/product/ProductCard';
import { sanitizeHtml } from '@/utils/sanitizeHtml';
import StarRating from '@/components/product/StarRating';
import ProductReviews from '@/components/product/ProductReviews';
import { getAssetUrl } from '@/utils/assets';

export default function ProductClient() {
  const params = useParams();
  const router = useRouter();

  // Handle static export fallback placeholder
  const rawSlug = (params?.slug as string) || '';
  const [slug, setSlug] = useState<string>(() => {
    if (rawSlug && rawSlug !== '[slug]') return rawSlug;
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] || '';
    }
    return '';
  });

  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [activeImage, setActiveImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'reviews'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    if (rawSlug && rawSlug !== '[slug]' && rawSlug !== slug) {
      setSlug(rawSlug);
    } else if (typeof window !== 'undefined' && (!slug || slug === '[slug]')) {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const extracted = parts[parts.length - 1];
      if (extracted && extracted !== '[slug]') {
        setSlug(extracted);
      }
    }
  }, [rawSlug, slug]);

  useEffect(() => {
    async function loadProduct() {
      if (!slug || slug === '[slug]') return;
      setIsLoading(true);
      try {
        const res = await api.getProduct(slug);
        if (res.success && res.data) {
          setProduct(res.data.product);
          setRelated(res.data.related);
          setActiveImage(res.data.product.primary_image || '');
        }
      } catch {
        // error handling
      } finally {
        setIsLoading(false);
      }
    }

    if (slug && slug !== '[slug]') {
      loadProduct();
    }
  }, [slug]);

  if (isLoading && (!slug || slug === '[slug]')) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#36135d] mb-2" />
        <span className="text-xs font-semibold">Loading product...</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#36135d] mb-2" />
        <span className="text-xs font-semibold">Loading product specifications...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-white rounded-xl p-16 text-center border border-gray-200 my-8">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Product Not Found</h2>
        <p className="text-xs text-gray-500 mb-6">
          The requested item is currently unavailable or has been relocated.
        </p>
        <Link
          href="/shop"
          className="bg-[#36135d] text-white px-6 py-2.5 rounded-lg text-xs font-bold transition"
        >
          Return to Store
        </Link>
      </div>
    );
  }

  const regularPrice = Number(product.regular_price);
  const currentPrice = product.sale_price ? Number(product.sale_price) : regularPrice;
  const discountAmount = regularPrice > currentPrice ? regularPrice - currentPrice : 0;
  const discountPercent = regularPrice > 0 ? Math.round((discountAmount / regularPrice) * 100) : 0;

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const showReviews = () => {
    setActiveTab('reviews');
    document.getElementById('product-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    router.push('/checkout');
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Link href="/" className="hover:text-[#36135d]">Home</Link>
        <ChevronRight className="w-3 h-3" />
        {product.category && (
          <>
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-[#36135d]">
              {product.category.name}
            </Link>
            <ChevronRight className="w-3 h-3" />
          </>
        )}
        <span className="font-semibold text-gray-800 truncate max-w-xs">{product.name}</span>
      </div>

      {/* Product Primary Section */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-8 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left: Gallery & Zoom Preview */}
        <div className="md:col-span-6 flex flex-col gap-4">
          <div className="relative w-full aspect-square bg-[#fbfbfe] rounded-xl border border-gray-200/80 overflow-hidden">
            <Image
              src={getAssetUrl(activeImage || product.primary_image || 'https://placehold.co/600x600/f3f4f6/36135d?text=Thyaga+Mall')}
              alt={product.name}
              fill
              priority
              className="object-contain p-6"
            />
            {product.stock_quantity <= 0 ? (
              <OutOfStockBadge className="top-4 left-4 text-xs px-2.5 py-1 rounded-md" />
            ) : discountPercent > 0 && (
              <div className="absolute top-4 left-4 bg-[#dc2626] text-white font-black text-xs px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>-{discountPercent}% OFF</span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(img.image_url)}
                  className={`relative w-16 h-16 rounded-lg border-2 overflow-hidden bg-gray-50 shrink-0 cursor-pointer ${
                    activeImage === img.image_url ? 'border-[#36135d]' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Image src={getAssetUrl(img.image_url)} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Details, Pricing, Actions */}
        <div className="md:col-span-6 flex flex-col justify-between space-y-5">
          <div>
            {/* Category (SKU is internal — shown only in the admin panel) */}
            <div className="text-xs mb-2 font-medium">
              <span className="text-purple-700 font-bold uppercase tracking-wider">
                {product.category?.name || 'General Product'}
              </span>
            </div>

            {/* Product Title */}
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight mb-3">
              {product.name}
            </h1>

            {/* Ratings & Stock Status */}
            <div className="flex items-center gap-4 text-xs mb-4 pb-4 border-b border-gray-100">
              {/* Jumps to the reviews tab */}
              <button type="button" onClick={showReviews} className="flex items-center gap-1.5 hover:underline cursor-pointer">
                {product.reviews_count > 0 ? (
                  <>
                    <StarRating value={Number(product.rating_avg)} />
                    <span className="font-bold text-gray-800">{Number(product.rating_avg).toFixed(1)}</span>
                    <span className="text-gray-400">({product.reviews_count} review{product.reviews_count === 1 ? '' : 's'})</span>
                  </>
                ) : (
                  <span className="text-gray-500">No reviews yet · <span className="font-semibold text-[#6d28d9]">Write a review</span></span>
                )}
              </button>
              <span className="text-gray-300">|</span>
              <div>
                {product.stock_quantity > 0 ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    In Stock ({product.stock_quantity} available)
                  </span>
                ) : (
                  <span className="text-red-600 font-bold">Out of Stock</span>
                )}
              </div>
            </div>

            {/* Price Box */}
            <div className="bg-purple-50/60 rounded-xl p-4 border border-purple-100 mb-5">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-black text-[#36135d]">
                  Rs. {currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                {discountAmount > 0 && (
                  <>
                    <span className="text-sm text-gray-400 line-through">
                      Rs. {regularPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="bg-[#dc2626] text-white text-xs font-bold px-2 py-0.5 rounded">
                      Save Rs. {discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-purple-100/70 flex-wrap">
                <p className="text-[11px] text-gray-500">
                  Inclusive of all taxes & warranty coverage.
                </p>
                <Link
                  href="/terms"
                  className="text-xs text-gray-500 hover:text-[#36135d] underline underline-offset-2 transition"
                >
                  Terms & Conditions Apply
                </Link>
              </div>
            </div>

            {/* Thyaga Voucher Benefit Callout */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 mb-5">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                <Ticket className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-900">Thyaga Gift Voucher Compatible</h4>
                <p className="text-[11px] text-amber-800/90 leading-relaxed">
                  You can use your physical or digital Thyaga Gift Voucher code at checkout to claim immediate discounts.
                </p>
              </div>
            </div>

            {/* Out of stock: leave an email to hear when it returns */}
            {product.stock_quantity <= 0 && <RestockNotifyForm key={product.id} productSlug={product.slug} />}

            {/* Quantity Selector */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Quantity:</span>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-gray-100 text-gray-600 transition cursor-pointer"
                  disabled={quantity <= 1}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-4 py-1.5 text-xs font-bold text-gray-800">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:bg-gray-100 text-gray-600 transition cursor-pointer"
                  disabled={quantity >= product.stock_quantity}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
              <button
                onClick={handleAddToCart}
                disabled={product.stock_quantity <= 0}
                className="flex-1 w-full bg-[#36135d] hover:bg-[#250b42] text-white py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isAdded ? <Check className="w-4 h-4 text-emerald-400" /> : <ShoppingBag className="w-4 h-4" />}
                <span>{isAdded ? 'Added to Cart!' : 'Add to Cart'}</span>
              </button>

              <button
                onClick={handleBuyNow}
                disabled={product.stock_quantity <= 0}
                className="flex-1 w-full bg-[#a7144c] hover:bg-[#8c0f3f] text-white py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>Buy Now</span>
              </button>

              <button
                type="button"
                onClick={() => product && toggleWishlist(product)}
                className={`p-3.5 rounded-xl border transition flex items-center justify-center cursor-pointer shrink-0 ${
                  product && isInWishlist(product.id)
                    ? 'border-rose-200 bg-rose-50 text-rose-600'
                    : 'border-gray-200 text-gray-500 hover:text-rose-600 hover:bg-rose-50/50'
                }`}
                title={product && isInWishlist(product.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                aria-label="Wishlist"
              >
                <Heart className={`w-5 h-5 ${product && isInWishlist(product.id) ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Delivery & Service Assurances */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100 text-center">
            <div className="p-2 bg-gray-50 rounded-lg">
              <Truck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <span className="text-[10px] font-bold text-gray-700 block">Free Shipping</span>
              <span className="text-[9px] text-gray-400">Over Rs. 2,999</span>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <span className="text-[10px] font-bold text-gray-700 block">100% Genuine</span>
              <span className="text-[9px] text-gray-400">Direct from Thyaga</span>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <RefreshCw className="w-4 h-4 text-rose-600 mx-auto mb-1" />
              <span className="text-[10px] font-bold text-gray-700 block">7 Days Return</span>
              <span className="text-[9px] text-gray-400">Easy replacement</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Description, Specifications, Reviews */}
      <div id="product-tabs" className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('desc')}
            className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider transition border-b-2 cursor-pointer ${
              activeTab === 'desc'
                ? 'border-[#36135d] text-[#36135d] bg-purple-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Description
          </button>
          <button
            onClick={() => setActiveTab('specs')}
            className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider transition border-b-2 cursor-pointer ${
              activeTab === 'specs'
                ? 'border-[#36135d] text-[#36135d] bg-purple-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Product Details & Specs
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider transition border-b-2 cursor-pointer ${
              activeTab === 'reviews'
                ? 'border-[#36135d] text-[#36135d] bg-purple-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Customer Reviews ({product.reviews_count ?? 0})
          </button>
        </div>

        <div className="p-6 text-sm text-gray-700 leading-relaxed">
          {activeTab === 'desc' && (
            <div className="space-y-4">
              {product.short_description || product.description ? (
                <div
                  className="prose prose-xs sm:prose-sm text-gray-600 max-w-none text-xs sm:text-sm"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.short_description || product.description || '') }}
                />
              ) : (
                <p className="text-xs sm:text-sm text-gray-600">
                  High quality authentic product sourced and distributed by Thyaga Mall.
                </p>
              )}
              {product.short_description && product.description && product.description !== product.short_description && (
                <div
                  className="prose prose-xs sm:prose-sm text-gray-600 max-w-none pt-4 border-t border-gray-100"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
                />
              )}
              <div className="pt-3">
                <Link
                  href="/terms"
                  className="text-xs text-gray-500 hover:text-[#36135d] underline underline-offset-2 transition"
                >
                  Terms & Conditions Apply
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="font-semibold text-gray-500">Brand / Origin:</span>
                <span className="font-bold text-gray-900">Thyaga Mall Verified</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="font-semibold text-gray-500">Category:</span>
                <span className="font-bold text-gray-900">{product.category?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="font-semibold text-gray-500">Availability:</span>
                <span className="font-bold text-emerald-700">Immediate Dispatch</span>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <ProductReviews slug={product.slug} />
          )}
        </div>
      </div>

      {/* Related Products Carousel / Grid */}
      {related.length > 0 && (
        <section className="my-8">
          <div className="mb-4">
            <h2 className="text-lg font-black text-gray-900">You May Also Like</h2>
            <p className="text-xs text-gray-500">Similar products from {product.category?.name || 'Thyaga Mall'}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {related.slice(0, 6).map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
