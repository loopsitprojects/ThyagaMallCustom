'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X, ArrowRight, Copy, Check, Gift } from 'lucide-react';
import { OnboardingAd } from '@/types';
import { api } from '@/services/api';
import { getAssetUrl } from '@/utils/assets';
import { safeLink } from '@/components/home/HeroStage';

const STORAGE_KEY = 'thyaga_onboarding_ad';
const DAY_MS = 24 * 60 * 60 * 1000;

// Never interrupt these flows.
const EXCLUDED_PATHS = ['/checkout', '/order-success', '/login', '/register', '/track-order'];

const EASE = [0.22, 1, 0.36, 1] as const;

interface SeenRecord {
  version: number;
  shownAt: number;
}

function readSeen(storage: Storage): SeenRecord | null {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
    return parsed && typeof parsed.version === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

/** Whether this visitor should see this version of the ad, given its frequency setting. */
function shouldShow(ad: OnboardingAd): boolean {
  try {
    if (ad.frequency === 'session') {
      return readSeen(sessionStorage)?.version !== ad.version;
    }
    const seen = readSeen(localStorage);
    if (!seen || seen.version !== ad.version) return true;
    return ad.frequency === 'daily' && Date.now() - seen.shownAt > DAY_MS;
  } catch {
    return true; // storage blocked (private mode) — still show once per page load
  }
}

function markShown(ad: OnboardingAd): void {
  try {
    const storage = ad.frequency === 'session' ? sessionStorage : localStorage;
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: ad.version, shownAt: Date.now() } satisfies SeenRecord));
  } catch {
    // ignore — storage unavailable
  }
}

