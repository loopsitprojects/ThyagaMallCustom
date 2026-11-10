import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Truck } from 'lucide-react';
import InfoPage, { InfoSection, SupportContactCard } from '@/components/common/InfoPage';
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE } from '@/utils/shipping';

export const metadata: Metadata = {
  title: 'Shipping Information | Thyaga Mall',
  description: 'Delivery areas, charges and timelines for Thyaga Mall orders across Sri Lanka.',
};

const rupees = (amount: number) => `Rs. ${amount.toLocaleString('en-US')}`;

export default function ShippingPage() {
  return (
    <InfoPage
      title="Shipping Information"
      badge="Customer Care"
      badgeIcon={Truck}
      intro="Everything you need to know about how and when your Thyaga Mall order reaches you."
    >
      <InfoSection number={1} title="Where we deliver">
        <p>We deliver island-wide, to all 25 districts of Sri Lanka.</p>
      </InfoSection>

      <hr className="border-gray-100" />

      <InfoSection number={2} title="Delivery charges">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Free delivery</p>
            <p className="mt-1 text-gray-800">On orders of {rupees(FREE_SHIPPING_THRESHOLD)} or more</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Standard delivery</p>
            <p className="mt-1 text-gray-800">{rupees(STANDARD_SHIPPING_FEE)} on orders below {rupees(FREE_SHIPPING_THRESHOLD)}</p>
          </div>
        </div>
        <p>The exact delivery charge for your order is always shown at checkout before you pay.</p>
      </InfoSection>

      <hr className="border-gray-100" />

      <InfoSection number={3} title="How long delivery takes">
        <p>
          Most orders are delivered within <strong className="text-gray-800">1–3 business days</strong> after they are confirmed. Products are
          dispatched by our merchant partners, so delivery times can vary by item and location, and may be longer during sale periods and
          public holidays.
        </p>
      </InfoSection>

      <hr className="border-gray-100" />

      <InfoSection number={4} title="Tracking your order">
        <p>
          After placing an order you&apos;ll receive a confirmation email with your order number. Use it on the{' '}
          <Link href="/track-order" className="text-[#36135d] font-semibold hover:underline">Track Your Order</Link> page to check its status at any
          time.
        </p>
      </InfoSection>

      <hr className="border-gray-100" />

      <InfoSection number={5} title="Problems with a delivery">
        <p>
          If your order hasn&apos;t arrived within 7 days, or arrives damaged, please contact us — see our{' '}
          <Link href="/returns" className="text-[#36135d] font-semibold hover:underline">Returns &amp; Refunds</Link> policy for details.
        </p>
        <SupportContactCard />
      </InfoSection>
    </InfoPage>
  );
}
