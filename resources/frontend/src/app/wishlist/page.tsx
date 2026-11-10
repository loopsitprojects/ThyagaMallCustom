'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Heart,
  ShoppingBag,
  ArrowRight,
  Trash2,
  Check,
  PackageOpen,
  Sparkles,
} from 'lucide-react';
import OutOfStockBadge from '@/components/product/OutOfStockBadge';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { useFlashSale } from '@/context/FlashSaleContext';
import { Product } from '@/types';
import { getAssetUrl } from '@/utils/assets';

export default function WishlistPage() {
  const { items, wishlistCount, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { isActive } = useFlashSale();

  const [addedIds, setAddedIds] = useState<Record<number, boolean>>({});
  const [isAddingAll, setIsAddingAll] = useState(false);

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1800);
  };

  const handleAddAllToCart = () => {
    setIsAddingAll(true);
    items.forEach((p) => {
      if (p.stock_quantity > 0) {
        addToCart(p, 1);
      }
    });
    setTimeout(() => {
      setIsAddingAll(false);
    }, 1800);
  };

  return (
    <div className="max-w-site mx-auto px-4 lg:px-6 py-6 sm:py-10">
      {/* Page Title & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#36135d] flex items-center justify-center shadow-2xs">
            <Heart className="w-5 h-5 fill-current text-[#e11d48]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 font-poppins">
              My Wishlist &amp; Saved Items
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              {wishlistCount > 0
                ? `You have ${wishlistCount} saved item${wishlistCount > 1 ? 's' : ''}`
                : 'Save your favorite products to buy later'}
            </p>
          </div>
        </div>

        {wishlistCount > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleAddAllToCart}
              disabled={isAddingAll}
              className="inline-flex items-center gap-1.5 bg-[#36135d] hover:bg-[#250b42] text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-70"
            >
              {isAddingAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ShoppingBag className="w-3.5 h-3.5" />}
              <span>{isAddingAll ? 'All Added!' : 'Add All to Cart'}</span>
            </button>

            <button
              onClick={clearWishlist}
              className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:text-rose-600 hover:border-rose-200 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
              title="Clear all saved items"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {wishlistCount === 0 ? (
        <div className="text-center bg-white rounded-2xl border border-gray-200 p-8 sm:p-14 shadow-2xs max-w-2xl mx-auto my-6">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <PackageOpen className="w-10 h-10 stroke-[1.6]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-2">
            Your Wishlist is Empty
          </h2>
          <p className="text-gray-500 max-w-md mx-auto mb-6 text-xs sm:text-sm leading-relaxed">
            You haven&apos;t saved any products to your wishlist yet. Browse our top electronics, trending fashion, kitchen essentials, and flash deals to add items!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-[#36135d] text-white px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-[#2b0f4c] transition shadow-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explore Shop</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            {isActive && (
              <Link
                href="/flash-deals"
                className="inline-flex items-center gap-2 border border-purple-200 bg-purple-50/50 text-[#36135d] px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-purple-100 transition"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Today&apos;s Flash Deals</span>
              </Link>
            )}
          </div>
        </div>
      ) : (
        /* Populated Wishlist Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
          {items.map((product) => {
            const regularPrice = Number(product.regular_price);
            const currentPrice = product.sale_price ? Number(product.sale_price) : regularPrice;
            const discountPercent = product.discount_percentage;
            const isAdded = addedIds[product.id];
            const inStock = product.stock_quantity > 0;

            const imageUrl = getAssetUrl(product.primary_image || 'https://placehold.co/400x400/f3f4f6/36135d?text=Thyaga+Mall');

            return (
              <div
                key={product.id}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-purple-300 transition-all duration-300 flex flex-col justify-between relative"
              >
                {/* Thumbnail Container */}
                <div className="relative w-full aspect-square bg-[#fbfbfe] overflow-hidden">
                  <Link href={`/product/${product.slug}`} className="block w-full h-full">
                    <Image
                      src={imageUrl}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  {/* Out of Stock or Discount Badge */}
                  {!inStock ? (
                    <OutOfStockBadge className="top-2 left-2 text-[10px] px-2 py-0.5 rounded-full" />
                  ) : discountPercent && discountPercent > 0 && (
                    <div className="absolute top-2 left-2 bg-[#a7144c] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                      -{discountPercent}%
                    </div>
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 hover:bg-rose-50 text-gray-400 hover:text-rose-600 shadow-xs flex items-center justify-center transition cursor-pointer"
                    title="Remove from Wishlist"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Details Container */}
                <div className="p-3 flex flex-col flex-1 justify-between">
                  <div>
                    {product.category?.name && (
                      <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider block mb-1">
                        {product.category.name}
                      </span>
                    )}

                    <Link href={`/product/${product.slug}`}>
                      <h3 className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug group-hover:text-[#36135d] transition mb-2">
                        {product.name}
                      </h3>
                    </Link>

                    {/* Price */}
                    <div className="flex items-baseline gap-1.5 mb-2">
                      <span className="text-sm font-black text-[#36135d]">
                        Rs. {currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      {product.sale_price && regularPrice > currentPrice && (
                        <span className="text-[11px] text-gray-400 line-through">
                          Rs. {regularPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stock Status & Add to Cart Action */}
                  <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                    <span className={`text-[10px] font-semibold ${inStock ? 'text-emerald-600' : 'text-red-500'}`}>
                      {inStock ? 'In Stock' : 'Out of Stock'}
                    </span>

                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={!inStock}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                        isAdded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#36135d] hover:bg-[#250b42] text-white shadow-2xs'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Added!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
