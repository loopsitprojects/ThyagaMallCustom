'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Award } from 'lucide-react';
import { api } from '@/services/api';
import { Product } from '@/types';
import ProductCard from '@/components/product/ProductCard';
import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import { useCategories, categoryHref } from '@/hooks/useCategories';

export default function BestSellersSection() {
  const [activeTab, setActiveTab] = useState('All');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { categories } = useCategories();

  // "All" plus the categories marked "Show on homepage" in Admin → Categories.
  const TABS = [
    { label: 'All', slug: '' },
    ...categories.filter((c) => c.is_featured).map((c) => ({ label: c.name, slug: c.slug })),
  ];
  const activeTabSlug = TABS.find((t) => t.label === activeTab)?.slug ?? '';

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function loadBestSellers() {
      try {
        const res = await api.getHomeSection('best_sellers', activeTabSlug || undefined);

        if (isMounted && res.success) {
          setProducts(res.data);
        }
      } catch (err) {
        console.error('Failed to load best seller products:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadBestSellers();

    return () => {
      isMounted = false;
    };
  }, [activeTabSlug]);

  const viewAllUrl = activeTabSlug ? categoryHref({ slug: activeTabSlug }) : '/shop?sort=popular';

  if (!isLoading && products.length === 0 && activeTab === 'All') {
    return null;
  }

  return (
    <section className="my-6 bg-white rounded-xl border border-gray-200 shadow-2xs p-4 sm:p-5">
      {/* Header with Filter Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 mb-4 border-b border-gray-100">
        <div className="flex items-center justify-between md:justify-start gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#36135d]" />
            <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight font-poppins shrink-0">
              Best Sellers
            </h2>
          </div>

          {/* Desktop Filter Pills */}
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold">
            {TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(tab.label)}
                className={`relative px-3 py-1 rounded-full transition-colors cursor-pointer text-xs ${
                  activeTab === tab.label
                    ? 'text-white font-bold'
                    : 'text-gray-500 hover:text-gray-900 bg-gray-100'
                }`}
              >
                {activeTab === tab.label && (
                  <motion.span
                    layoutId="bestseller-pill"
                    className="absolute inset-0 rounded-full bg-linear-to-r from-[#6d28d9] to-[#a7144c] shadow-md shadow-purple-500/30"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Mobile View All on Top Row */}
          <Link
            href={viewAllUrl}
            className="md:hidden text-xs font-bold text-[#6d28d9] hover:text-[#5b21b6] flex items-center gap-1 group shrink-0"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile Filter Pills (Horizontal Scroll) */}
        <div className="flex md:hidden items-center gap-2 text-xs font-semibold overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={`px-3.5 py-1.5 rounded-full transition cursor-pointer text-xs shrink-0 select-none ${
                activeTab === tab.label
                  ? 'bg-[#6d28d9] text-white font-bold shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900 bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Desktop View All */}
        <Link
          href={viewAllUrl}
          className="hidden md:flex text-xs font-bold text-[#6d28d9] hover:text-[#5b21b6] items-center gap-1 group shrink-0"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Grid of 6 Best Sellers */}
      <div className={isLoading || products.length === 0 ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5" : ""}>
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200/80 p-3 flex flex-col justify-between animate-pulse aspect-[3/4]"
            >
              <div className="w-full aspect-square bg-gray-100 rounded-lg mb-3" />
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded w-4/5" />
                <div className="h-3 bg-gray-100 rounded w-3/5" />
                <div className="h-4 bg-gray-100 rounded w-1/2 mt-2" />
              </div>
            </div>
          ))
        ) : products.length > 0 ? (
          <Stagger key={activeTab} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
            {products.map((product) => (
              <StaggerItem key={product.id} className="h-full">
                <ProductCard product={product} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <div className="col-span-full py-8 text-center text-gray-500 text-xs">
            No products found in this category.
          </div>
        )}
      </div>
    </section>
  );
}
