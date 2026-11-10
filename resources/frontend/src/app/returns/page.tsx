import React from 'react';
import type { Metadata } from 'next';
import { RotateCcw } from 'lucide-react';
import InfoPage, { InfoSection, SupportContactCard } from '@/components/common/InfoPage';

export const metadata: Metadata = {
  title: 'Returns & Refunds | Thyaga Mall',
  description: 'How to request a return, replacement or refund for a Thyaga Mall order.',
};

export default function ReturnsPage() {
  return (
    <InfoPage
      title="Returns & Refunds"
      badge="Customer Care"
      badgeIcon={RotateCcw}
      intro="We want you to be happy with every order. This policy explains when an order can be returned, replaced or refunded, and how to request it. By using Thyaga Mall you agree to this policy."
    >
      <InfoSection number={1} title="When you can request a refund or replacement">
        <ul className="list-disc pl-6 space-y-1.5">
          <li>You received the wrong item.</li>
          <li>The product arrived damaged or defective.</li>
          <li>Your order was not delivered.</li>
          <li>The product is significantly different from its description on the website.</li>
        </ul>
      </InfoSection>

      <hr className="border-gray-100" />

      <InfoSection number={2} title="Items that can't be returned">
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Perishable goods, and food or consumables that have been opened.</li>
          <li>Gift cards and vouchers.</li>
          <li>Clearance or promotional items, unless they are defective.</li>
          <li>Items damaged through misuse after delivery.</li>
        </ul>
      </InfoSection>

      <hr className="border-gray-100" />

      <InfoSection number={3} title="Reporting deadlines">
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong className="text-gray-800">Damaged, incorrect or defective items:</strong> report within <strong className="text-gray-800">48 hours</strong> of delivery.
          </li>
          <li>
            <strong className="text-gray-800">Orders not delivered:</strong> report within <strong className="text-gray-800">7 days</strong>.
          </li>
        </ul>
        <p>Requests made after these deadlines may not be accepted.</p>
      </InfoSection>

      <hr className="border-gray-100" />

      <InfoSection number={4} title="How refunds work">
        <ol className="list-decimal pl-6 space-y-1.5">
          <li>Contact us with your order number and a short description of the problem.</li>
          <li>We may ask for photos or other evidence of the issue.</li>
          <li>Our team reviews the request together with the merchant who supplied the product.</li>
          <li>
            Approved refunds are issued as voucher credit, store credit, or back to your original payment method where applicable.
          </li>
        </ol>
        <p>Instead of a refund we may offer a replacement; how soon it ships depends on stock and the merchant.</p>
      </InfoSection>

      <hr className="border-gray-100" />

      <InfoSection number={5} title="Cancelling an order">
        <p>
          Orders can be cancelled only before they are processed or dispatched. Once an order has been fulfilled or handed to the courier, a
          cancellation may no longer be possible.
        </p>
      </InfoSection>

      <hr className="border-gray-100" />

      <InfoSection number={6} title="Delivery delays">
        <p>
          We are not responsible for delays caused by couriers, weather, merchants or other events beyond our reasonable control, but we will
          always help you resolve a delivery problem.
        </p>
      </InfoSection>

      <hr className="border-gray-100" />

      <InfoSection number={7} title="Fraud prevention and changes to this policy">
        <p>We may decline requests that involve fraud, abuse of this policy or suspicious transactions.</p>
        <p>This policy may be updated from time to time; the latest version is always published on this page.</p>
      </InfoSection>

      <hr className="border-gray-100" />

      <InfoSection number={8} title="Need help with a return?">
        <SupportContactCard />
      </InfoSection>
    </InfoPage>
  );
}
