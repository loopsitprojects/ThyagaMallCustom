'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Zap, ArrowRight, Heart, ShoppingBag } from 'lucide-react';
import OutOfStockBadge from '@/components/product/OutOfStockBadge';
import { FlashSale } from '@/types';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { getAssetUrl } from '@/utils/assets';

interface FlashSaleSectionProps {
  flashSale?: FlashSale | null;
}

export default function FlashSaleSection({ flashSale }: FlashSaleSectionProps) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [activeTab, setActiveTab] = useState('All Deals');
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  // If flash sale is off, missing, or has no items, render absolutely nothing
  const isInactive = !flashSale || !flashSale.is_active || !flashSale.items || flashSale.items.length === 0;

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

  // Extract distinct categories from actual flash sale products
  const categoryTabs = useMemo(() => {
    if (!flashSale?.items) return ['All Deals'];
    const names = flashSale.items
      .map((item) => item.product?.category?.name)
      .filter((name): name is string => Boolean(name));
    return ['All Deals', ...Array.from(new Set(names))];
  }, [flashSale?.items]);

  // Filter items based on activeTab
  const visibleItems = useMemo(() => {
    if (!flashSale?.items) return [];
    if (activeTab === 'All Deals') return flashSale.items.slice(0, 6);
    const filtered = flashSale.items.filter(
      (item) => item.product?.category?.name?.toLowerCase() === activeTab.toLowerCase()
    );
    return (filtered.length > 0 ? filtered : flashSale.items).slice(0, 6);
  }, [flashSale?.items, activeTab]);

  // Check expiration
  const endTimestamp = flashSale?.end_time ? new Date(flashSale.end_time).getTime() : 0;
  const isExpired = endTimestamp > 0 && Date.now() >= endTimestamp;

  if (isInactive || isExpired) {
    return null;
  }

  const formatDigit = (num: number) => num.toString().padStart(2, '0');

  return (
    <section className="my-6 bg-white rounded-xl border border-gray-200 shadow-2xs p-4 sm:p-5">
      {/* Flash Deals Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 mb-4 border-b border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          {/* Lightning Icon & Title */}
          <div className="flex items-center gap-1.5">
            <Zap className="w-5 h-5 text-[#dc2626] fill-[#dc2626]" />
            <h2 className="text-lg font-black text-gray-900 tracking-tight font-poppins">
              Flash Deals
            </h2>
          </div>

          {/* Ends In Countdown Badges */}
          {timeLeft && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <span>Ends in</span>
              <div className="flex items-center gap-1 font-bold">
                <span className="bg-[#dc2626] text-white px-1.5 py-0.5 rounded text-[11px] font-black">
                  {formatDigit(timeLeft.hours)}
                </span>
                <span className="text-[#dc2626] font-bold">:</span>
                <span className="bg-[#dc2626] text-white px-1.5 py-0.5 rounded text-[11px] font-black">
                  {formatDigit(timeLeft.minutes)}
                </span>
                <span className="text-[#dc2626] font-bold">:</span>
                <span className="bg-[#dc2626] text-white px-1.5 py-0.5 rounded text-[11px] font-black">
                  {formatDigit(timeLeft.seconds)}
                </span>
              </div>
            </div>
          )}

          {/* Category Filter Tabs */}
          {categoryTabs.length > 1 && (
            <div className="hidden sm:flex items-center gap-4 text-xs font-semibold text-gray-500 ml-2">
              {categoryTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`transition cursor-pointer pb-0.5 ${
                    activeTab === tab
                      ? 'text-[#36135d] border-b-2 border-[#36135d] font-bold'
                      : 'hover:text-gray-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View All Link */}
        <Link
          href="/flash-deals"
          className="text-xs font-bold text-[#e11d48] hover:text-[#be123c] flex items-center gap-1 group self-start md:self-auto"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* 6 Flash Deal Cards in a Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        {visibleItems.map((item) => {
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
          const percentClaimed = item.percentage_sold ?? Math.min(100, Math.round((soldCount / limitCount) * 100));
          const productImage = getAssetUrl(
            product.primary_image ||
            (product.images && product.images[0]?.image_url) ||
            'https://placehold.co/400x400/fff/dc2626?text=Flash+Deal'
          );

          return (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-200/90 overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative"
            >
              {/* Product Thumbnail */}
              <Link href={`/product/${product.slug}`} className="block relative aspect-square bg-[#fbfbfe] overflow-hidden">
                <Image
                  src={productImage}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                />

                {/* Out of Stock or Red Discount Tag */}
                {product.stock_quantity <= 0 ? (
                  <OutOfStockBadge className="top-2 left-2 text-[9px] px-1.5 py-0.5 rounded" />
                ) : discountPercent > 0 && (
                  <div className="absolute top-2 left-2 bg-[#dc2626] text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-2xs">
                    -{discountPercent}%
                  </div>
                )}

                {/* Wishlist Heart */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWishlist(product);
                  }}
                  className={`absolute top-2 right-2 w-7 h-7 rounded-full bg-white/95 shadow-xs flex items-center justify-center transition cursor-pointer ${
                    isInWishlist(product.id) ? 'text-red-500 fill-red-500' : 'text-gray-400 hover:text-red-500'
                  }`}
                  aria-label="Save to Wishlist"
                >
                  <Heart className={`w-3.5 h-3.5 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                </button>
              </Link>

              {/* Product Info */}
              <div className="p-3 flex flex-col flex-1 justify-between">
                <div>
                  <Link href={`/product/${product.slug}`}>
                    <h3 className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug group-hover:text-[#36135d] transition mb-1.5 h-8">
                      {product.name}
                    </h3>
                  </Link>

                  <div className="mb-2">
                    <div className="text-sm font-black text-[#dc2626]">
                      Rs. {flashPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {regularPrice > flashPrice && (
                      <div className="text-[10px] text-gray-400 line-through">
                        Rs. {regularPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stock Progress Bar */}
                <div className="space-y-1 mb-2.5">
                  <div className="text-[10px] font-bold text-gray-500">
                    {soldCount} sold
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-linear-to-r from-orange-500 to-red-600 h-1.5 rounded-full"
                      style={{ width: `${percentClaimed}%` }}
                    />
                  </div>
                </div>

                {/* Solid Purple Add to Cart Button */}
                <button
                  type="button"
                  onClick={() => addToCart(product, 1, flashPrice)}
                  className="w-full bg-[#6d28d9] hover:bg-[#5b21b6] text-white py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
