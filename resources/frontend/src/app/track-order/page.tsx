'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/services/api';
import { CourierTracking, Order } from '@/types';
import { formatLkDate, formatLkDateTime } from '@/utils/datetime';
import {
  Search,
  Package,
  PackageCheck,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  MapPin,
  Copy,
} from 'lucide-react';

type LookupResult =
  | { kind: 'order'; order: Order }
  | { kind: 'courier'; tracking: CourierTracking };

type StatusTone = 'delivered' | 'problem' | 'moving';

/** Thyaga order numbers start with "THY-"; anything else is treated as a courier tracking number. */
function isOrderNumber(value: string): boolean {
  return /^THY-/i.test(value.trim());
}

// Prompt Xpress status texts, e.g. "Consignment Received", "In Transit",
// "Taken Out for Delivery", "Item was Delivered by Courier".
function statusTone(status: string): StatusTone {
  const s = status.toLowerCase();
  if (/(return|fail|undeliver|not deliver|reject|cancel|hold|damag|lost|refus)/.test(s)) return 'problem';
  if (/\bdelivered\b|completed|handed over/.test(s)) return 'delivered';
  return 'moving';
}

const COURIER_STEPS = ['Received', 'In transit', 'Out for delivery', 'Delivered'];

function courierStep(tracking: CourierTracking): number {
  const latest = tracking.events[0];
  if (latest && statusTone(latest.status) === 'delivered') return 3;
  const all = tracking.events.map((e) => e.status.toLowerCase()).join(' | ');
  if (/out for deliver/.test(all)) return 2;
  if (/transit|sort|hub|transfer|arrived/.test(all)) return 1;
  return 0;
}

