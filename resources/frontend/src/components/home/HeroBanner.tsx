'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { HeroSlide, HeroBannerImage, HeroMode } from '@/types';
import { api } from '@/services/api';
import HeroStage, { DEFAULT_HERO_SLIDES } from '@/components/home/HeroStage';
import HeroImageCarousel from '@/components/home/HeroImageCarousel';
import CategoryIcon from '@/components/common/CategoryIcon';
import { useCategories, categoryHref } from '@/hooks/useCategories';

const EASE = [0.22, 1, 0.36, 1] as const;

// The banner takes the full width beside the category list.
const HERO_SIZE = 'lg:col-span-9 min-h-[230px] h-[260px] sm:h-[340px] lg:h-[425px]';

export default function HeroBanner() {
  const [slides, setSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES);
  const [images, setImages] = useState<HeroBannerImage[]>([]);
  // null until the API answers, so the 3D scene never flashes before an image carousel.
  const [mode, setMode] = useState<HeroMode | null>(null);
  const reduce = useReducedMotion();
  const { categories } = useCategories();

  // Mode, slides and images are managed in Admin → Hero Slides; fall back to the built-in 3D slides if the API is unavailable.
  useEffect(() => {
    let cancelled = false;
    api.getHeroBanner()
      .then((res) => {
        if (cancelled || !res.success) return;
        if (res.data.slides.length > 0) setSlides(res.data.slides);
        setImages(res.data.images);
        setMode(res.data.mode);
      })
      .catch(() => {
        if (!cancelled) setMode('3d');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Left Column: Vertical Category List */}
        <motion.div
          initial={reduce ? false : { opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="hidden lg:flex lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-2xs p-3 flex-col justify-between h-[425px]"
        >
          <div className="flex flex-col justify-between flex-1 py-0.5">
            {categories.slice(0, 7).map((cat, idx) => (
              <motion.div
                key={`c${cat.id}`}
                initial={reduce ? false : { opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + idx * 0.035, duration: 0.45, ease: EASE }}
              >
                <Link
                  href={categoryHref(cat)}
                  className="group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors hover:bg-purple-50/70"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-purple-100/80 text-gray-500 group-hover:text-[#36135d] flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                      <CategoryIcon icon={cat.icon} className="w-4 h-4" />
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-gray-800 group-hover:text-[#36135d] transition-colors truncate">
                        {cat.name}
                      </span>
                      {cat.subtitle ? (
                        <span className="text-[10px] text-gray-400 group-hover:text-purple-600/80 transition-colors truncate">
                          {cat.subtitle}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 group-hover:text-purple-600/80 transition-colors truncate">
                          {cat.total_products_count || cat.products_count ? `${cat.total_products_count || cat.products_count} Products` : 'Explore'}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#36135d] group-hover:translate-x-0.5 transition-transform shrink-0 ml-1" />
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Bottom Action: View All Categories */}
          <div className="pt-2 border-t border-gray-100 mt-1">
            <Link
              href="/shop"
              className="group flex items-center justify-between px-3 py-2 rounded-lg bg-linear-to-r from-purple-50 via-pink-50 to-amber-50/40 border border-purple-100/70 hover:border-purple-200 hover:shadow-xs transition"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-md bg-[#240d42] text-white flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform">
                  <LayoutGrid className="w-3.5 h-3.5" />
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-gray-900 group-hover:text-[#36135d] transition-colors leading-tight">
                    All Categories
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium leading-tight">
                    View Complete Catalog
                  </span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#36135d] group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>

        {/* Center Column: 3D Hero Stage or uploaded image carousel */}
        {mode === null ? (
          <div
            aria-hidden
            className={`${HERO_SIZE} rounded-2xl bg-linear-to-br from-[#1a0033] via-[#2e0a5c] to-[#5b1a8f] animate-pulse`}
          />
        ) : mode === 'images' && images.length > 0 ? (
          <HeroImageCarousel images={images} className={HERO_SIZE} />
        ) : (
          <HeroStage slides={slides} className={HERO_SIZE} />
        )}
      </div>
    </div>
  );
}
