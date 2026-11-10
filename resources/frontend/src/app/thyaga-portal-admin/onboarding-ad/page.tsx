'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Megaphone,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  Trash2,
  Save,
  LayoutPanelLeft,
  Image as ImageIcon,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { api } from '@/services/api';
import { OnboardingAd, OnboardingAdInput } from '@/types';
import { OnboardingAdCard } from '@/components/common/OnboardingAd';
import { getAssetUrl } from '@/utils/assets';

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp';

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-hidden focus:border-[#36135d]';
const labelClass = 'block text-[11px] font-bold text-gray-700 mb-1';

const ACCENT_PRESETS = ['#431968', '#e11d48', '#2563eb', '#0d9488', '#f59e0b', '#111827'];

const FREQUENCY_OPTIONS: { value: OnboardingAd['frequency']; label: string; hint: string }[] = [
  { value: 'once', label: 'Once per visitor', hint: 'Shown again only after you save changes' },
  { value: 'daily', label: 'Once a day', hint: 'At most once every 24 hours' },
  { value: 'session', label: 'Every visit', hint: 'Once each time the site is opened' },
];

function toInput(ad: OnboardingAd): OnboardingAdInput {
  return {
    enabled: ad.enabled,
    layout: ad.layout,
    badge: ad.badge ?? '',
    title: ad.title ?? '',
    body: ad.body ?? '',
    coupon_code: ad.coupon_code ?? '',
    cta_text: ad.cta_text ?? '',
    cta_link: ad.cta_link ?? '',
    dismiss_text: ad.dismiss_text ?? '',
    accent_color: ad.accent_color,
    delay_seconds: ad.delay_seconds,
    frequency: ad.frequency,
    pages: ad.pages,
  };
}

export default function AdminOnboardingAdPage() {
  const [form, setForm] = useState<OnboardingAdInput | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [savedEnabled, setSavedEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const token = () => localStorage.getItem('thyaga_admin_token') || '';

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  const apply = (ad: OnboardingAd) => {
    setForm(toInput(ad));
    setImageUrl(ad.image_url ?? null);
    setSavedEnabled(ad.enabled);
  };

  useEffect(() => {
    let cancelled = false;
    api.getAdminOnboardingAd(token())
      .then((res) => {
        if (!cancelled && res.success) apply(res.data);
      })
      .catch((err) => {
        if (!cancelled) notify('error', err instanceof Error ? err.message : 'Failed to load the onboarding ad');
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
            <Loader2 className="w-4 h-4 animate-spin" /> Loading onboarding ad...
          </>
        )}
      </div>
    );
  }

  const update = <K extends keyof OnboardingAdInput>(key: K, value: OnboardingAdInput[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const text = (key: keyof OnboardingAdInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    update(key, e.target.value as never);

  const save = async (overrides: Partial<OnboardingAdInput> = {}) => {
    const payload = { ...form, ...overrides };
    setIsSaving(true);
    try {
      const res = await api.updateAdminOnboardingAd(token(), {
        ...payload,
        badge: payload.badge?.trim() || null,
        title: payload.title?.trim() || null,
        body: payload.body?.trim() || null,
        coupon_code: payload.coupon_code?.trim() || null,
        cta_text: payload.cta_text?.trim() || null,
        cta_link: payload.cta_link?.trim() || null,
        dismiss_text: payload.dismiss_text?.trim() || null,
      });
      apply(res.data);
      notify('success', res.message);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not save the onboarding ad');
    } finally {
      setIsSaving(false);
    }
  };

  const upload = async (file: File | null) => {
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) {
      notify('error', 'Please choose a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      notify('error', 'Images must be 4 MB or smaller.');
      return;
    }
    setIsUploading(true);
    try {
      const res = await api.uploadAdminOnboardingAdImage(token(), file);
      setImageUrl(res.data.image_url ?? null);
      notify('success', res.message);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setIsUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const removeImage = async () => {
    if (!window.confirm('Remove the ad image?')) return;
    setIsUploading(true);
    try {
      const res = await api.removeAdminOnboardingAdImage(token());
      setImageUrl(null);
      notify('success', res.message);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not remove the image');
    } finally {
      setIsUploading(false);
    }
  };

  const previewAd = { ...form, image_url: imageUrl };

  return (
    <div className="space-y-6">
      {/* Header with publish switch */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-100 text-[#36135d] font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
              <Megaphone className="w-3 h-3" />
              <span>Storefront</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${savedEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
              {savedEnabled ? 'LIVE' : 'OFF'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">Onboarding Ad</h1>
          <p className="text-xs text-gray-500">A welcome pop-up shown to shoppers when they arrive — great for first-order offers and campaigns</p>
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
          {isSaving ? 'Saving...' : savedEnabled ? 'Ad is live' : 'Ad is off — turn on'}
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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6 items-start">
        {/* Settings form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-6"
        >
          {/* Layout */}
          <section className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
            <h2 className="text-sm font-black text-gray-900 mb-3">Layout</h2>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Ad layout">
              {[
                { value: 'split' as const, title: 'Image + Text', hint: 'Headline, offer code and button', icon: <LayoutPanelLeft className="w-5 h-5" /> },
                { value: 'image' as const, title: 'Image Only', hint: 'A designed banner, clickable', icon: <ImageIcon className="w-5 h-5" /> },
              ].map((option) => {
                const selected = form.layout === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => update('layout', option.value)}
                    className={`text-left p-3.5 rounded-xl border-2 transition flex items-start gap-3 cursor-pointer ${
                      selected ? 'border-[#36135d] bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${selected ? 'bg-[#36135d] text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {option.icon}
                    </span>
                    <span>
                      <span className="block text-xs font-bold text-gray-900">{option.title}</span>
                      <span className="block text-[11px] text-gray-500 mt-0.5">{option.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Image */}
          <section className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
            <h2 className="text-sm font-black text-gray-900">Image</h2>
            <p className="text-[11px] text-gray-500 mb-3">
              {form.layout === 'image'
                ? 'Required. Use a finished banner, about 1120 × 840 px.'
                : 'Optional. Shown beside the text — a portrait photo about 700 × 800 px works best.'}{' '}
              JPG, PNG or WebP, up to 4 MB.
            </p>
            <div className="flex items-center gap-4">
              <div className="w-28 h-20 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center text-gray-300">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getAssetUrl(imageUrl)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="bg-[#36135d] hover:bg-[#a7144c] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer">
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>{imageUrl ? 'Replace image' : 'Upload image'}</span>
                  <input ref={fileInput} type="file" accept={ACCEPT} className="sr-only" disabled={isUploading} onChange={(e) => upload(e.target.files?.[0] ?? null)} />
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={removeImage}
                    disabled={isUploading}
                    className="border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold px-3 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Content */}
          <section className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-black text-gray-900">{form.layout === 'image' ? 'Link & Text' : 'Content'}</h2>
            {form.layout === 'split' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Small label</label>
                    <input className={inputClass} value={form.badge ?? ''} maxLength={40} onChange={text('badge')} placeholder="e.g. Welcome to Thyaga Mall" />
                  </div>
                  <div>
                    <label className={labelClass}>Offer code (optional)</label>
                    <input className={`${inputClass} uppercase`} value={form.coupon_code ?? ''} maxLength={30} onChange={text('coupon_code')} placeholder="e.g. WELCOME1000" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Headline</label>
                  <input className={inputClass} value={form.title ?? ''} maxLength={80} onChange={text('title')} placeholder="e.g. Get Rs. 1,000 OFF your first order" />
                </div>
                <div>
                  <label className={labelClass}>Message</label>
                  <textarea className={`${inputClass} resize-none`} rows={3} value={form.body ?? ''} maxLength={300} onChange={text('body')} />
                </div>
              </>
            )}
            {form.layout === 'image' && (
              <div>
                <label className={labelClass}>Image description (screen readers)</label>
                <input className={inputClass} value={form.title ?? ''} maxLength={80} onChange={text('title')} placeholder="e.g. Avurudu sale — up to 50% off" />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {form.layout === 'split' && (
                <div>
                  <label className={labelClass}>Button text</label>
                  <input className={inputClass} value={form.cta_text ?? ''} maxLength={30} onChange={text('cta_text')} placeholder="e.g. Start Shopping" />
                </div>
              )}
              <div className={form.layout === 'image' ? 'sm:col-span-2' : ''}>
                <label className={labelClass}>{form.layout === 'image' ? 'Link when the image is clicked' : 'Button link'}</label>
                <input className={inputClass} value={form.cta_link ?? ''} maxLength={255} onChange={text('cta_link')} placeholder="/shop or https://..." />
              </div>
              {form.layout === 'split' && (
                <div>
                  <label className={labelClass}>Dismiss text</label>
                  <input className={inputClass} value={form.dismiss_text ?? ''} maxLength={30} onChange={text('dismiss_text')} placeholder="e.g. Maybe later" />
                </div>
              )}
            </div>
            {form.layout === 'split' && (
              <div>
                <label className={labelClass}>Accent colour</label>
                <div className="flex items-center gap-2">
                  {ACCENT_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => update('accent_color', color)}
                      className={`w-7 h-7 rounded-full border-2 transition cursor-pointer ${form.accent_color.toLowerCase() === color ? 'border-gray-900 scale-110' : 'border-white shadow'}`}
                      style={{ background: color }}
                      aria-label={`Use colour ${color}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.accent_color}
                    onChange={(e) => update('accent_color', e.target.value)}
                    className="w-9 h-7 rounded cursor-pointer border border-gray-200"
                    aria-label="Custom accent colour"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Display rules */}
          <section className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-black text-gray-900">When to show it</h2>
            <div>
              <label className={labelClass}>How often</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {FREQUENCY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition ${form.frequency === option.value ? 'border-[#36135d] bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <input
                      type="radio"
                      name="frequency"
                      className="sr-only"
                      checked={form.frequency === option.value}
                      onChange={() => update('frequency', option.value)}
                    />
                    <span className="block text-xs font-bold text-gray-900">{option.label}</span>
                    <span className="block text-[10px] text-gray-500 mt-0.5">{option.hint}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Show on</label>
                <select className={inputClass} value={form.pages} onChange={(e) => update('pages', e.target.value as OnboardingAd['pages'])}>
                  <option value="all">Any storefront page</option>
                  <option value="home">Homepage only</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Delay before showing: {form.delay_seconds}s</label>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={form.delay_seconds}
                  onChange={(e) => update('delay_seconds', Number(e.target.value))}
                  className="w-full accent-[#36135d] mt-2"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-400">Never shown during checkout, on the order confirmation page, or on login and register pages.</p>
          </section>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-[#36135d] hover:bg-[#a7144c] text-white text-xs font-bold px-5 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{savedEnabled ? 'Save & Publish' : 'Save'}</span>
            </button>
            <span className="text-[11px] text-gray-500">Saving shows the ad again to visitors who already closed it.</span>
          </div>
        </form>

        {/* Live preview */}
        <div className="xl:sticky xl:top-6 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-gray-900">Live Preview</h2>
            <div className="flex rounded-lg border border-gray-200 p-0.5">
              {[
                { value: 'desktop' as const, icon: <Monitor className="w-3.5 h-3.5" />, label: 'Desktop' },
                { value: 'mobile' as const, icon: <Smartphone className="w-3.5 h-3.5" />, label: 'Mobile' },
              ].map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setPreviewDevice(d.value)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer ${previewDevice === d.value ? 'bg-[#36135d] text-white' : 'text-gray-500'}`}
                >
                  {d.icon} {d.label}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-gray-800/80 p-4 sm:p-6 flex items-center justify-center min-h-[420px]">
            <div className={previewDevice === 'mobile' ? 'w-[340px] max-w-full' : 'w-full'}>
              {form.layout === 'image' && !imageUrl ? (
                <div className="bg-white/10 border-2 border-dashed border-white/30 rounded-2xl py-16 text-center text-xs text-white/70">
                  Upload an image to preview the image-only ad
                </div>
              ) : (
                <div className="@container flex justify-center">
                  <OnboardingAdCard ad={previewAd} onClose={() => {}} preview />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
