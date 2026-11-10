import React from 'react';
import Link from 'next/link';
import { ChevronRight, LucideIcon } from 'lucide-react';

interface InfoPageProps {
  title: string;
  badge: string;
  badgeIcon: LucideIcon;
  intro: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Layout for the static customer-care / about pages (breadcrumb, purple banner, content card).
 */
export default function InfoPage({ title, badge, badgeIcon: BadgeIcon, intro, children }: InfoPageProps) {
  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
        <Link href="/" className="hover:text-[#36135d] transition">Home</Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-gray-900 font-bold">{title}</span>
      </nav>

      {/* Header Banner */}
      <div className="bg-linear-to-r from-[#2c0b4d] via-[#3f106d] to-[#581596] text-white rounded-2xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xs text-purple-200 text-xs font-bold px-3 py-1 rounded-full mb-3 border border-white/10">
            <BadgeIcon className="w-3.5 h-3.5 text-pink-400" />
            <span>{badge}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black font-poppins mb-2">{title}</h1>
          <p className="text-xs sm:text-sm text-purple-200 leading-relaxed">{intro}</p>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 sm:p-10 space-y-8 text-gray-700 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export function InfoSection({ number, title, children }: { number?: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base sm:text-lg font-black text-gray-900 font-poppins flex items-center gap-2">
        {number !== undefined && (
          <span className="w-6 h-6 rounded-lg bg-purple-100 text-[#36135d] text-xs font-black flex items-center justify-center shrink-0">{number}</span>
        )}
        <span>{title}</span>
      </h2>
      <div className="space-y-3 text-gray-600">{children}</div>
    </section>
  );
}

export function SupportContactCard() {
  return (
    <div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200/80 space-y-1.5 text-xs text-gray-600">
      <p className="font-bold text-gray-900 text-sm">Thyaga Mall Customer Care</p>
      <p>
        Phone / WhatsApp:{' '}
        <a href="tel:+94706850414" className="text-[#36135d] hover:underline font-medium">+94 70 685 0414</a>
      </p>
      <p>
        Email:{' '}
        <a href="mailto:mall@thyaga.lk" className="text-[#36135d] hover:underline font-medium">mall@thyaga.lk</a>
      </p>
      <p>
        Or visit our <Link href="/contact" className="text-[#36135d] hover:underline font-medium">Contact page</Link>.
      </p>
    </div>
  );
}
