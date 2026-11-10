'use client';

import React, { useEffect, useState } from 'react';
import { Store, MapPin, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/services/api';
import { StorePickup } from '@/types';

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-hidden focus:border-[#36135d]';
const labelClass = 'block text-[11px] font-bold text-gray-700 mb-1';

type TextField = 'name' | 'address' | 'city' | 'phone' | 'opening_hours' | 'instructions';

export default function AdminStorePickupPage() {
  const [form, setForm] = useState<StorePickup | null>(null);
  const [savedEnabled, setSavedEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const token = () => localStorage.getItem('thyaga_admin_token') || '';

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  const apply = (pickup: StorePickup) => {
    setForm(pickup);
    setSavedEnabled(pickup.enabled);
  };

  useEffect(() => {
    let cancelled = false;
    api.getAdminStorePickup(token())
      .then((res) => {
        if (!cancelled && res.success) apply(res.data);
      })
      .catch((err) => {
        if (!cancelled) notify('error', err instanceof Error ? err.message : 'Failed to load store pickup settings');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!form) {
    return (
      <div className="py-24 flex items-center justify-center text-gray-400 text-xs gap-2">
        {feedback?.type === 'error' ? (
          <span className="text-red-600">{feedback.message}</span>
        ) : (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Loading store pickup...
          </>
        )}
      </div>
    );
  }

  const text = (key: TextField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => (prev ? { ...prev, [key]: e.target.value } : prev));

  const save = async (overrides: Partial<StorePickup> = {}) => {
    const payload = { ...form, ...overrides };
    setIsSaving(true);
    try {
      const res = await api.updateAdminStorePickup(token(), {
        ...payload,
        name: payload.name.trim(),
        address: payload.address.trim(),
        city: payload.city.trim(),
        phone: payload.phone?.trim() || null,
        opening_hours: payload.opening_hours?.trim() || null,
        instructions: payload.instructions?.trim() || null,
      });
      apply(res.data);
      notify('success', res.message);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not save store pickup settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with on/off switch */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-100 text-[#36135d] font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
              <Store className="w-3 h-3" />
              <span>Checkout</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${savedEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
              {savedEnabled ? 'OFFERED' : 'OFF'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">Store Pickup</h1>
          <p className="text-xs text-gray-500">Let shoppers collect their order from your store for free instead of paying for delivery</p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={savedEnabled}
          disabled={isSaving}
          onClick={() => save({ enabled: !savedEnabled })}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-xs font-bold transition cursor-pointer disabled:cursor-wait ${
            savedEnabled ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-300 bg-white text-gray-700'
          }`}
        >
          <span className={`relative w-10 h-6 rounded-full transition ${savedEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${savedEnabled ? 'left-5' : 'left-1'}`} />
          </span>
          {isSaving ? 'Saving...' : savedEnabled ? 'Offered at checkout' : 'Off — turn on'}
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
            feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] gap-6 items-start">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-6"
        >
          <section className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-black text-gray-900">Pickup location</h2>
            <div>
              <label className={labelClass} htmlFor="pickup-name">Store name *</label>
              <input id="pickup-name" className={inputClass} required maxLength={100} value={form.name} onChange={text('name')} placeholder="e.g. Thyaga Mall Store" />
            </div>
            <div>
              <label className={labelClass} htmlFor="pickup-address">Street address *</label>
              <input id="pickup-address" className={inputClass} required maxLength={255} value={form.address} onChange={text('address')} placeholder="e.g. 2A, Suleiman Terrace" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="pickup-city">City *</label>
                <input id="pickup-city" className={inputClass} required maxLength={100} value={form.city} onChange={text('city')} placeholder="e.g. Colombo 05" />
              </div>
              <div>
                <label className={labelClass} htmlFor="pickup-phone">Store phone</label>
                <input id="pickup-phone" type="tel" className={inputClass} maxLength={50} value={form.phone ?? ''} onChange={text('phone')} placeholder="e.g. 011 234 5678" />
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="pickup-hours">Opening hours</label>
              <input id="pickup-hours" className={inputClass} maxLength={150} value={form.opening_hours ?? ''} onChange={text('opening_hours')} placeholder="e.g. Mon – Sat, 9:00 AM – 6:00 PM" />
            </div>
            <div>
              <label className={labelClass} htmlFor="pickup-instructions">Note to customers</label>
              <textarea id="pickup-instructions" rows={3} className={inputClass} maxLength={300} value={form.instructions ?? ''} onChange={text('instructions')} placeholder="e.g. We'll call you when your order is ready. Please bring your order number." />
            </div>
            <p className="text-[10px] text-gray-400">Changes apply to new orders. Orders already placed keep the address they were placed with.</p>
          </section>

          <button
            type="submit"
            disabled={isSaving}
            className="bg-[#36135d] hover:bg-[#a7144c] text-white text-xs font-bold px-5 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save</span>
          </button>
        </form>

        {/* What shoppers see at checkout */}
        <div className="xl:sticky xl:top-6 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-black text-gray-900">Checkout preview</h2>
          {form.enabled ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5 min-w-0 break-words">
                <strong className="block font-bold">{form.name || 'Store name'}</strong>
                <span className="block">{form.address || 'Street address'}, {form.city || 'City'}</span>
                {form.opening_hours && <span className="block text-[11px] text-emerald-800">Open: {form.opening_hours}</span>}
                {form.phone && <span className="block text-[11px] text-emerald-800">Store phone: {form.phone}</span>}
                {form.instructions && <span className="block text-[11px] text-emerald-800 pt-0.5">{form.instructions}</span>}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Store pickup is off, so checkout only offers home delivery.</p>
          )}
        </div>
      </div>
    </div>
  );
}
