'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HeroBannerImage } from '@/types';
import { getAssetUrl } from '@/utils/assets';
import { safeLink, SLIDE_MS } from '@/components/home/HeroStage';

const EASE = [0.22, 1, 0.36, 1] as const;
const SWIPE_PX = 50;

interface HeroImageCarouselProps {
  images: HeroBannerImage[];
  className?: string;
  /** Auto-advance between images (off for the admin preview) */
  autoPlay?: boolean;
}

/**
 * Homepage hero as a plain image carousel (Admin → Hero Slides → "Image Carousel").
 * Images cover the frame, so banners designed at roughly 1200×750 (16:10) fit best.
 */
export default function HeroImageCarousel({ images, className = '', autoPlay = true }: HeroImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const reduce = useReducedMotion();

  const count = images.length;
  const current = count > 0 ? index % count : 0;
  const image = images[current];

  useEffect(() => {
    if (!autoPlay || isPaused || count < 2) return;
    const timer = setInterval(() => {
      setDirection(1);
      setIndex((prev) => (prev + 1) % count);
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, [autoPlay, isPaused, count]);

  if (!image) return null;

  const goTo = (next: number, dir: number) => {
    setDirection(dir);
    setIndex((next + count) % count);
  };

  const link = image.link ? safeLink(image.link) : null;
  const hasText = !!(image.title || image.subtitle);
  const showButton = !!(link && image.cta_text);
  const label = image.title || image.alt_text || 'View offer';

  // The whole slide is one link; the button is a styled <span> inside it (links can't be nested).
  const slideBody = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getAssetUrl(image.image_url)}
        alt={hasText ? '' : image.alt_text || 'Thyaga Mall offer'}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
        fetchPriority={current === 0 ? 'high' : 'auto'}
      />

      {(hasText || showButton) && (
        <>
          {/* Left-side shade keeps white text readable on light photos */}
          <div aria-hidden className="absolute inset-0 bg-linear-to-r from-black/55 via-black/25 via-45% to-transparent to-75%" />

          <motion.div
            key={image.id}
            className="absolute top-1/2 -translate-y-1/2 left-[7%] w-[min(420px,78%)] text-white"
            initial={reduce ? false : 'hidden'}
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 0.25 } } }}
          >
            {image.title && (
              <motion.h2
                variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
                className="text-2xl sm:text-4xl lg:text-[44px] font-bold font-poppins leading-[1.05] mb-2 sm:mb-3 [text-shadow:0_2px_8px_rgba(0,0,0,0.25)]"
              >
                {image.title}
              </motion.h2>
            )}
            {image.subtitle && (
              <motion.p
                variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
                className="text-xs sm:text-base lg:text-lg leading-snug whitespace-pre-line mb-4 sm:mb-6 [text-shadow:0_2px_8px_rgba(0,0,0,0.35)]"
              >
                {image.subtitle}
              </motion.p>
            )}
            {showButton && (
              <motion.span
                variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 18 } } }}
                className="btn-shine relative overflow-hidden inline-flex items-center gap-2 bg-[#431968] group-hover/slide:bg-[#572486] text-white text-xs sm:text-base font-semibold px-4 py-2.5 sm:px-6 sm:py-3 rounded-md min-w-[120px] sm:min-w-[150px] justify-center transition duration-200 group-hover/slide:-translate-y-0.5 group-hover/slide:shadow-[0_8px_20px_rgba(67,25,104,0.35)]"
              >
                <span>{image.cta_text}</span>
                <ChevronRight className="w-4 h-4 group-hover/slide:translate-x-0.5 transition-transform" />
              </motion.span>
            )}
          </motion.div>
        </>
      )}
    </>
  );

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: EASE }}
      className={`relative rounded-2xl overflow-hidden shadow-lg shadow-purple-900/20 bg-[#1a0033] group select-none isolate ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX === null || count < 2) return;
        const delta = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(delta) > SWIPE_PX) goTo(current + (delta < 0 ? 1 : -1), delta < 0 ? 1 : -1);
        setTouchStartX(null);
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured offers"
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={image.id}
          custom={direction}
          className="absolute inset-0"
          variants={{
            enter: (dir: number) => (reduce ? { opacity: 0 } : { x: `${dir * 100}%`, opacity: 1 }),
            center: { x: '0%', opacity: 1 },
            exit: (dir: number) => (reduce ? { opacity: 0 } : { x: `${dir * -30}%`, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.7, ease: EASE }}
        >
          {link ? (
            link.external ? (
              <a href={link.href} rel="noopener noreferrer" className="absolute inset-0 group/slide" aria-label={hasText ? undefined : label}>
                {slideBody}
              </a>
            ) : (
              <Link href={link.href} className="absolute inset-0 group/slide" aria-label={hasText ? undefined : label}>
                {slideBody}
              </Link>
            )
          ) : (
            <div className="absolute inset-0">{slideBody}</div>
          )}
        </motion.div>
      </AnimatePresence>

      {count > 1 && (
        <>
          <button
            onClick={() => goTo(current - 1, -1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/25 hover:bg-black/45 border border-white/25 text-white hidden sm:flex items-center justify-center transition backdrop-blur-md cursor-pointer opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => goTo(current + 1, 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/25 hover:bg-black/45 border border-white/25 text-white hidden sm:flex items-center justify-center transition backdrop-blur-md cursor-pointer opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Progress dots — the active one fills over the slide duration */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-full bg-black/20 backdrop-blur-sm">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => goTo(idx, idx > current ? 1 : -1)}
                className={`relative h-1.5 sm:h-2 rounded-full overflow-hidden transition-all duration-500 cursor-pointer ${
                  current === idx ? 'w-8 sm:w-10 bg-white/35' : 'w-1.5 sm:w-2 bg-white/60 hover:bg-white/90'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
                aria-current={current === idx}
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
