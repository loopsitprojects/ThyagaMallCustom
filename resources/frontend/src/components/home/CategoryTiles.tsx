'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Folder } from 'lucide-react';
import TiltCard from '@/components/motion/TiltCard';
import { Stagger, StaggerItem } from '@/components/motion/Reveal';
import CategoryIcon from '@/components/common/CategoryIcon';
import { useCategories, categoryHref, categoryGradient } from '@/hooks/useCategories';
import { getAssetUrl } from '@/utils/assets';

export default function CategoryTiles() {
  const { categories, isLoading } = useCategories();
  // Categories marked "Show on homepage" in Admin → Categories, in their admin order.
  const tiles = categories.filter((c) => c.is_featured);

  if (!isLoading && tiles.length === 0) return null;

  return (
    <section className="my-6 bg-white rounded-xl border border-gray-200 shadow-2xs p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-[#36135d]" />
          <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight font-poppins">
            Shop by Category
          </h2>
        </div>

        <Link
          href="/shop"
          className="text-xs font-bold text-[#6d28d9] hover:text-[#5b21b6] flex items-center gap-1 group"
        >
          <span>View All Categories</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-3.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <Stagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-3.5">
          {tiles.map((cat) => {
            const { from, to } = categoryGradient(cat);
            return (
              <StaggerItem key={cat.id}>
                <TiltCard max={12}>
                  <Link
                    href={categoryHref(cat)}
                    className="rounded-2xl p-3.5 flex flex-col justify-between h-44 relative group hover:shadow-[0_20px_40px_-14px_rgba(54,19,93,0.35)] transition-shadow duration-300 border border-black/5 [transform-style:preserve-3d]"
                    style={{ background: `linear-gradient(160deg, ${from}26, ${to}1f)` }}
                  >
                    {/* Decorative ring that grows on hover */}
                    <span aria-hidden className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                      <span className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full border-[6px] border-white/50 group-hover:scale-150 transition-transform duration-700" />
                    </span>

                    {/* Text details */}
                    <div className="relative z-10 [transform:translateZ(25px)]">
                      <h3 className="text-xs font-extrabold text-gray-900 leading-tight">{cat.name}</h3>
                      {cat.subtitle && <p className="text-[10px] text-gray-500 font-medium">{cat.subtitle}</p>}
                    </div>

                    {/* Category photo, or the category's icon on its colour gradient */}
                    <div
                      className="absolute bottom-2.5 right-2.5 w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden shadow-md border-2 border-white bg-white flex items-center justify-center [transform:translateZ(50px)] group-hover:[transform:translateZ(70px)_rotate(-4deg)_scale(1.06)] group-hover:shadow-2xl transition-all duration-500"
                      style={cat.image ? undefined : { background: `linear-gradient(135deg, ${from}, ${to})` }}
                    >
                      {cat.image ? (
                        <Image
                          src={getAssetUrl(cat.image)}
                          alt={cat.name}
                          fill
                          sizes="96px"
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <CategoryIcon icon={cat.icon} className="w-9 h-9 text-white drop-shadow-sm" strokeWidth={2} />
                      )}
                    </div>

                    {/* Circular white action arrow */}
                    <div className="w-7 h-7 rounded-full bg-white shadow-2xs flex items-center justify-center text-gray-700 group-hover:bg-[#36135d] group-hover:text-white transition-colors relative z-10 border border-white/80 [transform:translateZ(35px)]">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </Link>
                </TiltCard>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </section>
  );
}
