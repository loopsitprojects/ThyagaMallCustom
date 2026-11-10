'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { BadgePercent } from 'lucide-react';
import CategoryIcon from '@/components/common/CategoryIcon';
import { useCategories, categoryHref, categoryGradient } from '@/hooks/useCategories';
import { useFlashSale } from '@/context/FlashSaleContext';

interface Shortcut {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  from: string;
  to: string;
}

const ICON_CLASS = 'relative w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-sm';

export default function QuickCategoryIcons() {
  const reduce = useReducedMotion();
  const { categories, isLoading } = useCategories();
  const { isActive: hasFlashSale } = useFlashSale();

  // Categories marked "Show on homepage" in Admin → Categories, in their admin order.
  const shortcuts: Shortcut[] = [
    ...(hasFlashSale
      ? [{ key: 'deals', label: 'Top Deals', href: '/flash-deals', icon: <BadgePercent className={ICON_CLASS} strokeWidth={2.1} />, from: '#ff8a3d', to: '#f43f5e' }]
      : []),
    ...categories.filter((c) => c.is_featured).map((c) => ({
      key: `c${c.id}`,
      label: c.name,
      href: categoryHref(c),
      icon: <CategoryIcon icon={c.icon} className={ICON_CLASS} strokeWidth={2.1} />,
      ...categoryGradient(c),
    })),
  ];

  if (!isLoading && shortcuts.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs px-3 py-5 sm:px-5 my-4">
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-[repeat(auto-fit,minmax(88px,1fr))] gap-x-2 gap-y-5">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gray-100" />
                <div className="h-2.5 w-12 rounded bg-gray-100" />
              </div>
            ))
          : shortcuts.map((item, idx) => (
              <motion.div
                key={item.key}
                initial={reduce ? false : { opacity: 0, y: 20, scale: 0.7 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 260, damping: 18, delay: idx * 0.035 }}
              >
                <Link href={item.href} className="flex flex-col items-center gap-2 text-center group cursor-pointer">
                  <motion.div
                    whileHover={reduce ? undefined : { y: -5, rotate: -6, scale: 1.08, boxShadow: `0 16px 26px -8px ${item.to}` }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${item.from}, ${item.to})`,
                      boxShadow: `0 8px 18px -8px ${item.to}`,
                    }}
                  >
                    {/* Glossy highlight + soft corner bubble for depth */}
                    <span aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/35 to-transparent" />
                    <span aria-hidden className="absolute -right-3 -bottom-3 w-9 h-9 rounded-full bg-white/15 group-hover:scale-150 transition-transform duration-500" />
                    {item.icon}
                  </motion.div>
                  <span className="text-[11px] sm:text-xs font-bold text-gray-700 group-hover:text-[#36135d] transition-colors leading-tight">
                    {item.label}
                  </span>
                </Link>
              </motion.div>
            ))}
      </div>
    </div>
  );
}