function isEligiblePage(ad: OnboardingAd, pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (EXCLUDED_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return false;
  return ad.pages === 'all' || path === '/';
}

/**
 * Storefront welcome pop-up. Loads its settings once, then opens after the configured
 * delay on an eligible page, respecting the visitor's dismissal history.
 */
export default function OnboardingAdPopup() {
  const pathname = usePathname() || '/';
  const [ad, setAd] = useState<OnboardingAd | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const hasShown = useRef(false);

  useEffect(() => {
    let cancelled = false;
    api.getOnboardingAd()
      .then((res) => {
        if (!cancelled && res.success && res.data?.enabled) setAd(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ad || hasShown.current || !isEligiblePage(ad, pathname) || !shouldShow(ad)) return;
    const timer = setTimeout(() => {
      hasShown.current = true;
      markShown(ad);
      setIsOpen(true);
    }, Math.max(0, ad.delay_seconds) * 1000);
    return () => clearTimeout(timer);
  }, [ad, pathname]);

  // Hide it if the visitor navigates somewhere the ad shouldn't appear (e.g. checkout).
  const isVisible = !!ad && isOpen && isEligiblePage(ad, pathname);

  // Escape closes; lock page scroll while open.
  useEffect(() => {
    if (!isVisible) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isVisible]);

  return (
    <AnimatePresence>
      {ad && isVisible && (
        <motion.div
          key="onboarding-ad"
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 print:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => setIsOpen(false)} aria-hidden />
          {/* Container query wrapper: the card switches to side-by-side when it has room (also in the admin preview) */}
          <div className="@container relative w-full flex justify-center pointer-events-none [&>*]:pointer-events-auto">
            <OnboardingAdCard ad={ad} onClose={() => setIsOpen(false)} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface OnboardingAdCardProps {
  ad: Pick<OnboardingAd, 'layout' | 'badge' | 'title' | 'body' | 'coupon_code' | 'cta_text' | 'cta_link' | 'dismiss_text' | 'accent_color' | 'image_url'>;
  onClose: () => void;
  /** Admin preview: render in place instead of animating up as a dialog */
  preview?: boolean;
}

/** The ad itself; also used by the admin page as a live preview. Place inside an `@container` element. */
export function OnboardingAdCard({ ad, onClose, preview = false }: OnboardingAdCardProps) {
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);
  const accent = ad.accent_color || '#431968';
  const link = ad.cta_link ? safeLink(ad.cta_link) : null;
  const imageUrl = ad.image_url ? getAssetUrl(ad.image_url) : null;
  const imageOnly = ad.layout === 'image' && !!imageUrl;

  useEffect(() => {
    if (!preview) closeRef.current?.focus();
  }, [preview]);

  const copyCode = async () => {
    if (!ad.coupon_code) return;
    try {
      await navigator.clipboard.writeText(ad.coupon_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — the code is still visible to copy by hand
    }
  };

  const closeButton = (
    <button
      ref={closeRef}
      type="button"
      onClick={onClose}
      className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-md flex items-center justify-center transition cursor-pointer"
      aria-label="Close"
    >
      <X className="w-4 h-4" />
    </button>
  );

  const ctaInner = (
    <>
      <span>{ad.cta_text}</span>
      <ArrowRight className="w-4 h-4 group-hover/cta:translate-x-0.5 transition-transform" />
    </>
  );
  const ctaClass =
    'btn-shine relative overflow-hidden group/cta inline-flex items-center justify-center gap-2 w-full @2xl:w-auto min-w-[170px] px-6 py-3 rounded-lg text-white text-sm font-bold shadow-lg transition hover:-translate-y-0.5 hover:brightness-110';

  const shellClass = `relative w-full bg-white overflow-hidden shadow-2xl ${
    // Bottom sheet on phones (matches the overlay's viewport-based alignment), card from 640px up.
    preview ? 'rounded-2xl' : 'rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto'
  } ${imageOnly ? '@lg:max-w-[560px]' : imageUrl ? '@lg:max-w-[560px] @2xl:max-w-[760px]' : '@lg:max-w-[460px]'}`;

  const motionProps = preview || reduce
    ? {}
    : {
        initial: { opacity: 0, y: 60, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 40, scale: 0.98 },
        transition: { duration: 0.45, ease: EASE },
      };

  if (imageOnly) {
    // eslint-disable-next-line @next/next/no-img-element
    const picture = <img src={imageUrl} alt={ad.title || 'Thyaga Mall offer'} className="block w-full h-auto" />;
    return (
      <motion.div {...motionProps} className={shellClass} role="dialog" aria-modal={!preview} aria-label={ad.title || 'Special offer'}>
        {closeButton}
        {link ? (
          link.external ? (
            <a href={link.href} rel="noopener noreferrer" onClick={onClose}>{picture}</a>
          ) : (
            <Link href={link.href} onClick={onClose}>{picture}</Link>
          )
        ) : (
          picture
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      {...motionProps}
      className={`${shellClass} flex flex-col ${imageUrl ? '@2xl:flex-row' : ''}`}
      role="dialog"
      aria-modal={!preview}
      aria-labelledby="onboarding-ad-title"
    >
      {closeButton}

      {imageUrl ? (
        <div className="relative @2xl:w-[46%] h-44 @2xl:h-auto @2xl:min-h-[400px] shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        </div>
      ) : (
        <div
          className="relative h-28 shrink-0 flex items-center justify-center overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${accent}, #e11d48)` }}
        >
          <span aria-hidden className="absolute -top-8 -left-6 w-28 h-28 rounded-full bg-white/10" />
          <span aria-hidden className="absolute -bottom-10 right-4 w-32 h-32 rounded-full bg-white/10" />
          <motion.span
            animate={reduce ? undefined : { y: [0, -6, 0], rotate: [0, -6, 4, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="relative w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white"
          >
            <Gift className="w-7 h-7" />
          </motion.span>
        </div>
      )}

      <div className="flex-1 p-6 @2xl:p-8 flex flex-col justify-center text-center @2xl:text-left">
        {ad.badge && (
          <span
            className="self-center @2xl:self-start inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full mb-3"
            style={{ color: accent, backgroundColor: `${accent}14` }}
          >
            {ad.badge}
          </span>
        )}
        {ad.title && (
          <h2 id="onboarding-ad-title" className="text-xl @2xl:text-2xl font-black text-gray-900 font-poppins leading-tight">
            {ad.title}
          </h2>
        )}
        {ad.body && <p className="text-sm text-gray-600 leading-relaxed mt-2.5 whitespace-pre-line">{ad.body}</p>}

        {ad.coupon_code && (
          <button
            type="button"
            onClick={copyCode}
            className="mt-5 w-full flex items-center justify-between gap-3 border-2 border-dashed rounded-xl px-4 py-3 transition hover:bg-gray-50 cursor-pointer"
            style={{ borderColor: `${accent}66` }}
            aria-label={`Copy code ${ad.coupon_code}`}
          >
            <span className="text-left">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Your code</span>
              <span className="block text-base font-black tracking-widest" style={{ color: accent }}>{ad.coupon_code}</span>
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-gray-600">
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </span>
          </button>
        )}

        <div className="mt-6 flex flex-col @2xl:flex-row items-center gap-3">
          {ad.cta_text && link && (
            link.external ? (
              <a href={link.href} rel="noopener noreferrer" onClick={onClose} className={ctaClass} style={{ backgroundColor: accent }}>
                {ctaInner}
              </a>
            ) : (
              <Link href={link.href} onClick={onClose} className={ctaClass} style={{ backgroundColor: accent }}>
                {ctaInner}
              </Link>
            )
          )}
          {ad.dismiss_text && (
            <button type="button" onClick={onClose} className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-2 cursor-pointer">
              {ad.dismiss_text}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
