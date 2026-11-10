'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Truck,
  Home,
  Loader2,
  Copy,
  Check,
  Printer,
  CreditCard,
  Gift,
  ShoppingBag,
  Clock,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  ChevronRight,
  Package,
} from 'lucide-react';
import { api } from '@/services/api';
import { Order } from '@/types';
import { useCart } from '@/context/CartContext';
import OrderReceipt from '@/components/order/OrderReceipt';
import { getAssetUrl } from '@/utils/assets';

export default function OrderSuccessClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawOrder = (params?.orderNumber as string) || '';
  const { clearCart } = useCart();

  const [copied, setCopied] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Clear shopping cart on arrival at order success page
  useEffect(() => {
    try {
      clearCart();
    } catch (_) {}
  }, [clearCart]);

  // Robust order number resolution
  const orderNumber = useMemo(() => {
    // 1. From URL Query (?order=..., ?order_number=..., ?orderNumber=...)
    const queryOrder =
      searchParams?.get('order') ||
      searchParams?.get('order_number') ||
      searchParams?.get('orderNumber');
    if (queryOrder && queryOrder.trim() && queryOrder !== 'preview' && queryOrder !== '[orderNumber]') {
      return queryOrder.trim();
    }

    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const spOrder = sp.get('order') || sp.get('order_number') || sp.get('orderNumber');
      if (spOrder && spOrder.trim() && spOrder !== 'preview' && spOrder !== '[orderNumber]') {
        return spOrder.trim();
      }

      // 2. From URL pathname segment (e.g. /ThyagaMall/order-success/ORD-20261007-XXXX/)
      const parts = window.location.pathname.split('/').filter(Boolean);
      const osIdx = parts.findIndex((p) => p.toLowerCase() === 'order-success');
      if (osIdx !== -1 && parts[osIdx + 1]) {
        const seg = decodeURIComponent(parts[osIdx + 1]);
        if (seg && seg !== 'preview' && seg !== '[orderNumber]' && seg !== 'view') {
          return seg.trim();
        }
      }
      const last = decodeURIComponent(parts[parts.length - 1] || '');
      if (last && last.toLowerCase() !== 'order-success' && last !== 'preview' && last !== '[orderNumber]' && last !== 'view') {
        return last.trim();
      }

      // 3. From localStorage fallback
      try {
        const saved = localStorage.getItem('thyaga_last_order');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.order_number) return String(parsed.order_number).trim();
        }
      } catch (_) {}
    }

    // 4. From Next.js Route param
    if (rawOrder && rawOrder !== '[orderNumber]' && rawOrder !== 'preview' && rawOrder !== 'view') {
      return rawOrder.trim();
    }

    return '';
  }, [searchParams, rawOrder]);

  // Query parameter payment flags
  const isPaymentPaidQuery = useMemo(() => {
    const p = searchParams?.get('payment');
    if (p && (p.toLowerCase() === 'paid' || p.toLowerCase() === 'success')) return true;
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const spPay = sp.get('payment');
      if (spPay && (spPay.toLowerCase() === 'paid' || spPay.toLowerCase() === 'success')) return true;
    }
    return false;
  }, [searchParams]);

  useEffect(() => {
    if (orderNumber) {
      setIsLoading(true);
      api
        .getOrder(orderNumber)
        .then((res) => {
          if (res.success && res.data) {
            setOrder(res.data);
          }
        })
        .catch(() => {
          // If network error, still maintain orderNumber from URL
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [orderNumber]);

  const handleCopy = () => {
    if (!orderNumber) return;
    navigator.clipboard.writeText(orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (typeof window === 'undefined') return;
    // The document title becomes the suggested PDF file name
    const previousTitle = document.title;
    document.title = `Thyaga-Mall-Receipt-${orderNumber || 'order'}`;
    window.print();
    document.title = previousTitle;
  };

  const isPaid = isPaymentPaidQuery || order?.payment_status === 'paid';
  const paymentMethodUpper = (order?.payment_method || (isPaid ? 'webxpay' : 'cod')).toUpperCase();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#36135d]" />
        </div>
        <h2 className="text-base font-bold text-gray-800 mb-1">
          Verifying your transaction...
        </h2>
        <p className="text-xs text-gray-500 max-w-sm">
          Please wait while we retrieve your order details and generate your official receipt.
        </p>
      </div>
    );
  }

  return (
    <>
    {order && <OrderReceipt order={order} isPaid={isPaid} />}
    <div className="max-w-3xl mx-auto my-6 sm:my-10 px-4 space-y-6 print:hidden">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Link href="/" className="hover:text-[#36135d]">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/shop" className="hover:text-[#36135d]">Shop</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="font-semibold text-gray-800">Order Confirmation</span>
      </div>

      {/* Main Success Hero Card */}
      <div className="bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-10 text-center shadow-sm relative overflow-hidden">
        {/* Subtle decorative top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#36135d] via-[#a7144c] to-emerald-500" />

        {/* Celebratory Icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-4 ring-8 ring-emerald-50/50 shadow-inner">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-2">
          {isPaid ? 'Payment & Order Successful!' : 'Thank you for your order!'}
        </h1>

        <p className="text-xs sm:text-sm text-gray-600 max-w-lg mx-auto leading-relaxed mb-6">
          {isPaid ? (
            <>
              Your online payment was verified and processed securely. We are now preparing your order for dispatch. A confirmation receipt has been sent to{' '}
              <strong className="text-gray-900">{order?.customer_email || 'your email'}</strong>.
            </>
          ) : (
            <>
              Your order has been recorded and is currently being prepared for dispatch. A confirmation notification has been sent to{' '}
              <strong className="text-gray-900">{order?.customer_email || 'your email'}</strong>.
            </>
          )}
        </p>

        {/* Transaction / Payment Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-6 border shadow-xs bg-emerald-50 border-emerald-200 text-emerald-800">
          {paymentMethodUpper.includes('WEBXPAY') || paymentMethodUpper.includes('CARD') || isPaid ? (
            <>
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Payment Status: PAID & VERIFIED via WebXpay</span>
            </>
          ) : paymentMethodUpper.includes('VOUCHER') ? (
            <>
              <Gift className="w-4 h-4 text-purple-600" />
              <span>Payment Status: FULLY REDEEMED via Thyāga Voucher</span>
            </>
          ) : (
            <>
              <Package className="w-4 h-4 text-amber-600" />
              <span>Payment Method: Cash on Delivery (COD)</span>
            </>
          )}
        </div>

        {/* Order Reference Number Pill */}
        {orderNumber && (
          <div className="bg-gradient-to-br from-purple-50/80 to-purple-100/40 border border-purple-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-left max-w-lg mx-auto">
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                Official Order Tracking Number
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#36135d] tracking-wide font-mono">
                {orderNumber}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 hover:text-[#36135d] border border-gray-200/90 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer"
              title="Copy Order Number"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Order Details & Summary Box */}
      {order && (
        <div className="bg-white rounded-3xl border border-gray-200/90 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#36135d]" />
              <span>Order Summary</span>
            </h2>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{new Date(order.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </span>
          </div>

          {/* Items List */}
          {order.items && order.items.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Purchased Items ({order.items.length})
              </div>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                {order.items.map((item, idx) => (
                  <div key={item.id || idx} className="p-3.5 sm:p-4 flex items-center justify-between gap-4 bg-gray-50/40 hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-white border border-gray-200/80 flex items-center justify-center shrink-0 overflow-hidden p-1">
                        {item.product_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getAssetUrl(item.product_image)}
                            alt={item.product_name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                          {item.product_name}
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Qty: <span className="font-semibold text-gray-700">{item.quantity}</span> × Rs. {Number(item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-bold text-gray-900">
                        Rs. {Number(item.total_price || (item.unit_price * item.quantity)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recipient & Delivery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 space-y-2">
              <div className="font-bold text-gray-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#36135d]" />
                <span>Delivery Address</span>
              </div>
              <div className="font-semibold text-gray-900">{order.customer_name}</div>
              <div className="text-gray-600 leading-relaxed">
                {order.shipping_address}, {order.shipping_city}
                {order.shipping_postal_code ? ` - ${order.shipping_postal_code}` : ''}
              </div>
              <div className="text-[11px] text-gray-500 flex items-center gap-1 pt-1">
                <Phone className="w-3 h-3" />
                <span>{order.customer_phone}</span>
              </div>
            </div>

            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 space-y-2">
              <div className="font-bold text-gray-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Payment & Dispatch</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Method:</span>
                <span className="font-bold text-gray-900 uppercase">{order.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Status:</span>
                <span className={`font-bold uppercase ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isPaid ? 'PAID' : (order.payment_status || 'PENDING')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estimated Delivery:</span>
                <span className="font-semibold text-gray-800">1 - 3 Business Days</span>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="border-t border-gray-100 pt-4 text-xs space-y-2.5">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-gray-900">
                Rs. {Number(order.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span className="flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5" />
                  <span>
                    Voucher Discount
                    {order.voucher_code ? ` (${order.voucher_code})` : ''}:
                  </span>
                </span>
                <span>
                  -Rs. {Number(order.discount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>Shipping & Delivery Fee:</span>
              <span className="font-semibold text-gray-900">
                {Number(order.shipping_fee) === 0 ? (
                  <span className="text-emerald-600 font-bold">FREE</span>
                ) : (
                  `Rs. ${Number(order.shipping_fee).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                )}
              </span>
            </div>

            <div className="border-t border-gray-200 pt-3 flex justify-between items-baseline">
              <span className="text-sm font-bold text-gray-900">
                Total {isPaid ? 'Paid' : 'Payable'}:
              </span>
              <span className="text-xl font-black text-[#36135d]">
                Rs. {Number(order.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        {orderNumber && (
          <Link
            href={`/track-order?order_number=${orderNumber}`}
            className="inline-flex items-center justify-center gap-2 bg-[#36135d] hover:bg-[#a7144c] text-white px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-sm transition active:scale-95"
          >
            <Truck className="w-4 h-4" />
            <span>Track Delivery Status</span>
          </Link>
        )}

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200/90 px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-2xs transition active:scale-95 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-gray-600" />
          <span>Print / Save Receipt</span>
        </button>

        <Link
          href="/shop"
          className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition active:scale-95"
        >
          <Home className="w-4 h-4" />
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* Support / Contact Note */}
      <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-center text-xs text-gray-600 space-y-1">
        <p className="font-semibold text-gray-800">
          Have questions or need modifications to your order?
        </p>
        <p className="text-[11px] text-gray-500">
          Our customer service team is available via WhatsApp & Phone at{' '}
          <a href="tel:+94706850414" className="text-[#36135d] font-bold hover:underline">
            +94 70 685 0414
          </a>{' '}
          or via email at{' '}
          <a href="mailto:mall@thyaga.lk" className="text-[#36135d] font-bold hover:underline">
            mall@thyaga.lk
          </a>
          .
        </p>
      </div>
    </div>
    </>
  );
}
