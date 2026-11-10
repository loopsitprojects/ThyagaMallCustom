'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Images,
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pencil,
} from 'lucide-react';
import { api } from '@/services/api';
import { HeroBannerImage, HeroMode } from '@/types';
import { getAssetUrl } from '@/utils/assets';
import HeroImageCarousel from '@/components/home/HeroImageCarousel';

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp';

type ImageDetails = { alt_text: string; title: string; subtitle: string; cta_text: string; link: string };

const EMPTY_DETAILS: ImageDetails = { alt_text: '', title: '', subtitle: '', cta_text: 'Shop Now', link: '' };

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-hidden focus:border-[#36135d]';

/**
 * Admin → Hero Slides: choose whether the homepage hero shows the animated 3D
 * banner or an image carousel, and manage the carousel's images.
 */
export default function HeroCarouselManager() {
  const [mode, setMode] = useState<HeroMode>('3d');
  const [images, setImages] = useState<HeroBannerImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Upload form
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [details, setDetails] = useState<ImageDetails>(EMPTY_DETAILS);
  const [isUploading, setIsUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Inline edit of an existing image's details
  const [editing, setEditing] = useState<({ id: number } & ImageDetails) | null>(null);

  const token = () => localStorage.getItem('thyaga_admin_token') || '';

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  useEffect(() => {
    let cancelled = false;
    api.getAdminHeroBanner(token())
      .then((res) => {
        if (cancelled || !res.success) return;
        setMode(res.data.mode);
        setImages(res.data.images);
      })
      .catch((err) => {
        if (!cancelled) notify('error', err instanceof Error ? err.message : 'Failed to load the hero banner settings');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Release the local preview URL when it changes or the component unmounts.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const activeImages = images.filter((img) => img.is_active);

  const switchMode = async (next: HeroMode) => {
    if (next === mode) return;
    if (next === 'images' && activeImages.length === 0) {
      notify('error', 'Upload at least one live image before switching to the image carousel.');
      return;
    }
    setIsSwitching(true);
    try {
      const res = await api.updateAdminHeroMode(token(), next);
      setMode(res.data.mode);
      notify('success', res.message);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not change the hero mode');
    } finally {
      setIsSwitching(false);
    }
  };

  const pickFile = (picked: File | null) => {
    if (!picked) return;
    if (!ACCEPT.split(',').includes(picked.type)) {
      notify('error', 'Please choose a JPG, PNG or WebP image.');
      return;
    }
    if (picked.size > MAX_BYTES) {
      notify('error', 'Images must be 4 MB or smaller.');
      return;
    }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const resetUpload = () => {
    setFile(null);
    setPreview(null);
    setDetails(EMPTY_DETAILS);
    if (fileInput.current) fileInput.current.value = '';
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await api.uploadAdminHeroImage(token(), file, trimDetails(details));
      setImages((prev) => [...prev, res.data]);
      notify('success', res.message);
      resetUpload();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleActive = async (image: HeroBannerImage) => {
    if (image.is_active && mode === 'images' && activeImages.length === 1) {
      notify('error', 'This is the only live image. Switch the homepage to the 3D banner first, or add another image.');
      return;
    }
    setBusyId(image.id);
    try {
      await api.updateAdminHeroImage(token(), image.id, { is_active: !image.is_active });
      setImages((prev) => prev.map((img) => (img.id === image.id ? { ...img, is_active: !img.is_active } : img)));
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not update the image');
    } finally {
      setBusyId(null);
    }
  };

  const saveDetails = async () => {
    if (!editing) return;
    setBusyId(editing.id);
    try {
      const { id, ...fields } = editing;
      const trimmed = trimDetails(fields);
      const res = await api.updateAdminHeroImage(token(), id, {
        alt_text: trimmed.alt_text || null,
        title: trimmed.title || null,
        subtitle: trimmed.subtitle || null,
        cta_text: trimmed.cta_text || null,
        link: trimmed.link || null,
      });
      setImages((prev) => prev.map((img) => (img.id === editing.id ? res.data : img)));
      setEditing(null);
      notify('success', res.message);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not update the image');
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const reordered = [...images];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setImages(reordered);
    try {
      await api.reorderAdminHeroImages(token(), reordered.map((img) => img.id));
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not save the new order');
    }
  };

  const remove = async (image: HeroBannerImage) => {
    if (image.is_active && mode === 'images' && activeImages.length === 1) {
      notify('error', 'This is the only live image. Switch the homepage to the 3D banner first, or add another image.');
      return;
    }
    if (!window.confirm('Delete this image from the carousel? This cannot be undone.')) return;
    setBusyId(image.id);
    try {
      const res = await api.deleteAdminHeroImage(token(), image.id);
      setImages((prev) => prev.filter((img) => img.id !== image.id));
      notify('success', res.message);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not delete the image');
    } finally {
      setBusyId(null);
    }
  };

  const modeOptions: { value: HeroMode; title: string; description: string; icon: React.ReactNode }[] = [
    { value: '3d', title: '3D Animated Banner', description: 'Gift-box scene with the headline slides below', icon: <Box className="w-5 h-5" /> },
    { value: 'images', title: 'Image Carousel', description: 'Rotating banners from the images you upload', icon: <Images className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Mode switch */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-black text-gray-900">Homepage Hero Style</h2>
            <p className="text-[11px] text-gray-500">Choose what visitors see in the large banner at the top of the homepage</p>
          </div>
          {(isLoading || isSwitching) && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Homepage hero style">
          {modeOptions.map((option) => {
            const selected = mode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={isLoading || isSwitching}
                onClick={() => switchMode(option.value)}
                className={`text-left p-4 rounded-xl border-2 transition flex items-start gap-3 cursor-pointer disabled:cursor-wait ${
                  selected ? 'border-[#36135d] bg-purple-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${selected ? 'bg-[#36135d] text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {option.icon}
                </span>
                <span className="flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{option.title}</span>
                    {selected && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">LIVE</span>
                    )}
                  </span>
                  <span className="block text-[11px] text-gray-500 mt-0.5">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        {feedback && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
              feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Carousel images */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-gray-900">Carousel Images</h2>
            <p className="text-[11px] text-gray-500">
              Shown when the hero style is <strong>Image Carousel</strong>. Best size: 1200 × 750 px (JPG, PNG or WebP, up to 4 MB).
            </p>
          </div>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
            {activeImages.length} Live
          </span>
        </div>

        {/* Upload form */}
        <form onSubmit={handleUpload} className="p-5 border-b border-gray-100 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
          <label
            className={`relative h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden transition ${
              preview ? 'border-transparent' : 'border-gray-300 hover:border-[#36135d] bg-gray-50'
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pickFile(e.dataTransfer.files?.[0] ?? null);
            }}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Selected banner preview" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                <Upload className="w-6 h-6 text-gray-400 mb-1.5" />
                <span className="text-xs font-bold text-gray-700">Choose or drop an image</span>
                <span className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, WebP · max 4 MB</span>
              </>
            )}
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="space-y-3">
            <DetailFields value={details} onChange={setDetails} />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!file || isUploading}
                className="bg-[#36135d] hover:bg-[#a7144c] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{isUploading ? 'Uploading...' : 'Add to Carousel'}</span>
              </button>
              {file && !isUploading && (
                <button type="button" onClick={resetUpload} className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-3 py-2 cursor-pointer">
                  Clear
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Image list */}
        {isLoading ? (
          <div className="py-12 flex items-center justify-center text-gray-400 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading images...
          </div>
        ) : images.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">No carousel images yet — upload one above.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {images.map((image, index) => (
              <li key={image.id} className={`p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${image.is_active ? '' : 'bg-gray-50/70'}`}>
                <div className="relative w-full sm:w-40 h-24 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getAssetUrl(image.image_url)} alt={image.alt_text || ''} className="absolute inset-0 w-full h-full object-cover" />
                  {!image.is_active && <span className="absolute inset-0 bg-white/50" />}
                </div>

                <div className="flex-1 min-w-0">
                  {editing?.id === image.id ? (
                    <div className="space-y-2">
                      <DetailFields value={editing} onChange={(next) => setEditing({ ...editing, ...next })} />
                      <div className="flex gap-2">
                        <button
                          onClick={saveDetails}
                          disabled={busyId === image.id}
                          className="bg-[#36135d] hover:bg-[#a7144c] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-60"
                        >
                          Save
                        </button>
                        <button onClick={() => setEditing(null)} className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 px-2 cursor-pointer">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-gray-900 truncate">{image.title || image.alt_text || `Image ${index + 1}`}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${image.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                          {image.is_active ? 'LIVE' : 'HIDDEN'}
                        </span>
                      </div>
                      {image.subtitle && <p className="text-xs text-gray-500 truncate mt-0.5">{image.subtitle.replace(/\n/g, ' ')}</p>}
                      <p className="text-[11px] text-gray-400 mt-1 truncate">
                        Button:{' '}
                        {image.cta_text && image.link ? (
                          <>
                            <span className="font-semibold text-gray-600">{image.cta_text}</span> → <code className="text-gray-600">{image.link}</code>
                          </>
                        ) : image.link ? (
                          <>none (whole image links to <code className="text-gray-600">{image.link}</code>)</>
                        ) : (
                          <span>none</span>
                        )}
                      </p>
                    </>
                  )}
                </div>

                {editing?.id !== image.id && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <IconButton label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp className="w-3.5 h-3.5" />
                    </IconButton>
                    <IconButton label="Move down" disabled={index === images.length - 1} onClick={() => move(index, 1)}>
                      <ArrowDown className="w-3.5 h-3.5" />
                    </IconButton>
                    <IconButton
                      label="Edit details"
                      onClick={() =>
                        setEditing({
                          id: image.id,
                          alt_text: image.alt_text ?? '',
                          title: image.title ?? '',
                          subtitle: image.subtitle ?? '',
                          cta_text: image.cta_text ?? '',
                          link: image.link ?? '',
                        })
                      }
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </IconButton>
                    <IconButton label={image.is_active ? 'Hide' : 'Show'} disabled={busyId === image.id} onClick={() => toggleActive(image)}>
                      {image.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </IconButton>
                    <IconButton label="Delete" danger disabled={busyId === image.id} onClick={() => remove(image)}>
                      {busyId === image.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </IconButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Carousel preview */}
      {activeImages.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-gray-900">Carousel Preview</h2>
            <span className="text-[11px] text-gray-500">
              {mode === 'images' ? 'Live on the homepage' : 'Not live — the homepage is showing the 3D banner'}
            </span>
          </div>
          <div className="max-w-3xl mx-auto">
            <HeroImageCarousel key={activeImages.map((img) => img.id).join('-')} images={activeImages} className="h-[260px] sm:h-[340px]" />
          </div>
        </div>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`w-8 h-8 rounded-lg border flex items-center justify-center transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        danger ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

function trimDetails(details: ImageDetails): ImageDetails {
  return {
    alt_text: details.alt_text.trim(),
    title: details.title.trim(),
    subtitle: details.subtitle.trim(),
    cta_text: details.cta_text.trim(),
    link: details.link.trim(),
  };
}

/** Headline, description, button and link inputs shared by the upload and edit forms. */
function DetailFields({ value, onChange }: { value: ImageDetails; onChange: (next: ImageDetails) => void }) {
  const set = (key: keyof ImageDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...value, [key]: e.target.value });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-[11px] font-bold text-gray-700 mb-1">Headline</label>
        <input className={inputClass} value={value.title} maxLength={60} onChange={set('title')} placeholder="e.g. Electronics" />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-gray-700 mb-1">Button text</label>
        <input className={inputClass} value={value.cta_text} maxLength={30} onChange={set('cta_text')} placeholder="e.g. Shop Electronics" />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-[11px] font-bold text-gray-700 mb-1">Description (press Enter for a new line)</label>
        <textarea
          className={`${inputClass} resize-none`}
          rows={2}
          value={value.subtitle}
          maxLength={160}
          onChange={set('subtitle')}
          placeholder={'e.g. Smart Technology for\nEveryday Life'}
        />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-gray-700 mb-1">Button link</label>
        <input className={inputClass} value={value.link} maxLength={255} onChange={set('link')} placeholder="/shop?category=electronics or https://..." />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-gray-700 mb-1">Image description (screen readers & SEO)</label>
        <input className={inputClass} value={value.alt_text} maxLength={120} onChange={set('alt_text')} placeholder="e.g. Laptop and headphones on a desk" />
      </div>
      <p className="sm:col-span-2 text-[10px] text-gray-400 -mt-1">
        Leave the headline and description empty to show the image on its own. The button appears only when both button text and link are filled in.
      </p>
    </div>
  );
}
