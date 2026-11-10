'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  GalleryHorizontalEnd,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Palette,
} from 'lucide-react';
import { api } from '@/services/api';
import { HeroSlide, HeroSlideInput } from '@/types';
import HeroStage, { DEFAULT_HERO_SLIDES } from '@/components/home/HeroStage';
import HeroCarouselManager from './HeroCarouselManager';

const EMPTY_SLIDE: HeroSlideInput = {
  title_line1: '',
  title_line2: '',
  subtext: '',
  show_badge: true,
  badge_top: 'UP TO',
  badge_value: '50%',
  badge_bottom: 'OFF',
  cta_text: 'Shop Now',
  cta_link: '/shop',
  box_color: '#7c3aed',
  accent_color: '#f472b6',
  gradient_from: '#1a0033',
  gradient_via: '#2e0a5c',
  gradient_to: '#5b1a8f',
  is_active: true,
};

const COLOR_FIELDS: { key: keyof HeroSlideInput; label: string; hint: string }[] = [
  { key: 'box_color', label: '3D Gift Box', hint: 'Main colour of the 3D box' },
  { key: 'accent_color', label: 'Accent Glow', hint: 'Orbs & lighting tint' },
  { key: 'gradient_from', label: 'Background Start', hint: 'Top-left' },
  { key: 'gradient_via', label: 'Background Middle', hint: 'Centre' },
  { key: 'gradient_to', label: 'Background End', hint: 'Bottom-right' },
];

