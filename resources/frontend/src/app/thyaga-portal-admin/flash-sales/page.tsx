'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Zap,
  Clock,
  Plus,
  Trash2,
  Check,
  Flame,
  AlertCircle,
  Loader2,
  Power,
  Calendar,
  Edit3,
  X,
  Sparkles,
} from 'lucide-react';
import { api } from '@/services/api';
import { FlashSale, Product } from '@/types';
import { getAssetUrl } from '@/utils/assets';

export default function AdminFlashSalesPage() {
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Add Item to Flash Sale Form State
  const [selectedProduct, setSelectedProduct] = useState('');
  const [flashPrice, setFlashPrice] = useState('');
  const [quantityLimit, setQuantityLimit] = useState('20');
  const [isAdding, setIsAdding] = useState(false);

  // Schedule & Timing Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const fetchFlashSales = async () => {
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) return;

    try {
      const res = await api.getAdminFlashSales(token);
      if (res.success) {
        setFlashSales(res.data);
      }
    } catch {
      // error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlashSales();
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (token) {
      api.getAdminProducts(token, { per_page: 50 }).then((res) => {
        if (res.success) setAllProducts(res.data);
      });
    }
  }, []);

  const activeSale = flashSales[0];

  // Helper to format date string into YYYY-MM-DDTHH:mm for datetime-local input
  const toDateTimeLocal = (dateStr?: string | Date) => {
    if (!dateStr) return '';
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${mins}`;
  };

  const openScheduleModal = () => {
    if (!activeSale) return;
    setEditTitle(activeSale.title);
    setEditStartTime(toDateTimeLocal(activeSale.start_time));
    setEditEndTime(toDateTimeLocal(activeSale.end_time));
    setScheduleError(null);
    setIsScheduleModalOpen(true);
  };

  const applyPreset = (durationHours: number) => {
    const now = new Date();
    const end = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
    setEditStartTime(toDateTimeLocal(now));
    setEditEndTime(toDateTimeLocal(end));
    setScheduleError(null);
  };

  const extendEndTime = (hoursToAdd: number) => {
    const currentEnd = editEndTime ? new Date(editEndTime) : new Date();
    const base = isNaN(currentEnd.getTime()) || currentEnd.getTime() < Date.now() ? new Date() : currentEnd;
    const newEnd = new Date(base.getTime() + hoursToAdd * 60 * 60 * 1000);
    if (!editStartTime) {
      setEditStartTime(toDateTimeLocal(new Date()));
    }
    setEditEndTime(toDateTimeLocal(newEnd));
    setScheduleError(null);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSale) return;
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) return;

    if (!editStartTime || !editEndTime) {
      setScheduleError('Please provide both Start and End timestamps.');
      return;
    }

    const startDate = new Date(editStartTime);
    const endDate = new Date(editEndTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setScheduleError('Please enter valid dates and times.');
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setScheduleError('End timestamp must be later than the start timestamp.');
      return;
    }

    setIsSavingSchedule(true);
    setScheduleError(null);

    try {
      const res = await api.updateAdminFlashSale(token, activeSale.id, {
        title: editTitle.trim() || activeSale.title,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
      });

      if (res.success) {
        setFeedback('Flash sale schedule and timing updated successfully!');
        setIsScheduleModalOpen(false);
        fetchFlashSales();
        setTimeout(() => setFeedback(null), 3500);
      }
    } catch (err: unknown) {
      setScheduleError(err instanceof Error ? err.message : 'Failed to update schedule');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleToggleActive = async () => {
    if (!activeSale) return;
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) return;

    try {
      await api.updateAdminFlashSale(token, activeSale.id, {
        is_active: !activeSale.is_active,
      });
      setFeedback(`Flash Sale is now ${!activeSale.is_active ? 'ACTIVE' : 'INACTIVE'}`);
      fetchFlashSales();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update campaign state');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSale || !selectedProduct || !flashPrice) return;
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) return;

    setIsAdding(true);
    try {
      await api.addAdminFlashSaleItem(token, activeSale.id, {
        product_id: parseInt(selectedProduct, 10),
        flash_price: parseFloat(flashPrice),
        quantity_limit: parseInt(quantityLimit, 10),
      });

      setFeedback('Product added to flash sale!');
      setSelectedProduct('');
      setFlashPrice('');
      fetchFlashSales();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error adding flash item');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!activeSale) return;
    if (!confirm('Remove this product from the flash sale?')) return;
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) return;

    try {
      await api.removeAdminFlashSaleItem(token, activeSale.id, itemId);
      setFeedback('Item removed from flash sale.');
      fetchFlashSales();
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      alert('Failed to remove item');
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#dc2626] mb-2" />
        <span className="text-xs font-semibold">Loading flash sale events...</span>
      </div>
    );
  }

  // Calculate timing status
  const nowMs = Date.now();
  const startMs = activeSale ? new Date(activeSale.start_time).getTime() : 0;
  const endMs = activeSale ? new Date(activeSale.end_time).getTime() : 0;

  const isExpired = activeSale && endMs > 0 && nowMs > endMs;
  const isUpcoming = activeSale && startMs > 0 && nowMs < startMs;
  const isCurrentlyLive = activeSale && activeSale.is_active && !isExpired && !isUpcoming;

  const formatRemaining = () => {
    if (!activeSale) return '';
    if (isExpired) return 'Expired';
    if (isUpcoming) {
      const diffSecs = Math.max(0, Math.floor((startMs - nowMs) / 1000));
      const hours = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      return `Starts in ${hours}h ${mins}m`;
    }
    const diffSecs = Math.max(0, Math.floor((endMs - nowMs) / 1000));
    const hours = Math.floor(diffSecs / 3600);
    const mins = Math.floor((diffSecs % 3600) / 60);
    return `${hours}h ${mins}m left`;
  };

  return (
    <div className="space-y-6">
      {/* Title & Campaign Header */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="bg-red-100 text-red-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
              <Flame className="w-3 h-3 fill-current" />
              <span>Flash Sales Control</span>
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                activeSale?.is_active
                  ? isExpired
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {activeSale?.is_active
                ? isExpired
                  ? '● EXPIRED ON STORE'
                  : '● LIVE ON STORE'
                : '○ PAUSED'}
            </span>
            {isCurrentlyLive && (
              <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {formatRemaining()}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">
            {activeSale?.title || '⚡ Flash Deals Campaign'}
          </h1>
          <p className="text-xs text-gray-500">
            Manage real-time countdown deals, allocated flash stock, and custom discount rates
          </p>
        </div>

        {activeSale && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={openScheduleModal}
              className="px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-xs border border-gray-300 bg-white hover:bg-gray-50 text-gray-800"
            >
              <Calendar className="w-4 h-4 text-[#36135d]" />
              <span>Set Times & Schedule</span>
            </button>

            <button
              onClick={handleToggleActive}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-xs ${
                activeSale.is_active
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{activeSale.is_active ? 'Pause Campaign' : 'Publish Flash Sale'}</span>
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Paused Campaign Alert */}
      {activeSale && !activeSale.is_active && (
        <div className="p-4 bg-gray-50 border border-gray-200 text-gray-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <Power className="w-5 h-5 text-gray-500 shrink-0" />
            <div>
              <span className="font-bold text-gray-900">Campaign is PAUSED (Turned Off)</span>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Flash sale sections on the home page, navbar badges, and promotional deals are completely hidden from all shoppers across the entire site.
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleActive}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer transition shrink-0 flex items-center gap-1.5 shadow-xs"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Turn On (Publish)</span>
          </button>
        </div>
      )}

      {/* Expired Campaign Warning Alert */}
      {activeSale?.is_active && isExpired && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-amber-950">Flash Sale schedule has ended (expired)</span>
              <p className="text-[11px] text-amber-800">
                Target end time passed on {new Date(activeSale.end_time).toLocaleString()}. Customers cannot see the live countdown on the storefront until you set new times.
              </p>
            </div>
          </div>
          <button
            onClick={openScheduleModal}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl cursor-pointer transition shrink-0 flex items-center gap-1.5 shadow-xs"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Reactivate Times</span>
          </button>
        </div>
      )}

      {/* Campaign Details & Schedule Cards */}
      {activeSale && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Start Timestamp Card */}
          <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Start Timestamp
                </span>
                <button
                  onClick={openScheduleModal}
                  className="text-[10px] font-bold text-[#36135d] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>
              <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mt-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>{new Date(activeSale.start_time).toLocaleString()}</span>
              </div>
            </div>
            {isUpcoming && (
              <span className="mt-2 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block w-fit">
                ⏳ Scheduled (Starts in future)
              </span>
            )}
          </div>

          {/* End Timestamp Card */}
          <div className={`p-4 rounded-xl border shadow-xs flex flex-col justify-between ${
            isExpired ? 'bg-red-50/50 border-red-200' : 'bg-white border-gray-200/80'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  End Timestamp (Countdown Target)
                </span>
                <button
                  onClick={openScheduleModal}
                  className="text-[10px] font-bold text-[#36135d] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Change Time</span>
                </button>
              </div>
              <div className={`text-xs font-bold flex items-center gap-1.5 mt-1 ${
                isExpired ? 'text-red-600' : 'text-emerald-700'
              }`}>
                <Clock className={`w-3.5 h-3.5 ${isExpired ? 'text-red-500' : 'text-emerald-600'}`} />
                <span>{new Date(activeSale.end_time).toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              {isExpired ? (
                <span className="text-[10px] font-extrabold text-red-700 bg-red-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                  ⚠️ EXPIRED
                </span>
              ) : (
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                  🟢 {formatRemaining()}
                </span>
              )}
            </div>
          </div>

          {/* Active Deals Card */}
          <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Active Flash Products
            </span>
            <div className="text-base font-black text-[#36135d]">
              {activeSale.items?.length || 0} Deals Scheduled
            </div>
            <span className="text-[10px] text-gray-400 mt-1">
              Scroll down to manage product allocations
            </span>
          </div>
        </div>
      )}

      {/* Add New Item Form */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-[#36135d]" />
          <span>Add Product to Active Flash Sale</span>
        </h3>

        <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="sm:col-span-2">
            <label className="block font-semibold text-gray-700 mb-1">Select Product *</label>
            <select
              required
              value={selectedProduct}
              onChange={(e) => {
                setSelectedProduct(e.target.value);
                const p = allProducts.find((item) => item.id.toString() === e.target.value);
                if (p) {
                  // Pre-fill a 30% discount suggestion
                  const reg = Number(p.regular_price);
                  setFlashPrice(Math.round(reg * 0.7).toString());
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d]"
            >
              <option value="">Choose item from catalog...</option>
              {allProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Reg: Rs. {Number(p.regular_price).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Flash Deal Price (Rs.) *</label>
            <input
              type="number"
              required
              placeholder="e.g. 1500"
              value={flashPrice}
              onChange={(e) => setFlashPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d]"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Quantity Limit *</label>
            <div className="flex gap-2">
              <input
                type="number"
                required
                value={quantityLimit}
                onChange={(e) => setQuantityLimit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d]"
              />
              <button
                type="submit"
                disabled={isAdding || !selectedProduct}
                className="bg-[#dc2626] hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isAdding ? 'Adding...' : 'Add Deal'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Items List Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Flash Sale Products List</h3>
          <span className="text-xs text-gray-500">{activeSale?.items?.length || 0} items</span>
        </div>

        <div className="overflow-x-auto">
          {!activeSale || !activeSale.items || activeSale.items.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400">
              No items currently assigned to this flash sale.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-b border-gray-100">
                <tr>
                  <th className="p-3 w-16">Item</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Regular Price</th>
                  <th className="p-3">Flash Price</th>
                  <th className="p-3">Discount</th>
                  <th className="p-3">Allocation & Claim</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeSale.items.map((item) => {
                  const product = item.product;
                  if (!product) return null;

                  const regPrice = Number(product.regular_price);
                  const flPrice = Number(item.flash_price);
                  const discount = item.discount_percentage || Math.round(((regPrice - flPrice) / regPrice) * 100);

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-3">
                        <div className="relative w-10 h-10 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                          <Image
                            src={getAssetUrl(product.primary_image || 'https://placehold.co/100x100?text=Flash')}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-gray-900 max-w-xs">
                        <div className="line-clamp-1">{product.name}</div>
                        <span className="text-[10px] text-gray-400 font-normal">SKU: {product.sku}</span>
                      </td>
                      <td className="p-3 text-gray-500 line-through">
                        Rs. {regPrice.toLocaleString()}
                      </td>
                      <td className="p-3 font-bold text-red-600">
                        Rs. {flPrice.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="bg-red-100 text-red-700 font-black px-2 py-0.5 rounded text-[10px]">
                          -{discount}%
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-[11px] font-semibold text-gray-700">
                          {item.quantity_sold} sold / {item.quantity_limit} limit
                        </div>
                        <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className="bg-red-600 h-1.5 rounded-full"
                            style={{ width: `${item.percentage_sold || 50}%` }}
                          />
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                          title="Remove item from flash sale"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Schedule & Timing Edit Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-2xl p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#36135d] uppercase tracking-wider mb-1">
                  <Calendar className="w-4 h-4" />
                  <span>Flash Sale Scheduling</span>
                </div>
                <h3 className="text-lg font-black text-gray-900">
                  Set Campaign Start & End Times
                </h3>
                <p className="text-xs text-gray-500">
                  Configure real-time countdown targets and availability for deals on the storefront.
                </p>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick 1-Click Duration Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Quick Duration Presets</span>
              </label>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => applyPreset(24)}
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition cursor-pointer"
                >
                  ⚡ Next 24 Hours
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(48)}
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition cursor-pointer"
                >
                  ⚡ Next 48 Hours
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(72)}
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition cursor-pointer"
                >
                  ⚡ Next 3 Days
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(168)}
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition cursor-pointer"
                >
                  ⚡ Next 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => extendEndTime(24)}
                  className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#36135d] font-bold rounded-lg transition cursor-pointer"
                >
                  ➕ Extend End by 24h
                </button>
              </div>
            </div>

            {/* Schedule Form */}
            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. ⚡ Mega 24H Flash Deals"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Start Timestamp *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d] font-mono text-xs"
                  />
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    When deals go live
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    End Timestamp (Target) *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d] font-mono text-xs"
                  />
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    Countdown deadline
                  </span>
                </div>
              </div>

              {/* Dynamic Duration Preview */}
              {editStartTime && editEndTime && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-700 flex items-center justify-between">
                  <span className="font-semibold">Calculated Duration:</span>
                  <span className="font-bold text-[#36135d]">
                    {(() => {
                      const s = new Date(editStartTime).getTime();
                      const e = new Date(editEndTime).getTime();
                      if (e <= s) return 'Invalid: End before Start';
                      const diffMins = Math.round((e - s) / 60000);
                      const days = Math.floor(diffMins / 1440);
                      const hours = Math.floor((diffMins % 1440) / 60);
                      const mins = diffMins % 60;
                      return `${days > 0 ? `${days}d ` : ''}${hours}h ${mins}m`;
                    })()}
                  </span>
                </div>
              )}

              {scheduleError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{scheduleError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 font-semibold rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="px-5 py-2 bg-[#36135d] hover:bg-[#280c46] text-white font-bold rounded-lg transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingSchedule && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSavingSchedule ? 'Saving...' : 'Save Schedule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
