'use client';

import React from 'react';
import Link from 'next/link';
import { Home, ShoppingBag, Truck, HelpCircle, ArrowLeft, Search } from 'lucide-react';
import { useCategories, categoryHref } from '@/hooks/useCategories';

export default function NotFound() {
  const { categories } = useCategories();
  // Homepage categories from Admin → Categories, plus a link to trending products.
  const departments = [
    ...categories.filter((c) => c.is_featured).slice(0, 7).map((c) => ({ label: c.name, href: categoryHref(c) })),
    { label: 'Trending Deals', href: '/shop?sort=popular' },
  ];

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* 404 Graphic / Badge */}
      <div className="relative mb-6">
        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-linear-to-br from-[#36135d] via-[#522485] to-[#a7144c] flex items-center justify-center shadow-xl shadow-purple-900/10 rotate-3 transition-transform hover:rotate-0 duration-300">
          <span className="text-5xl sm:text-6xl font-black text-white tracking-tighter drop-shadow-md">
            404
          </span>
        </div>
        <div className="absolute -bottom-2 -right-2 bg-pink-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-md">
          Not Found
        </div>
      </div>

      {/* Headline & Description */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 mb-3 font-poppins">
        Oops! Page Not Found
      </h1>
      <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto mb-8 leading-relaxed">
        The link you followed may be broken, or the page may have been removed. Don’t worry, you can easily find what you’re looking for below.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-[#36135d] hover:bg-[#250b42] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 bg-[#a7144c] hover:bg-[#8c0f3f] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Browse Products</span>
        </Link>
        <Link
          href="/track-order"
          className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 px-5 py-2.5 rounded-xl font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          <Truck className="w-4 h-4 text-gray-500" />
          <span>Track Order</span>
        </Link>
        <Link
          href="/faq"
          className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 px-5 py-2.5 rounded-xl font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-purple-600" />
          <span>Help &amp; FAQs</span>
        </Link>
      </div>

      {/* Popular Categories */}
      <div className="border-t border-gray-200/80 pt-8 max-w-lg w-full">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-3">
          Popular Departments
        </span>
        <div className="flex flex-wrap justify-center gap-2">
          {departments.map((cat) => (
            <Link
              key={cat.label}
              href={cat.href}
              className="text-xs bg-white border border-gray-200 text-gray-700 hover:text-[#36135d] hover:border-[#36135d] px-3 py-1.5 rounded-lg font-medium transition shadow-2xs"
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
