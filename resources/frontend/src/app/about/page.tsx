import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Gift, ShoppingBag, Ticket, Truck, HeartHandshake } from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/common/InfoPage';

export const metadata: Metadata = {
  title: 'Our Story | Thyaga Mall',
  description: 'Thyaga Mall is the online store where you can spend your Thyaga gift vouchers on products delivered across Sri Lanka.',
};

const HIGHLIGHTS = [
  { icon: ShoppingBag, title: 'Curated range', text: 'Lifestyle essentials, gifts, home, electronics, accessories and wellness products.' },
  { icon: Ticket, title: 'Spend your vouchers', text: 'Redeem Thyaga gift vouchers at checkout and pay any balance by card or on delivery.' },
  { icon: Truck, title: 'Island-wide delivery', text: 'We deliver to every district in Sri Lanka.' },
];

export default function AboutPage() {
  return (
    <InfoPage
      title="Our Story"
      badge="About Thyaga Mall"
      badgeIcon={Gift}
      intro="Thyaga Mall is the online store from Thyaga, Sri Lanka's gift voucher brand — a place to turn your Thyaga vouchers into the things you love."
    >
      <div className="grid sm:grid-cols-3 gap-3">
        {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border border-gray-200/80 bg-gray-50/60 p-4">
            <Icon className="w-5 h-5 text-[#a7144c]" />
            <p className="mt-2 font-bold text-gray-900 text-sm">{title}</p>
            <p className="mt-1 text-xs text-gray-600">{text}</p>
          </div>
        ))}
      </div>

      <InfoSection title="Who we are">
        <p>
          Thyaga Mall brings together a carefully chosen selection of products from trusted merchants, so that everyone who receives a Thyaga
          gift voucher has a simple, reliable place to use it. You can also shop without a voucher and pay by card or cash on delivery.
        </p>
      </InfoSection>

      <InfoSection title="How it works">
        <ol className="list-decimal pl-6 space-y-1.5">
          <li>Browse the store and add the products you like to your cart.</li>
          <li>At checkout, enter your Thyaga voucher to apply its value.</li>
          <li>Pay any remaining balance by credit/debit card, or choose cash on delivery.</li>
          <li>We deliver your order anywhere in Sri Lanka — delivery charges are shown at checkout.</li>
        </ol>
      </InfoSection>

      <InfoSection title="Our promise">
        <div className="flex gap-3 items-start">
          <HeartHandshake className="w-5 h-5 text-[#36135d] shrink-0 mt-0.5" />
          <p>
            Clear communication, helpful service and fast delivery on every order. Our range of products and categories keeps growing — and if
            you ever need a hand, our <Link href="/contact" className="text-[#36135d] font-semibold hover:underline">customer care team</Link> is
            here to help.
          </p>
        </div>
      </InfoSection>
    </InfoPage>
  );
}
