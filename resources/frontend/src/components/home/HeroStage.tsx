'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence, useInView, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { HeroSlide } from '@/types';

// three.js is heavy — load the 3D scene only in the browser, after first paint.
const HeroScene = dynamic(() => import('@/components/three/HeroScene'), { ssr: false });

export const SLIDE_MS = 5500;
const EASE = [0.22, 1, 0.36, 1] as const;

// Used until the API responds, and if no slides are configured on the server.
export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  ['Big Savings', 'Brighter Living', 'Electronics, Home, Fashion, Beauty & more', '60%', '/shop', '#7c3aed', '#f472b6', '#1a0033', '#2e0a5c', '#5b1a8f'],
  ['Smarter Devices', 'Better Everyday', 'Premium Audio, Smartwatches & Gadgets', '50%', '/shop?category=electronics', '#2563eb', '#22d3ee', '#030a2e', '#0b1f5c', '#3b0a6b'],
  ['Trending Styles', 'Modern Living', 'Designer Apparel, Fragrances & Accessories', '45%', '/shop?category=fashion', '#e11d48', '#fbbf24', '#2a0018', '#5c0a33', '#8f1a4f'],
  ['Home & Living', 'Smart Essentials', 'Cookware, Bedding, Decor & Appliances', '55%', '/shop?category=home', '#0d9488', '#a3e635', '#001f1c', '#063d3a', '#2e0a5c'],
  ['Exclusive Deals', 'Mega Savings', 'Daily Essentials & Groceries Delivered Fast', '40%', '/shop', '#f59e0b', '#fb7185', '#240046', '#4a0a3d', '#8f2a0a'],
].map(([t1, t2, sub, value, link, box, accent, from, via, to], i) => ({
  id: -(i + 1),
  title_line1: t1,
  title_line2: t2,
  subtext: sub,
  show_badge: true,
  badge_top: 'UP TO',
  badge_value: value,
  badge_bottom: 'OFF',
  cta_text: 'Shop Now',
  cta_link: link,
  box_color: box,
  accent_color: accent,
  gradient_from: from,
  gradient_via: via,
  gradient_to: to,
  sort_order: i,
  is_active: true,
}));

