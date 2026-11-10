import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Headphones, Phone, Mail, MapPin, MessageCircle, Clock } from 'lucide-react';
import InfoPage, { InfoSection } from '@/components/common/InfoPage';

export const metadata: Metadata = {
  title: 'Contact Us | Thyaga Mall',
  description: 'Get help with your Thyaga Mall order, products or voucher redemption.',
};

const CHANNELS = [
  {
    icon: Phone,
    label: 'Call us',
    value: '+94 70 685 0414',
    href: 'tel:+94706850414',
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: '+94 70 685 0414',
    href: 'https://wa.me/94706850414',
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'mall@thyaga.lk',
    href: 'mailto:mall@thyaga.lk',
  },
];

export default function ContactPage() {
  return (
    <InfoPage
      title="Contact Us"
      badge="Help Center"
      badgeIcon={Headphones}
      intro="Questions about an order, a product or redeeming your Thyaga voucher? Our customer care team is happy to help."
    >
      <div className="grid sm:grid-cols-3 gap-3">
        {CHANNELS.map(({ icon: Icon, label, value, href }) => (
          <a
            key={label}
            href={href}
            {...(href.startsWith('https://') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="group rounded-xl border border-gray-200/80 bg-gray-50/60 p-4 hover:border-[#36135d] hover:bg-purple-50/50 transition"
          >
            <Icon className="w-5 h-5 text-[#a7144c]" />
            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-gray-500">{label}</p>
            <p className="mt-0.5 font-bold text-gray-900 group-hover:text-[#36135d] break-all">{value}</p>
          </a>
        ))}
      </div>

      <div className="flex items-start gap-2 text-xs text-gray-600">
        <Clock className="w-4 h-4 text-[#36135d] shrink-0 mt-0.5" />
        <p>We aim to reply to emails within 24–48 hours. Please include your order number so we can help you faster.</p>
      </div>

      <InfoSection title="Office">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-[#a7144c] shrink-0 mt-1" />
          <p>
            2A, Suleiman Terrace, Colombo 05, Sri Lanka
            <br />
            <span className="text-xs text-gray-500">For correspondence and administrative purposes only — this is not a store.</span>
          </p>
        </div>
      </InfoSection>

      <InfoSection title="Quick help">
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            Where is my order? — <Link href="/track-order" className="text-[#36135d] font-semibold hover:underline">Track your order</Link>
          </li>
          <li>
            Delivery charges and times — <Link href="/shipping" className="text-[#36135d] font-semibold hover:underline">Shipping information</Link>
          </li>
          <li>
            Something wrong with an item? — <Link href="/returns" className="text-[#36135d] font-semibold hover:underline">Returns &amp; refunds</Link>
          </li>
          <li>
            Vouchers, payments and more — <Link href="/faq" className="text-[#36135d] font-semibold hover:underline">FAQs</Link>
          </li>
        </ul>
      </InfoSection>
    </InfoPage>
  );
}