const TONE_STYLES: Record<StatusTone, { box: string; dot: string; icon: React.ElementType }> = {
  delivered: { box: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: PackageCheck },
  problem: { box: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', icon: AlertCircle },
  moving: { box: 'bg-purple-50 text-[#36135d] border-purple-200', dot: 'bg-[#a7144c]', icon: Truck },
};

function CourierTrackingView({ tracking }: { tracking: CourierTracking }) {
  const [copied, setCopied] = useState(false);
  const latest = tracking.events[0];
  const tone = statusTone(latest.status);
  const style = TONE_STYLES[tone];
  const step = courierStep(tracking);
  const LatestIcon = style.icon;

  const copyLink = async () => {
    try {
      const url = new URL(window.location.href);
      url.search = `?tracking=${encodeURIComponent(tracking.tracking_number)}`;
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context)
    }
  };

  return (
    <div className="border-t border-gray-100 pt-6 space-y-6">
      {/* Current status */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${style.box}`}>
            <LatestIcon className="w-5 h-5" />
          </span>
          <div>
            <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider block">Current status</span>
            <span className="text-lg font-black text-gray-900 leading-tight block">{latest.status}</span>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
              {latest.branch_name && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {latest.branch_name}
                </span>
              )}
              {latest.status_date && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatLkDateTime(latest.status_date)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex sm:flex-col items-center sm:items-end gap-2">
          <span className="font-mono text-sm font-bold text-gray-900">{tracking.tracking_number}</span>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-[#36135d] transition cursor-pointer"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Link copied' : 'Copy tracking link'}
          </button>
        </div>
      </div>

      {/* Journey progress (hidden when the parcel has a problem status) */}
      {tone !== 'problem' && (
        <ol className="grid grid-cols-4 gap-1.5" aria-label="Delivery progress">
          {COURIER_STEPS.map((label, index) => {
            const done = index <= step;
            return (
              <li key={label} className="space-y-2">
                <div className={`h-1.5 rounded-full ${done ? (step === 3 ? 'bg-emerald-500' : 'bg-[#a7144c]') : 'bg-gray-200'}`} />
                <span className={`block text-[10px] sm:text-xs font-semibold leading-tight ${done ? 'text-gray-900' : 'text-gray-400'}`}>
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {/* History timeline */}
      <div className="bg-gray-50 rounded-xl p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">Delivery history</h2>
          <span className="text-[11px] text-gray-400">Sri Lanka time</span>
        </div>
        <ol>
          {tracking.events.map((event, index) => {
            const isLatest = index === 0;
            return (
              <li key={`${event.status_date}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
                {index < tracking.events.length - 1 && (
                  <span className="absolute left-[6px] top-5 bottom-0 w-px bg-gray-200" aria-hidden="true" />
                )}
                <span
                  className={`relative mt-1 w-[13px] h-[13px] rounded-full shrink-0 ring-4 ${
                    isLatest ? `${TONE_STYLES[statusTone(event.status)].dot} ring-purple-100` : 'bg-gray-300 ring-gray-50'
                  }`}
                />
                <div className="min-w-0">
                  <span className={`block text-sm ${isLatest ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                    {event.status}
                  </span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
                    {event.branch_name && <span>{event.branch_name}</span>}
                    {event.status_date && <span>{formatLkDateTime(event.status_date)}</span>}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="text-[11px] text-gray-400 text-center">Delivery updates provided by our courier partner {tracking.courier}.</p>
    </div>
  );
}

function OrderStatusView({ order }: { order: Order }) {
  return (
    <div className="border-t border-gray-100 pt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-purple-50 p-4 rounded-xl border border-purple-100">
        <div>
          <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider block">
            Status:
          </span>
          <span className="text-base font-black text-[#36135d] capitalize">
            {order.order_status}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider block">
            Placed On:
          </span>
          <span className="text-xs font-bold text-gray-800">
            {formatLkDate(order.created_at)}
          </span>
        </div>
      </div>

      {/* Step Progress Visualizer */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className={`p-2 rounded-lg ${['pending', 'processing', 'shipped', 'delivered'].includes(order.order_status) ? 'bg-purple-100 text-[#36135d] font-bold' : 'text-gray-400'}`}>
          <Clock className="w-4 h-4 mx-auto mb-1" />
          <span>Pending</span>
        </div>
        <div className={`p-2 rounded-lg ${['processing', 'shipped', 'delivered'].includes(order.order_status) ? 'bg-purple-100 text-[#36135d] font-bold' : 'text-gray-400'}`}>
          <Package className="w-4 h-4 mx-auto mb-1" />
          <span>Processing</span>
        </div>
        <div className={`p-2 rounded-lg ${['shipped', 'delivered'].includes(order.order_status) ? 'bg-purple-100 text-[#36135d] font-bold' : 'text-gray-400'}`}>
          <Truck className="w-4 h-4 mx-auto mb-1" />
          <span>Shipped</span>
        </div>
        <div className={`p-2 rounded-lg ${order.order_status === 'delivered' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-gray-400'}`}>
          <CheckCircle2 className="w-4 h-4 mx-auto mb-1" />
          <span>Delivered</span>
        </div>
      </div>

      {/* Recipient info & items */}
      <div className="bg-gray-50 p-4 rounded-xl text-xs space-y-2 text-gray-600">
        <div><strong>Recipient:</strong> {order.customer_name} ({order.customer_phone})</div>
        <div>
          <strong>{order.delivery_method === 'pickup' ? 'Store Pickup:' : 'Delivery Address:'}</strong>{' '}
          {order.shipping_address}, {order.shipping_city}
        </div>
        <div><strong>Payment Method:</strong> {order.payment_method.toUpperCase()} ({order.payment_status})</div>
        <div className="pt-2 border-t border-gray-200 font-bold text-gray-900 text-sm">
          Total: Rs. {Number(order.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  // ?order_number=THY-... (existing links) or ?tracking=RP... (courier tracking links)
  const initialQuery = searchParams.get('order_number') || searchParams.get('tracking') || '';

  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    if (isOrderNumber(value)) {
      try {
        const res = await api.getOrder(value);
        if (res.success && res.data) {
          setResult({ kind: 'order', order: res.data });
        }
      } catch {
        setError('We could not find an order with this order number. Please verify the code.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const res = await api.trackConsignment(value.replace(/\s+/g, '').toUpperCase());
      if (res.success && res.data) {
        setResult({ kind: 'courier', tracking: res.data });
      }
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'We could not find a delivery with this tracking number.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      lookup(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    lookup(query);
  };

  return (
    <div className="max-w-3xl mx-auto my-10 space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200/80 p-8 shadow-xs">
        <h1 className="text-2xl font-black text-gray-900 mb-6">Track Your Order</h1>

        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            type="text"
            required
            placeholder="Order number or courier tracking number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            maxLength={40}
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:outline-hidden focus:border-[#36135d] uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-[#36135d] hover:bg-[#a7144c] text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Track</span>
          </button>
        </form>

        {error && (
          <div role="alert" className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result?.kind === 'order' && <OrderStatusView order={result.order} />}
        {result?.kind === 'courier' && <CourierTrackingView tracking={result.tracking} />}
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Loading tracker...</div>}>
      <TrackOrderContent />
    </Suspense>
  );
}
