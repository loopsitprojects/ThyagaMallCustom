'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Phone, Mail, ShieldCheck, Lock } from 'lucide-react';
import { getAssetUrl } from '@/utils/assets';
import { useFlashSale } from '@/context/FlashSaleContext';
import { useCategories, categoryHref } from '@/hooks/useCategories';

export default function Footer() {
  const { isActive } = useFlashSale();
  const { categories } = useCategories();
  const menuCategories = categories.filter((c) => c.show_in_menu);
  return (
    <footer className="hidden md:block bg-[#150d22] text-gray-300 mt-12 border-t-2 border-[#36135d]">
      {/* Main 5-Column Grid */}
      <div className="max-w-site mx-auto px-4 lg:px-6 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 text-xs">
        {/* Col 1: Brand Info (span 4) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Official Logo Card */}
          <div className="bg-white px-2.5 py-1.5 rounded-lg w-fit shadow-xs">
            <Image
              src={getAssetUrl('/logo.png')}
              alt="thyāga mall"
              width={140}
              height={71}
              className="h-8 w-auto object-contain"
            />
          </div>
          <p className="text-[11px] font-semibold text-purple-300 tracking-wide">
            Shop More. Live Better.
          </p>
          <p className="text-[11px] text-gray-400 leading-relaxed max-w-sm">
            Sri Lanka&apos;s premium online shopping destination. Original products, great prices and a better shopping experience &mdash; only at mall.thyaga.lk
          </p>

          <div className="pt-2 space-y-2 text-[11px] text-gray-400">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#e11d48] shrink-0" />
              <span>2A, Suleiman Terrace, Colombo 05</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#e11d48] shrink-0" />
              <a href="tel:+94706850414" className="hover:text-white transition">
                +94 70 685 0414
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#e11d48] shrink-0" />
              <a href="mailto:mall@thyaga.lk" className="hover:text-white transition">
                mall@thyaga.lk
              </a>
            </div>
          </div>
        </div>

        {/* Col 2: Shop (span 2) */}
        <div className="lg:col-span-2 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Shop
          </h4>
          <ul className="space-y-2 text-[11px] text-gray-400">
            <li>
              <Link href="/shop" className="hover:text-white transition">All Categories</Link>
            </li>
            <li>
              <Link href="/shop?sort=popular" className="hover:text-white transition">Trending Products</Link>
            </li>
            {isActive ? (
              <li>
                <Link href="/flash-deals" className="hover:text-white transition">Today&apos;s Deals</Link>
              </li>
            ) : (
              <li>
                <Link href="/shop?sort=popular" className="hover:text-white transition">Popular Offers</Link>
              </li>
            )}
            <li>
              <Link href="/shop?sort=newest" className="hover:text-white transition">New Arrivals</Link>
            </li>
            {menuCategories.map((cat) => (
              <li key={cat.id}>
                <Link href={categoryHref(cat)} className="hover:text-white transition">{cat.name}</Link>
              </li>
            ))}
            <li>
              <Link href="/shop?view=brands" className="hover:text-white transition">Brand Store</Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Customer Care (span 2) */}
        <div className="lg:col-span-2 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Customer Care
          </h4>
          <ul className="space-y-2 text-[11px] text-gray-400">
            <li>
              <Link href="/track-order" className="hover:text-white transition">Track Your Order</Link>
            </li>
            <li>
              <Link href="/returns" className="hover:text-white transition">Returns &amp; Refunds</Link>
            </li>
            <li>
              <Link href="/shipping" className="hover:text-white transition">Shipping Information</Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-white transition">FAQs</Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white transition">Contact Us</Link>
            </li>
          </ul>
        </div>

        {/* Col 4: About Us (span 2) */}
        <div className="lg:col-span-2 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            About Us
          </h4>
          <ul className="space-y-2 text-[11px] text-gray-400">
            <li>
              <Link href="/about" className="hover:text-white transition">Our Story</Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white transition">Terms &amp; Conditions</Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            </li>
          </ul>
        </div>

        {/* Col 5: Payment Methods (span 2) */}
        <div className="lg:col-span-2 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Payment Methods
          </h4>
          
          <div className="grid grid-cols-2 gap-1.5 text-center">
            <div className="bg-white rounded px-2 py-1 flex items-center justify-center h-8 shadow-xs hover:shadow transition group" title="Visa">
              <img src={getAssetUrl('/payments/visa.svg')} alt="Visa" className="max-h-5 max-w-full object-contain group-hover:scale-105 transition-transform" />
            </div>
            <div className="bg-white rounded px-2 py-1 flex items-center justify-center h-8 shadow-xs hover:shadow transition group" title="Mastercard">
              <img src={getAssetUrl('/payments/mastercard.svg')} alt="Mastercard" className="max-h-6 max-w-full object-contain group-hover:scale-105 transition-transform" />
            </div>
            <div className="bg-white rounded px-2 py-1 flex items-center justify-center h-8 shadow-xs hover:shadow transition group" title="American Express">
              <img src={getAssetUrl('/payments/amex.svg')} alt="AMEX" className="max-h-5 max-w-full object-contain group-hover:scale-105 transition-transform" />
            </div>
            <div className="bg-white rounded px-2 py-1 flex items-center justify-center h-8 shadow-xs hover:shadow transition group" title="Koko Buy Now Pay Later">
              <img src={getAssetUrl('/payments/koko.png')} alt="Koko" className="max-h-5 max-w-full object-contain group-hover:scale-105 transition-transform" />
            </div>
            <div className="bg-white rounded px-2 py-1 flex items-center justify-center h-8 shadow-xs hover:shadow transition group" title="FriMi Digital Banking">
              <img src={getAssetUrl('/payments/frimi.png')} alt="FriMi" className="max-h-5 max-w-full object-contain group-hover:scale-105 transition-transform" />
            </div>
            <div className="bg-white rounded px-2 py-1 flex items-center justify-center h-8 shadow-xs hover:shadow transition group" title="Dialog Genie">
              <img src={getAssetUrl('/payments/genie.svg')} alt="Genie" className="max-h-5 max-w-full object-contain group-hover:scale-105 transition-transform" />
            </div>
            <div className="bg-white rounded px-2 py-1 flex items-center justify-center h-8 shadow-xs hover:shadow transition group" title="Bank Transfer">
              <img src={getAssetUrl('/payments/bank-transfer.svg')} alt="Bank Transfer" className="max-h-6 max-w-full object-contain group-hover:scale-105 transition-transform" />
            </div>
            <div className="bg-white rounded px-2 py-1 flex items-center justify-center h-8 shadow-xs hover:shadow transition group" title="Cash on Delivery (COD)">
              <img src={getAssetUrl('/payments/cod.svg')} alt="Cash on Delivery" className="max-h-6 max-w-full object-contain group-hover:scale-105 transition-transform" />
            </div>
          </div>

          <div className="pt-2 space-y-1.5 border-t border-purple-900/40 text-[10px] text-gray-400">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>100% Secure Checkout</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Lock className="w-3 h-3 text-purple-400 shrink-0" />
              <span>256-bit SSL Encryption</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-[#0e0818] py-4 border-t border-purple-950 text-gray-400 text-[11px]">
        <div className="max-w-site mx-auto px-4 lg:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <span>&copy; {new Date().getFullYear()} mall.thyaga.lk. All rights reserved.</span>
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/privacy" className="hover:text-white transition">
              Privacy Policy
            </Link>
            <span className="text-gray-600">•</span>
            <Link href="/terms" className="hover:text-white transition">
              Terms of Service
            </Link>
            <span className="text-gray-600">•</span>
            <Link href="/faq" className="hover:text-white transition">
              FAQs
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