// One-click colour themes taken from the original slide designs.
const THEME_PRESETS = DEFAULT_HERO_SLIDES.map((s, i) => ({
  name: ['Royal Purple', 'Midnight Blue', 'Rose Wine', 'Emerald', 'Sunset'][i],
  colors: {
    box_color: s.box_color,
    accent_color: s.accent_color,
    gradient_from: s.gradient_from,
    gradient_via: s.gradient_via,
    gradient_to: s.gradient_to,
  },
}));

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-hidden focus:border-[#36135d]';

function toInput(slide: HeroSlide): HeroSlideInput {
  return {
    title_line1: slide.title_line1,
    title_line2: slide.title_line2 ?? '',
    subtext: slide.subtext ?? '',
    show_badge: slide.show_badge,
    badge_top: slide.badge_top ?? '',
    badge_value: slide.badge_value ?? '',
    badge_bottom: slide.badge_bottom ?? '',
    cta_text: slide.cta_text,
    cta_link: slide.cta_link,
    box_color: slide.box_color,
    accent_color: slide.accent_color,
    gradient_from: slide.gradient_from,
    gradient_via: slide.gradient_via,
    gradient_to: slide.gradient_to,
    is_active: slide.is_active,
  };
}

export default function AdminHeroSlidesPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Editor state: null = closed, 0 = creating a new slide, >0 = editing that slide id
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<HeroSlideInput>(EMPTY_SLIDE);
  const [isSaving, setIsSaving] = useState(false);
  const [deleting, setDeleting] = useState<HeroSlide | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const token = () => localStorage.getItem('thyaga_admin_token') || '';

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadSlides = useCallback(async () => {
    if (!token()) return;
    try {
      const res = await api.getAdminHeroSlides(token());
      if (res.success) setSlides(res.data);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to load hero slides');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.getAdminHeroSlides(token())
      .then((res) => {
        if (!cancelled && res.success) setSlides(res.data);
      })
      .catch((err) => {
        if (!cancelled) notify('error', err instanceof Error ? err.message : 'Failed to load hero slides');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreate = () => {
    setForm(EMPTY_SLIDE);
    setEditingId(0);
  };

  const openEdit = (slide: HeroSlide) => {
    setForm(toInput(slide));
    setEditingId(slide.id);
  };

  const update = <K extends keyof HeroSlideInput>(key: K, value: HeroSlideInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId === null) return;
    setIsSaving(true);
    try {
      const res = editingId === 0
        ? await api.createAdminHeroSlide(token(), form)
        : await api.updateAdminHeroSlide(token(), editingId, form);
      notify('success', res.message);
      setEditingId(null);
      await loadSlides();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not save the slide');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (slide: HeroSlide) => {
    setBusyId(slide.id);
    try {
      await api.updateAdminHeroSlide(token(), slide.id, { is_active: !slide.is_active });
      setSlides((prev) => prev.map((s) => (s.id === slide.id ? { ...s, is_active: !s.is_active } : s)));
      notify('success', slide.is_active ? 'Slide hidden from the homepage' : 'Slide is now live on the homepage');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not update the slide');
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const reordered = [...slides];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setSlides(reordered);
    try {
      await api.reorderAdminHeroSlides(token(), reordered.map((s) => s.id));
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not save the new order');
      loadSlides();
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      const res = await api.deleteAdminHeroSlide(token(), deleting.id);
      notify('success', res.message);
      setSlides((prev) => prev.filter((s) => s.id !== deleting.id));
      setDeleting(null);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not delete the slide');
    } finally {
      setBusyId(null);
    }
  };

  const activeSlides = slides.filter((s) => s.is_active);
  const previewSlide: HeroSlide = { ...form, id: editingId || 0, sort_order: 0 };

  return (
    <div className="space-y-6">
      {/* Page Title & Main Header */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-100 text-[#36135d] font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
              <GalleryHorizontalEnd className="w-3 h-3" />
              <span>Homepage</span>
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {activeSlides.length} Live {activeSlides.length === 1 ? 'Slide' : 'Slides'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">Hero Slides</h1>
          <p className="text-xs text-gray-500">
            Edit the headline, offer badge, button and colours of the animated 3D banner at the top of the homepage
          </p>
        </div>

        <button
          onClick={openCreate}
          className="bg-[#36135d] hover:bg-[#a7144c] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Slide</span>
        </button>
      </div>

      {/* 3D banner vs. image carousel switch, and the carousel's images */}
      <HeroCarouselManager />

      <div className="pt-2">
        <h2 className="text-base font-black text-gray-900">3D Banner Slides</h2>
        <p className="text-xs text-gray-500">Used when the hero style is set to 3D Animated Banner</p>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Live homepage preview (hidden while the editor has its own preview open) */}
      {editingId === null && activeSlides.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-gray-900">Homepage Preview</h2>
            <span className="text-[11px] text-gray-500">Shows live slides in their current order</span>
          </div>
          <div className="max-w-3xl mx-auto">
            <HeroStage key={activeSlides.map((s) => s.id).join('-')} slides={activeSlides} asHeading={false} className="h-[260px] sm:h-[340px]" />
          </div>
        </div>
      )}

      {/* Slides list */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-black text-gray-900">All Slides</h2>
          <p className="text-[11px] text-gray-500">Use the arrows to change the order slides appear in</p>
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center text-gray-400 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading slides...
          </div>
        ) : slides.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">
            No slides yet — the homepage is showing the built-in default slides.
            <button onClick={openCreate} className="block mx-auto mt-3 text-[#36135d] font-bold hover:underline cursor-pointer">
              Create your first slide
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {slides.map((slide, index) => (
              <li key={slide.id} className={`p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${slide.is_active ? '' : 'bg-gray-50/70'}`}>
                {/* Mini colour thumbnail */}
                <div
                  className="w-full sm:w-40 h-20 rounded-xl shrink-0 relative overflow-hidden flex flex-col justify-center px-3 text-white"
                  style={{ background: `linear-gradient(to bottom right, ${slide.gradient_from}, ${slide.gradient_via}, ${slide.gradient_to})` }}
                >
                  <span className="text-[11px] font-black leading-tight truncate">{slide.title_line1}</span>
                  <span className="text-[10px] font-bold opacity-80 truncate">{slide.title_line2}</span>
                  <span className="absolute right-2 bottom-2 w-5 h-5 rounded-md border-2 border-white/70" style={{ background: slide.box_color }} />
                  {!slide.is_active && <span className="absolute inset-0 bg-white/50" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-gray-900 truncate">
                      {slide.title_line1} {slide.title_line2}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${slide.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                      {slide.is_active ? 'LIVE' : 'HIDDEN'}
                    </span>
                    {slide.show_badge && slide.badge_value && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
                        {[slide.badge_top, slide.badge_value, slide.badge_bottom].filter(Boolean).join(' ')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{slide.subtext}</p>
                  <p className="text-[11px] text-gray-400 mt-1 truncate">
                    Button: <span className="font-semibold text-gray-600">{slide.cta_text}</span> → <code>{slide.cta_link}</code>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => move(index, -1)} disabled={index === 0} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-[#36135d] hover:bg-purple-50 disabled:opacity-30 cursor-pointer" title="Move up" aria-label="Move up">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => move(index, 1)} disabled={index === slides.length - 1} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-[#36135d] hover:bg-purple-50 disabled:opacity-30 cursor-pointer" title="Move down" aria-label="Move down">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleActive(slide)} disabled={busyId === slide.id} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-[#36135d] hover:bg-purple-50 disabled:opacity-50 cursor-pointer" title={slide.is_active ? 'Hide from homepage' : 'Show on homepage'} aria-label={slide.is_active ? 'Hide from homepage' : 'Show on homepage'}>
                    {slide.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => openEdit(slide)} className="px-3 py-2 rounded-lg bg-[#36135d] hover:bg-[#a7144c] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => setDeleting(slide)} className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer" title="Delete" aria-label="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Editor modal with live preview */}
      {editingId !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-black text-gray-900">{editingId === 0 ? 'Add Hero Slide' : 'Edit Hero Slide'}</h2>
              <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-5 gap-5 p-5">
              {/* Live preview */}
              <div className="lg:col-span-3 lg:order-2 space-y-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Live Preview</span>
                <div className="lg:sticky lg:top-4">
                  <HeroStage slides={[previewSlide]} autoPlay={false} asHeading={false} className="h-[260px] sm:h-[340px]" />
                  <p className="text-[11px] text-gray-400 mt-2">Updates as you type. Move your mouse over the preview to see the 3D effect.</p>
                </div>
              </div>

              {/* Form */}
              <div className="lg:col-span-2 lg:order-1 space-y-4 text-xs">
                <fieldset className="space-y-3">
                  <legend className="text-[11px] font-black text-[#36135d] uppercase tracking-wider mb-1">Text</legend>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Headline line 1 *</label>
                    <input required maxLength={60} value={form.title_line1} onChange={(e) => update('title_line1', e.target.value)} placeholder="Big Savings" className={inputClass} />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Headline line 2 <span className="font-normal text-gray-400">(highlighted)</span></label>
                    <input maxLength={60} value={form.title_line2 ?? ''} onChange={(e) => update('title_line2', e.target.value)} placeholder="Brighter Living" className={inputClass} />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Subtext</label>
                    <input maxLength={160} value={form.subtext ?? ''} onChange={(e) => update('subtext', e.target.value)} placeholder="Electronics, Home, Fashion & more" className={inputClass} />
                  </div>
                </fieldset>

                <fieldset className="space-y-3">
                  <legend className="text-[11px] font-black text-[#36135d] uppercase tracking-wider mb-1">Button</legend>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Button text *</label>
                      <input required maxLength={30} value={form.cta_text} onChange={(e) => update('cta_text', e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Link *</label>
                      <input required maxLength={255} value={form.cta_link} onChange={(e) => update('cta_link', e.target.value)} placeholder="/shop?category=fashion" pattern="^(/(?!/)\S*|https://\S+)$" title="A site path starting with / or a full https:// link" className={inputClass} />
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400">Use a site path like <code>/shop?category=home</code> or a full <code>https://</code> link.</p>
                </fieldset>

                <fieldset className="space-y-3">
                  <legend className="text-[11px] font-black text-[#36135d] uppercase tracking-wider mb-1 flex items-center gap-2">
                    Offer Badge
                  </legend>
                  <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.show_badge} onChange={(e) => update('show_badge', e.target.checked)} className="accent-[#36135d]" />
                    Show the spinning offer badge
                  </label>
                  {form.show_badge && (
                    <div className="grid grid-cols-3 gap-2">
                      <input maxLength={12} value={form.badge_top ?? ''} onChange={(e) => update('badge_top', e.target.value)} placeholder="UP TO" className={inputClass} aria-label="Badge top text" />
                      <input maxLength={8} value={form.badge_value ?? ''} onChange={(e) => update('badge_value', e.target.value)} placeholder="60%" className={inputClass} aria-label="Badge value" />
                      <input maxLength={12} value={form.badge_bottom ?? ''} onChange={(e) => update('badge_bottom', e.target.value)} placeholder="OFF" className={inputClass} aria-label="Badge bottom text" />
                    </div>
                  )}
                </fieldset>

                <fieldset className="space-y-3">
                  <legend className="text-[11px] font-black text-[#36135d] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" /> Colours
                  </legend>
                  <div className="flex flex-wrap gap-1.5">
                    {THEME_PRESETS.map((preset) => (
                      <button
                        type="button"
                        key={preset.name}
                        onClick={() => setForm((prev) => ({ ...prev, ...preset.colors }))}
                        className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border border-gray-200 hover:border-[#36135d] text-[11px] font-semibold text-gray-700 cursor-pointer"
                      >
                        <span className="w-4 h-4 rounded-full" style={{ background: `linear-gradient(135deg, ${preset.colors.gradient_from}, ${preset.colors.box_color})` }} />
                        {preset.name}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {COLOR_FIELDS.map(({ key, label, hint }) => (
                      <div key={key} className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-200">
                        <input
                          type="color"
                          value={form[key] as string}
                          onChange={(e) => update(key, e.target.value as never)}
                          className="w-9 h-9 rounded-md cursor-pointer border-0 bg-transparent p-0 shrink-0"
                          aria-label={label}
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-gray-700 leading-tight">{label}</div>
                          <div className="text-[10px] text-gray-400 truncate">{hint} · <code>{form[key] as string}</code></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </fieldset>

                <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => update('is_active', e.target.checked)} className="accent-[#36135d]" />
                  Show this slide on the homepage
                </label>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSaving} className="px-4 py-2 rounded-lg bg-[#36135d] hover:bg-[#a7144c] text-white font-bold flex items-center gap-2 disabled:opacity-60 cursor-pointer">
                    {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {editingId === 0 ? 'Create Slide' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleting && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">Delete this slide?</h3>
              <p className="text-xs text-gray-500 mt-1">
                &ldquo;{deleting.title_line1} {deleting.title_line2}&rdquo; will be removed from the homepage. This can&apos;t be undone — use the eye button to hide it instead.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setDeleting(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 cursor-pointer">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={busyId === deleting.id} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-60 cursor-pointer">
                {busyId === deleting.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete Slide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
