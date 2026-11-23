'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ZoomIn } from 'lucide-react';

const ZOOM_SCALE = 2.5;

interface ProductImageZoomProps {
  src: string;
  alt: string;
  /** Badges etc. drawn over the image; they stay put while the image zooms. */
  children?: React.ReactNode;
}

/**
 * Product photo that magnifies under the mouse pointer on hover.
 * Touch devices are left alone so scrolling and tapping work as usual.
 */
export default function ProductImageZoom({ src, alt, children }: ProductImageZoomProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');

  const followPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * 100;
    const y = ((e.clientY - box.top) / box.height) * 100;
    setOrigin(`${Math.min(100, Math.max(0, x))}% ${Math.min(100, Math.max(0, y))}%`);
    setIsZoomed(true);
  };

  return (
    <div
      className={`group relative w-full aspect-square bg-[#fbfbfe] rounded-xl border border-gray-200/80 overflow-hidden ${
        isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
      }`}
      onPointerEnter={followPointer}
      onPointerMove={followPointer}
      onPointerLeave={() => setIsZoomed(false)}
    >
      <div
        className="absolute inset-0 transition-transform duration-200 ease-out will-change-transform"
        style={{ transform: isZoomed ? `scale(${ZOOM_SCALE})` : 'scale(1)', transformOrigin: origin }}
      >
        <Image src={src} alt={alt} fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-contain p-6" />
      </div>

      {children}

      {/* Hint, only for mouse users before they zoom */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-3 right-3 hidden [@media(hover:hover)]:flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-600 shadow-xs transition-opacity ${
          isZoomed ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <ZoomIn className="w-3.5 h-3.5" />
        Hover to zoom
      </span>
    </div>
  );
}