// Only site paths or https URLs are ever used as links (the API enforces this too).
export function safeLink(link: string): { href: string; external: boolean } {
  if (/^\/(?!\/)/.test(link)) return { href: link, external: false };
  if (/^https:\/\//i.test(link)) return { href: link, external: true };
  return { href: '/shop', external: false };
}

interface HeroStageProps {
  slides: HeroSlide[];
  className?: string;
  /** Auto-advance between slides (off for the admin preview) */
  autoPlay?: boolean;
  /** Render a <h1> for the headline (only on the real homepage) */
  asHeading?: boolean;
}

export default function HeroStage({ slides, className = '', autoPlay = true, asHeading = true }: HeroStageProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { margin: '0px 0px -10% 0px' });
  const reduce = useReducedMotion();

  const count = slides.length;
  const current = count > 0 ? index % count : 0;
  const slide = slides[current];

  useEffect(() => {
    if (!autoPlay || isPaused || count < 2) return;
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % count), SLIDE_MS);
    return () => clearInterval(timer);
  }, [autoPlay, isPaused, count]);

  if (!slide) return null;

  const link = safeLink(slide.cta_link);
  const Heading = asHeading ? 'h1' : 'h2';
  const lines = [slide.title_line1, slide.title_line2].filter((l): l is string => !!l);
  const ctaClass =
    'btn-shine relative overflow-hidden inline-flex items-center gap-2 bg-white text-[#2b0054] hover:text-[#3c096c] px-4 py-2 sm:px-6 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-200 shadow-[0_8px_24px_-6px_rgba(255,255,255,0.55)] hover:shadow-[0_10px_30px_-4px_rgba(255,255,255,0.75)] hover:-translate-y-0.5 active:scale-95 group/btn cursor-pointer w-fit';
  const ctaInner = (
    <>
      <span className="tracking-tight">{slide.cta_text}</span>
      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2b0054] group-hover/btn:translate-x-1 transition-transform duration-200" />
    </>
  );

  return (
    <motion.div
      ref={stageRef}
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: EASE }}
      className={`relative rounded-2xl overflow-hidden shadow-lg shadow-purple-900/20 flex flex-col justify-between bg-[#1a0033] text-white p-4 sm:p-7 md:p-8 group select-none isolate ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Cross-fading gradient backdrop per slide */}
      <AnimatePresence initial={false}>
        <motion.div
          key={current}
          className="absolute inset-0 -z-20"
          style={{ background: `linear-gradient(to bottom right, ${slide.gradient_from}, ${slide.gradient_via}, ${slide.gradient_to})` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1 }}
        />
      </AnimatePresence>

      {/* Drifting aurora glows */}
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <div className="hero-aurora absolute -top-24 -left-16 w-72 h-72 rounded-full blur-3xl opacity-50" style={{ background: slide.box_color, transition: 'background 1s' }} />
        <div className="hero-aurora-2 absolute -bottom-28 right-0 w-80 h-80 rounded-full blur-3xl opacity-40" style={{ background: slide.accent_color, transition: 'background 1s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.09)_1px,transparent_1px)] bg-size-[18px_18px] mask-[radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      {/* Interactive 3D gift scene */}
      <div className="absolute inset-y-0 right-0 w-[62%] sm:w-[60%] -z-0 pointer-events-none">
        <HeroScene color={slide.box_color} accent={slide.accent_color} paused={!inView || !!reduce} />
      </div>

      {/* Scalloped Starburst Rosette Badge Top Right */}
      <AnimatePresence>
        {slide.show_badge && (slide.badge_top || slide.badge_value || slide.badge_bottom) && (
          <motion.div
            key={current}
            initial={{ scale: 0, rotate: -160, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0, rotate: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 16 }}
            className="absolute top-3 right-3 sm:top-5 sm:right-6 w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 z-20 drop-shadow-[0_8px_18px_rgba(255,0,127,0.45)]"
          >
            <svg viewBox="0 0 100 100" className="w-full h-full fill-[#ff007f] badge-spin" aria-hidden="true">
              <path d="M 90.00 50.00 Q 97.08 59.36 86.96 65.31 Q 89.91 76.67 78.28 78.28 Q 76.67 89.91 65.31 86.96 Q 59.36 97.08 50.00 90.00 Q 40.64 97.08 34.69 86.96 Q 23.33 89.91 21.72 78.28 Q 10.09 76.67 13.04 65.31 Q 2.92 59.36 10.00 50.00 Q 2.92 40.64 13.04 34.69 Q 10.09 23.33 21.72 21.72 Q 23.33 10.09 34.69 13.04 Q 40.64 2.92 50.00 10.00 Q 59.36 2.92 65.31 13.04 Q 76.67 10.09 78.28 21.72 Q 89.91 23.33 86.96 34.69 Q 97.08 40.64 90.00 50.00 Z" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white pointer-events-none select-none px-1">
              <span className="text-[7px] sm:text-[9px] font-black tracking-wider uppercase leading-none opacity-95">{slide.badge_top}</span>
              <span className="text-sm sm:text-xl md:text-2xl font-black leading-tight tracking-tight my-0.5 text-white drop-shadow-xs">{slide.badge_value}</span>
              <span className="text-[7px] sm:text-[9px] font-black tracking-wider uppercase leading-none opacity-95">{slide.badge_bottom}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Typography & CTA Content */}
      <div className="relative z-10 max-w-[200px] xs:max-w-[230px] sm:max-w-[280px] md:max-w-sm my-auto flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial="hidden"
            animate="show"
            exit="exit"
            variants={{ show: { transition: { staggerChildren: 0.09 } }, exit: { transition: { staggerChildren: 0.04 } } }}
          >
            <Heading className="text-xl sm:text-2xl md:text-[32px] lg:text-[36px] font-black tracking-tight text-white mb-1.5 sm:mb-2.5 font-poppins leading-[1.15]">
              {lines.map((line, i) => (
                // Extra bottom padding keeps descenders (g, y, p) from being clipped by the reveal mask.
                <span key={`${i}-${line}`} className="block overflow-hidden pb-[0.18em] -mb-[0.1em]">
                  <motion.span
                    className={`block ${i === 1 ? 'bg-linear-to-r from-white via-pink-200 to-amber-200 bg-clip-text text-transparent pb-[0.05em]' : ''}`}
                    variants={{
                      hidden: { y: '110%', rotateX: -60, opacity: 0 },
                      show: { y: '0%', rotateX: 0, opacity: 1, transition: { duration: 0.7, ease: EASE } },
                      exit: { y: '-60%', opacity: 0, transition: { duration: 0.3 } },
                    }}
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </Heading>

            {slide.subtext && (
              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 12, filter: 'blur(4px)' },
                  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5 } },
                  exit: { opacity: 0, transition: { duration: 0.2 } },
                }}
                className="text-xs sm:text-sm text-purple-100 font-medium leading-snug mb-3.5 sm:mb-5"
              >
                {slide.subtext}
              </motion.p>
            )}

            <motion.div
              variants={{
                hidden: { opacity: 0, scale: 0.8 },
                show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 18 } },
                exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
              }}
            >
              {link.external ? (
                <a href={link.href} rel="noopener noreferrer" className={ctaClass}>{ctaInner}</a>
              ) : (
                <Link href={link.href} className={ctaClass}>{ctaInner}</Link>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <>
          {/* Navigation Arrows on Hover (Desktop Bottom Right) */}
          <div className="hidden sm:flex absolute bottom-4 right-5 sm:bottom-5 sm:right-6 z-20 items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => setIndex((current - 1 + count) % count)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition backdrop-blur-md cursor-pointer"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIndex((current + 1) % count)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition backdrop-blur-md cursor-pointer"
              aria-label="Next slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Progress dots — the active one fills over the slide duration */}
          <div className="absolute bottom-3 left-4 sm:bottom-4 sm:left-6 md:left-8 z-10 flex items-center gap-1.5 sm:gap-2">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setIndex(idx)}
                className={`relative h-1.5 sm:h-2 rounded-full overflow-hidden transition-all duration-500 cursor-pointer ${
                  current === idx ? 'w-8 sm:w-10 bg-white/30' : 'w-1.5 sm:w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              >
                {current === idx && autoPlay && (
                  <span
                    key={current}
                    className="hero-progress absolute inset-y-0 left-0 bg-white rounded-full"
                    style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: isPaused ? 'paused' : 'running' }}
                  />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
