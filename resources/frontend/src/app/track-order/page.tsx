'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/services/api';
import { Order } from '@/types';
import { Search, Package, Truck, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialOrder = searchParams.get('order_number') || '';

  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async (num: string) => {
    if (!num.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getOrder(num.trim());
      if (res.success && res.data) {
        setOrder(res.data);
      }
    } catch {
      setError('We could not find an order with this tracking number. Please verify the code.');
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrder) {
      fetchOrder(initialOrder);
    }
  }, [initialOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(orderNumber);
  };

  return (
    <div className="max-w-3xl mx-auto my-10 space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200/80 p-8 shadow-xs">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Track Your Order</h1>
        <p className="text-xs text-gray-500 mb-6">
          Enter your Thyaga Mall order tracking number (e.g. <code>THY-20260923-ABCD</code>) to check current delivery status.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            type="text"
            required
            placeholder="Enter Order Number (e.g. THY-...)"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:outline-hidden focus:border-[#36135d] uppercase tracking-wider"
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
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Order Status Display */}
        {order && (
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
                  {new Date(order.created_at).toLocaleDateString()}
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
        )}
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
