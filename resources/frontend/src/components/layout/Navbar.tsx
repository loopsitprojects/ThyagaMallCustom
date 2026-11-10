'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, ChevronDown, ChevronRight } from 'lucide-react';
import { useFlashSale } from '@/context/FlashSaleContext';
import { useCategories, categoryHref } from '@/hooks/useCategories';
import CategoryIcon from '@/components/common/CategoryIcon';

export default function Navbar() {
  const [isMegaOpen, setIsMegaOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { isActive } = useFlashSale();
  const { categories } = useCategories();

  // Admin → Categories decides which categories sit in the menu bar ("Show in menu").
  const menuCategories = categories.filter((c) => c.show_in_menu);
  const moreCategories = categories.filter((c) => !c.show_in_menu);
  const hovered = categories.find((c) => c.id === hoveredId);

  return (
    <nav className="bg-white border-b border-gray-200 relative z-30">
      <div className="max-w-site mx-auto px-4 lg:px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Solid Dark Purple "All Categories" button */}
          <div
            className="relative"
            onMouseEnter={() => setIsMegaOpen(true)}
            onMouseLeave={() => setIsMegaOpen(false)}
          >
            <button
              onClick={() => setIsMegaOpen(!isMegaOpen)}
              className="bg-[#240d42] hover:bg-[#36135d] text-white px-5 py-2.5 rounded-t-lg font-bold text-xs tracking-wider flex items-center gap-3 transition cursor-pointer"
            >
              <Menu className="w-4 h-4" />
              <span>All Categories</span>
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </button>

            {/* Flyout Category Menu with sub-category panel */}
            {isMegaOpen && (
              <div
                className="absolute top-full left-0 bg-white text-gray-800 shadow-2xl border border-gray-200 rounded-b-xl flex z-50"
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="w-64 py-2 flex flex-col">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={categoryHref(cat)}
                      onMouseEnter={() => setHoveredId(cat.id)}
                      className={`flex items-center justify-between px-4 py-2 text-xs font-semibold transition ${
                        hoveredId === cat.id ? 'text-[#36135d] bg-purple-50' : 'text-gray-700 hover:text-[#36135d] hover:bg-purple-50'
                      }`}
                      onClick={() => setIsMegaOpen(false)}
                    >
                      <span className="flex items-center gap-2.5">
                        <CategoryIcon icon={cat.icon} className="w-4 h-4 text-gray-400" />
                        {cat.name}
                      </span>
                      {!!cat.children?.length && <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                    </Link>
                  ))}
                  <Link
                    href="/shop"
                    onClick={() => setIsMegaOpen(false)}
                    className="mt-1 mx-4 pt-2 border-t border-gray-100 text-[11px] font-bold text-[#6d28d9] hover:text-[#36135d]"
                  >
                    Browse all products →
                  </Link>
                </div>

                {hovered && !!hovered.children?.length && (
                  <div className="w-60 py-3 px-2 border-l border-gray-100 bg-gray-50/60 rounded-br-xl">
                    <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-gray-400">{hovered.name}</p>
                    {hovered.children.map((sub) => (
                      <div key={sub.id}>
                        <Link
                          href={categoryHref(sub)}
                          onClick={() => setIsMegaOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:text-[#36135d] hover:bg-white transition"
                        >
                          <CategoryIcon icon={sub.icon} className="w-3.5 h-3.5 text-gray-400" />
                          {sub.name}
                        </Link>
                        {sub.children?.map((leaf) => (
                          <Link
                            key={leaf.id}
                            href={categoryHref(leaf)}
                            onClick={() => setIsMegaOpen(false)}
                            className="block pl-9 pr-3 py-1 text-[11px] text-gray-500 hover:text-[#36135d] transition"
                          >
                            {leaf.name}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Horizontal Navigation Links */}
          <div className="hidden lg:flex items-center space-x-6 text-xs font-semibold text-gray-700">
            <Link href="/" className="text-[#36135d] font-bold hover:text-[#e11d48] transition">
              Home
            </Link>
            {isActive && (
              <Link href="/flash-deals" className="hover:text-[#e11d48] transition font-bold text-[#e11d48]">
                Today&apos;s Deals
              </Link>
            )}
            <Link href="/shop?sort=newest" className="hover:text-[#e11d48] transition">
              New Arrivals
            </Link>
            {menuCategories.map((cat) => (
              <Link key={cat.id} href={categoryHref(cat)} className="hover:text-[#e11d48] transition">
                {cat.name}
              </Link>
            ))}
            {moreCategories.length > 0 && (
              <div
                className="relative"
                onMouseEnter={() => setIsMoreOpen(true)}
                onMouseLeave={() => setIsMoreOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setIsMoreOpen((open) => !open)}
                  className="flex items-center gap-1 py-3 hover:text-[#e11d48] transition cursor-pointer"
                  aria-expanded={isMoreOpen}
                >
                  <span>More</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {isMoreOpen && (
                  <div className="absolute top-full left-0 w-52 bg-white shadow-xl border border-gray-200 rounded-xl py-2 z-50">
                    {moreCategories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={categoryHref(cat)}
                        onClick={() => setIsMoreOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 hover:text-[#36135d] hover:bg-purple-50 transition"
                      >
                        <CategoryIcon icon={cat.icon} className="w-4 h-4 text-gray-400" />
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Nav CTA - Hidden when flash sales are inactive */}
        {isActive && (
          <div className="flex items-center gap-3">
            <Link
              href="/flash-deals"
              className="flex items-center gap-1.5 text-xs font-black text-[#e11d48] hover:text-[#be123c] bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition"
            >
              <span className="animate-pulse">⚡</span>
              <span>Flash Deals</span>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
