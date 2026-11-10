'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Zap,
  ZapOff,
  Clock,
  Flame,
  ShoppingBag,
  ShieldCheck,
  Truck,
  ChevronRight,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import OutOfStockBadge from '@/components/product/OutOfStockBadge';
import { useCart } from '@/context/CartContext';
import { useFlashSale } from '@/context/FlashSaleContext';
import { getAssetUrl } from '@/utils/assets';

export default function FlashDealsPage() {
  const { addToCart } = useCart();
  const { flashSale, isActive, isLoading } = useFlashSale();
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!flashSale?.end_time) return;

    const calculateTime = () => {
      const diff = new Date(flashSale.end_time).getTime() - Date.now();
      if (diff <= 0) {
        return { hours: 0, minutes: 0, seconds: 0 };
      }
      return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };

    setTimeLeft(calculateTime());
    const timer = setInterval(() => {
      setTimeLeft(calculateTime());
    }, 1000);

    return () => clearInterval(timer);
  }, [flashSale?.end_time]);

  const formatDigit = (num: number) => num.toString().padStart(2, '0');

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#dc2626] mb-2" />
        <span className="text-xs font-semibold">Checking active flash sale promotions...</span>
      </div>
    );
  }

  // If flash sale is inactive, turned off in admin, or has no items:
  if (!isActive || !flashSale || !flashSale.items || flashSale.items.length === 0) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Link href="/" className="hover:text-[#36135d]">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="font-semibold text-gray-800">Flash Deals</span>
        </div>

        {/* Inactive State Banner / Card */}
        <div className="bg-white rounded-2xl border border-gray-200/90 p-8 sm:p-14 text-center shadow-xs max-w-2xl mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-center mx-auto mb-5 text-gray-400">
            <ZapOff className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 font-poppins">
            No Active Flash Sale Right Now
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto mb-6 leading-relaxed">
            Our limited-time flash deals are currently paused or being prepared. You can explore our full store catalog with thousands of genuine products and everyday low prices.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/shop"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#36135d] hover:bg-[#280c48] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Browse Store Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-2.5 rounded-xl text-xs font-bold transition"
            >
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Active Flash Sale View
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Link href="/" className="hover:text-[#36135d]">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="font-semibold text-gray-800">Flash Deals Center</span>
      </div>

      {/* Hero Header with Animated Countdown */}
      <div className="bg-linear-to-r from-[#dc2626] via-[#b91c1c] to-[#991b1b] rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-amber-300 mb-3 border border-white/20">
            <Flame className="w-4 h-4 fill-current" />
            <span>24H LIMITED TIME PROMOTION</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black mb-2 tracking-tight">
            {flashSale.title || '⚡ Mega Flash Sale Arena'}
          </h1>
          <p className="text-xs sm:text-sm text-red-100 leading-relaxed mb-6">
            Exclusive price drops on authentic Sri Lankan groceries, high-end electronics, home cookware, and beauty essentials. Limited stock available!
          </p>

          {/* Large Countdown Clock */}
          {timeLeft && (
            <div className="inline-flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10">
              <Clock className="w-5 h-5 text-amber-300 animate-spin-slow" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Deals Expire In:</span>
              <div className="flex items-center gap-1.5">
                <span className="bg-white text-[#dc2626] font-black text-base px-2 py-1 rounded-md">
                  {formatDigit(timeLeft.hours)}
                </span>
                <span className="font-bold text-white">:</span>
                <span className="bg-white text-[#dc2626] font-black text-base px-2 py-1 rounded-md">
                  {formatDigit(timeLeft.minutes)}
                </span>
                <span className="font-bold text-white">:</span>
                <span className="bg-white text-[#dc2626] font-black text-base px-2 py-1 rounded-md">
                  {formatDigit(timeLeft.seconds)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Decorative Icons in Background */}
        <Zap className="absolute -bottom-10 -right-10 w-64 h-64 text-white/10 pointer-events-none" />
      </div>

      {/* Assurance Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs text-xs">
        <div className="flex items-center gap-2 text-gray-700">
          <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Free Shipping on Orders &gt; Rs. 2,999</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>100% Guaranteed Genuine Products</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <Zap className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Instant Order Dispatch</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <Flame className="w-4 h-4 text-red-500 shrink-0" />
          <span>Up to 45% OFF Market Retail</span>
        </div>
      </div>

      {/* Flash Deals Catalog */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {flashSale.items.map((item) => {
          const product = item.product;
          if (!product) return null;

          const flashPrice = Number(item.flash_price);
          const regularPrice = Number(product.regular_price || flashPrice);
          const discountPercent =
            item.discount_percentage ||
            (regularPrice > flashPrice
              ? Math.round(((regularPrice - flashPrice) / regularPrice) * 100)
              : 0);
          const soldCount = item.quantity_sold ?? Math.floor(((item.percentage_sold ?? 60) * (item.quantity_limit ?? 50)) / 100);
          const limitCount = item.quantity_limit && item.quantity_limit > 0 ? item.quantity_limit : (soldCount + 20);
          const percentSold = item.percentage_sold ?? Math.min(100, Math.round((soldCount / limitCount) * 100));

          return (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-red-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-red-400 transition-all duration-300 flex flex-col justify-between group"
            >
              <Link href={`/product/${product.slug}`} className="flex flex-col flex-1">
                <div className="relative w-full aspect-square bg-[#fffbfa] overflow-hidden">
                  <Image
                    src={getAssetUrl(product.primary_image || (product.images && product.images[0]?.image_url) || 'https://placehold.co/400x400/fff/dc2626?text=Flash+Deal')}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                    className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                  />
                  {product.stock_quantity <= 0 ? (
                    <OutOfStockBadge className="top-2.5 left-2.5 text-[10px] px-2 py-0.5 rounded" />
                  ) : discountPercent > 0 && (
                    <div className="absolute top-2.5 left-2.5 bg-[#dc2626] text-white font-black text-xs px-2 py-0.5 rounded shadow-xs flex items-center gap-1 animate-pulse">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      <span>-{discountPercent}%</span>
                    </div>
                  )}
                </div>

                <div className="p-3.5 flex flex-col flex-1 justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block mb-1">
                      {product.category?.name || 'Flash Deal'}
                    </span>
                    <h3 className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug group-hover:text-[#36135d] transition mb-2">
                      {product.name}
                    </h3>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-base font-black text-[#dc2626]">
                        Rs. {flashPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {regularPrice > flashPrice && (
                        <span className="text-xs text-gray-400 line-through">
                          Rs. {regularPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>

                    {/* Stock Progress Bar */}
                    <div className="space-y-1 mb-3">
                      <div className="flex justify-between text-[10px] font-bold text-gray-500">
                        <span>{soldCount} Sold</span>
                        <span>{percentSold}% Claimed</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-linear-to-r from-orange-500 to-red-600 h-2 rounded-full"
                          style={{ width: `${percentSold}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Add to Cart Button */}
              <div className="p-3.5 pt-0">
                <button
                  type="button"
                  onClick={() => addToCart(product, 1, flashPrice)}
                  className="w-full bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Claim Deal</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
