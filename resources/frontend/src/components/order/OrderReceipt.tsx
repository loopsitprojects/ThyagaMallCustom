import React from 'react';
import { Order } from '@/types';
import { getAssetUrl } from '@/utils/assets';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  card: 'Online Payment (Card / Mobile Wallet)',
  webxpay: 'Online Payment (Card / Mobile Wallet)',
  voucher: 'Thyāga Voucher',
  voucher_cod: 'Thyāga Voucher + Cash on Delivery',
};

const money = (amount: number | string) =>
  `Rs. ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Print-only receipt (hidden on screen). "Print / Save Receipt" on the
 * order-success page prints this instead of the page itself.
 */
export default function OrderReceipt({ order, isPaid }: { order: Order; isPaid: boolean }) {
  const placedAt = new Date(order.created_at).toLocaleString('en-GB', {
    timeZone: 'Asia/Colombo',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="hidden print:block text-gray-900 text-[11pt] leading-snug">
      {/* Our own margins, and no browser header/footer (date, URL) */}
      <style>{'@page { size: A4; margin: 0; } html, body { background: #fff !important; }'}</style>

      <div className="px-[16mm] py-[14mm] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
        {/* Letterhead */}
        <div className="flex items-start justify-between pb-5 border-b-2 border-[#36135d]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getAssetUrl('/logo.png')} alt="Thyaga Mall" className="w-[38mm] h-auto" />
          <div className="text-right">
            <p className="text-[20pt] font-black tracking-tight text-[#36135d] leading-none">RECEIPT</p>
            <p className="mt-2 text-[9pt] text-gray-600">Order confirmation</p>
          </div>
        </div>

        {/* Order meta */}
        <div className="grid grid-cols-3 gap-4 py-5 text-[9.5pt]">
          <div>
            <p className="text-[8pt] font-bold uppercase tracking-wider text-gray-500">Order number</p>
            <p className="mt-1 font-mono font-bold text-[10.5pt]">{order.order_number}</p>
          </div>
          <div>
            <p className="text-[8pt] font-bold uppercase tracking-wider text-gray-500">Order date</p>
            <p className="mt-1 font-semibold">{placedAt}</p>
          </div>
          <div className="text-right">
            <p className="text-[8pt] font-bold uppercase tracking-wider text-gray-500">Payment</p>
            <p className="mt-1 font-semibold">{PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method}</p>
            <p className={`mt-0.5 font-bold ${isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>{isPaid ? 'PAID' : 'PAYMENT PENDING'}</p>
          </div>
        </div>

        {/* Addresses */}
        <div className="grid grid-cols-2 gap-6 pb-6 text-[9.5pt]">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-[8pt] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Deliver to</p>
            <p className="font-bold">{order.customer_name}</p>
            <p className="text-gray-700 whitespace-pre-line">{order.shipping_address}</p>
            <p className="text-gray-700">
              {order.shipping_city}
              {order.shipping_postal_code ? ` ${order.shipping_postal_code}` : ''}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-[8pt] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Contact</p>
            <p className="text-gray-700">{order.customer_phone}</p>
            <p className="text-gray-700 break-all">{order.customer_email}</p>
          </div>
        </div>

        {/* Items */}
        <table className="w-full text-[9.5pt] border-collapse">
          <thead>
            <tr className="bg-[#36135d] text-white">
              <th className="text-left font-bold py-2 px-3 rounded-l-md">Item</th>
              <th className="text-right font-bold py-2 px-3 w-[22mm]">Qty</th>
              <th className="text-right font-bold py-2 px-3 w-[30mm]">Unit price</th>
              <th className="text-right font-bold py-2 px-3 w-[32mm] rounded-r-md">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((item, idx) => (
              <tr key={item.id ?? idx} className="border-b border-gray-200 break-inside-avoid">
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-3">
                    {item.product_image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.product_image} alt="" className="w-[12mm] h-[12mm] object-contain rounded border border-gray-200 bg-white shrink-0" />
                    )}
                    <span className="font-semibold">{item.product_name}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right">{item.quantity}</td>
                <td className="py-2.5 px-3 text-right">{money(item.unit_price)}</td>
                <td className="py-2.5 px-3 text-right font-semibold">{money(item.total_price || item.unit_price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end pt-4 break-inside-avoid">
          <table className="w-[75mm] text-[9.5pt]">
            <tbody>
              <tr>
                <td className="py-1 text-gray-600">Subtotal</td>
                <td className="py-1 text-right">{money(order.subtotal)}</td>
              </tr>
              {Number(order.discount) > 0 && (
                <tr>
                  <td className="py-1 text-gray-600">Voucher discount{order.voucher_code ? ` (${order.voucher_code})` : ''}</td>
                  <td className="py-1 text-right text-emerald-700">− {money(order.discount)}</td>
                </tr>
              )}
              <tr>
                <td className="py-1 text-gray-600">Delivery</td>
                <td className="py-1 text-right">{Number(order.shipping_fee) === 0 ? 'Free' : money(order.shipping_fee)}</td>
              </tr>
              <tr className="border-t-2 border-gray-900">
                <td className="pt-2 font-black text-[11pt]">{isPaid ? 'Total paid' : 'Total payable'}</td>
                <td className="pt-2 text-right font-black text-[12pt] text-[#36135d]">{money(order.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-gray-200 text-center text-[8.5pt] text-gray-500 break-inside-avoid">
          <p className="font-semibold text-gray-700">Thank you for shopping with Thyaga Mall!</p>
          <p className="mt-1">Questions about your order? WhatsApp / call +94 70 685 0414 or email mall@thyaga.lk — please quote your order number.</p>
        </div>
      </div>
    </div>
  );
}
