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

// Rows that fit the sidebar's fixed height; the last row links to the full catalogue.
const SIDEBAR_ROWS = 11;

// The banner takes the full width beside the category list.
const HERO_SIZE = 'lg:col-span-9 min-h-[230px] h-[260px] sm:h-[340px] lg:h-[425px]';

export default function HeroBanner() {
  const [slides, setSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES);
  const [images, setImages] = useState<HeroBannerImage[]>([]);
  // null until the API answers, so the 3D scene never flashes before an image carousel.
  const [mode, setMode] = useState<HeroMode | null>(null);
  const reduce = useReducedMotion();
  const { categories } = useCategories();
  const sidebarItems = [
    ...categories.slice(0, SIDEBAR_ROWS).map((cat) => ({ key: `c${cat.id}`, name: cat.name, href: categoryHref(cat), icon: <CategoryIcon icon={cat.icon} className="w-3.5 h-3.5" /> })),
    { key: 'all', name: 'All Categories', href: '/shop', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  ];

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
        {/* Left Column: Vertical Category List (12 items) */}
        <motion.div
          initial={reduce ? false : { opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="hidden lg:block lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-2xs p-2.5 flex flex-col justify-between h-[425px]"
        >
          <div className="space-y-0.5">
            {sidebarItems.map((item, idx) => {
              return (
                <motion.div
                  key={item.key}
                  initial={reduce ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + idx * 0.035, duration: 0.45, ease: EASE }}
                >
                  <Link
                    href={item.href}
                    className="relative flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:text-[#36135d] transition group overflow-hidden"
                  >
                    {/* Sliding highlight */}
                    <span className="absolute inset-0 bg-linear-to-r from-purple-100 to-purple-50/0 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out rounded-lg" />
                    <div className="relative flex items-center gap-2.5">
                      <span className="text-gray-400 group-hover:text-[#36135d] group-hover:scale-125 group-hover:-rotate-12 transition-transform duration-300 flex">
                        {item.icon}
                      </span>
                      <span className="group-hover:translate-x-0.5 transition-transform duration-300">{item.name}</span>
                    </div>
                    <ChevronRight className="relative w-3 h-3 text-gray-300 group-hover:text-[#36135d] group-hover:translate-x-0.5 transition" />
                  </Link>
                </motion.div>
              );
            })}
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
