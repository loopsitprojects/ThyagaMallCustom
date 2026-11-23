'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { Home, ShoppingBag, Truck, HelpCircle } from 'lucide-react';
import { useCategories, categoryHref } from '@/hooks/useCategories';

/** Sparkles drifting around the "0" bag: position (%), size (px), colour and timing. */
const SPARKLES = [
  { left: '8%', top: '18%', size: 10, color: 'bg-pink-400', delay: 0 },
  { left: '88%', top: '12%', size: 8, color: 'bg-amber-300', delay: 0.6 },
  { left: '94%', top: '70%', size: 12, color: 'bg-purple-400', delay: 1.1 },
  { left: '4%', top: '78%', size: 7, color: 'bg-amber-300', delay: 1.6 },
  { left: '50%', top: '-6%', size: 6, color: 'bg-pink-300', delay: 0.3 },
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

const digitDrop: Variants = {
  hidden: { opacity: 0, y: -70, rotate: -12 },
  show: { opacity: 1, y: 0, rotate: 0, transition: { type: 'spring', stiffness: 260, damping: 14 } },
};

function Digit({ children, floatDelay, still }: { children: string; floatDelay: number; still: boolean }) {
  return (
    <motion.span variants={digitDrop} className="inline-block">
      <motion.span
        className="inline-block bg-linear-to-b from-[#36135d] to-[#a7144c] bg-clip-text text-transparent"
        animate={still ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: floatDelay }}
      >
        {children}
      </motion.span>
    </motion.span>
  );
}

/** "4 [bag] 4": the zero is a lost shopping bag that floats and sways. */
function LostBagScene() {
  const still = useReducedMotion() ?? false;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      aria-hidden="true"
      className="relative flex items-center justify-center gap-2 sm:gap-4 mb-8 select-none text-[88px] sm:text-[128px] font-black leading-none tracking-tighter font-poppins"
    >
      <Digit floatDelay={0} still={still}>4</Digit>

      <motion.span variants={digitDrop} className="relative inline-flex">
        <motion.span
          className="relative inline-flex w-[76px] h-[76px] sm:w-[112px] sm:h-[112px] items-center justify-center rounded-full bg-linear-to-br from-[#36135d] via-[#522485] to-[#a7144c] shadow-xl shadow-purple-900/20"
          animate={still ? undefined : { y: [0, -12, 0], rotate: [-6, 6, -6] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ShoppingBag className="w-9 h-9 sm:w-14 sm:h-14 text-white" strokeWidth={1.75} />
          {/* Soft pulse ring */}
          {!still && (
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-pink-300"
              animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </motion.span>
        {/* Shadow that shrinks as the bag rises */}
        <motion.span
          className="absolute -bottom-4 left-1/2 h-2 w-14 sm:w-20 -translate-x-1/2 rounded-full bg-purple-900/15 blur-[2px]"
          animate={still ? undefined : { scaleX: [1, 0.7, 1], opacity: [0.6, 0.3, 0.6] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.span>

      <Digit floatDelay={0.4} still={still}>4</Digit>

      {!still &&
        SPARKLES.map((sparkle) => (
          <motion.span
            key={`${sparkle.left}-${sparkle.top}`}
            className={`absolute rounded-full ${sparkle.color}`}
            style={{ left: sparkle.left, top: sparkle.top, width: sparkle.size, height: sparkle.size }}
            animate={{ y: [0, -14, 0], opacity: [0, 1, 0], scale: [0.6, 1, 0.6] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: sparkle.delay }}
          />
        ))}
    </motion.div>
  );
}

export default function NotFound() {
  const { categories } = useCategories();
  // Homepage categories from Admin → Categories, plus a link to trending products.
  const departments = [
    ...categories.filter((c) => c.is_featured).slice(0, 7).map((c) => ({ label: c.name, href: categoryHref(c) })),
    { label: 'Trending Deals', href: '/shop?sort=popular' },
  ];

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center py-12 px-4 text-center">
      <LostBagScene />

      {/* Headline & Description */}
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col items-center">
        <motion.h1 variants={fadeUp} className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 mb-3 font-poppins">
          Oops! This page wandered off
        </motion.h1>
        <motion.p variants={fadeUp} className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto mb-8 leading-relaxed">
          The link you followed may be broken, or the page may have been removed. Don’t worry, you can easily find what you’re looking for below.
        </motion.p>

        {/* Action Buttons */}
        <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3 mb-10">
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
        </motion.div>

        {/* Popular Categories */}
        <motion.div variants={fadeUp} className="border-t border-gray-200/80 pt-8 max-w-lg w-full">
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
        </motion.div>
      </motion.div>
    </div>
  );
}
