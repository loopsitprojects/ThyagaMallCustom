'use client';

import React, { useEffect, useState } from 'react';
import {
  Flame,
  Award,
  Search,
  Plus,
  Check,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { api } from '@/services/api';
import { HomeSection, Product } from '@/types';
import { getAssetUrl } from '@/utils/assets';

/** Matches HomeSectionProduct::DISPLAY_LIMIT on the server. */
const DISPLAY_LIMIT = 6;
const SEARCH_DELAY_MS = 300;

const SECTIONS: { value: HomeSection; label: string; icon: React.ReactNode; overflowHint: string }[] = [
  {
    value: 'trending',
    label: 'Trending Right Now',
    icon: <Flame className="w-4 h-4" />,
    overflowHint: 'Not shown: this section shows the first 6 live products',
  },
  {
    value: 'best_sellers',
    label: 'Best Sellers',
    icon: <Award className="w-4 h-4" />,
    overflowHint: 'Not on the All tab, but can appear on its category tab',
  },
];

function ProductThumb({ product }: { product: Product }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.primary_image ? getAssetUrl(product.primary_image) : ''}
      alt=""
      className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0"
    />
  );
}

function formatPrice(product: Product): string {
  return `Rs. ${Number(product.sale_price || product.regular_price).toLocaleString()}`;
}

export default function AdminHomeSectionsPage() {
  const [active, setActive] = useState<HomeSection>('trending');
  const [sections, setSections] = useState<Record<HomeSection, Product[]>>({ trending: [], best_sellers: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const token = () => localStorage.getItem('thyaga_admin_token') || '';

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  useEffect(() => {
    let cancelled = false;
    api.getAdminHomeSections(token())
      .then((res) => {
        if (!cancelled && res.success) setSections(res.data);
      })
      .catch((err) => {
        if (!cancelled) notify('error', err instanceof Error ? err.message : 'Failed to load the homepage sections');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const searchTerm = query.trim();

  useEffect(() => {
    if (!searchTerm) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.getAdminProducts(token(), { search: searchTerm });
        if (!cancelled && res.success) setResults(res.data);
      } catch (err) {
        if (!cancelled) notify('error', err instanceof Error ? err.message : 'Product search failed');
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const picked = sections[active];
  const pickedIds = new Set(picked.map((product) => product.id));
  const activeSection = SECTIONS.find((section) => section.value === active)!;
  const liveCount = picked.filter((product) => product.is_active).length;

  const setPicked = (products: Product[]) => setSections((prev) => ({ ...prev, [active]: products }));

  const add = async (product: Product) => {
    setBusyId(product.id);
    try {
      const res = await api.addAdminHomeSectionProduct(token(), active, product.id);
      setPicked(res.data);
      notify('success', `Added "${product.name}"`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not add the product');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (product: Product) => {
    setBusyId(product.id);
    try {
      const res = await api.removeAdminHomeSectionProduct(token(), active, product.id);
      setPicked(res.data);
      notify('success', `Removed "${product.name}"`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not remove the product');
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= picked.length) return;
    const previous = picked;
    const reordered = [...picked];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setPicked(reordered);
    try {
      await api.reorderAdminHomeSection(token(), active, reordered.map((product) => product.id));
    } catch (err) {
      setPicked(previous);
      notify('error', err instanceof Error ? err.message : 'Could not save the new order');
    }
  };

  // Position among live products: hidden ones don't take up a homepage slot.
  let livePosition = 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs">
        <span className="inline-flex bg-purple-100 text-[#36135d] font-extrabold text-[10px] px-2 py-0.5 rounded-full items-center gap-1 uppercase tracking-wider mb-1">
          <Sparkles className="w-3 h-3" />
          <span>Homepage</span>
        </span>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900">Homepage Sections</h1>
        <p className="text-xs text-gray-500">Choose which products appear in Trending Right Now and Best Sellers, and in what order</p>
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

      {/* Section tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="tablist" aria-label="Homepage section">
        {SECTIONS.map((section) => {
          const selected = active === section.value;
          const count = sections[section.value].length;
          return (
            <button
              key={section.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(section.value)}
              className={`text-left p-4 rounded-xl border-2 transition flex items-center gap-3 cursor-pointer ${
                selected ? 'border-[#36135d] bg-purple-50' : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${selected ? 'bg-[#36135d] text-white' : 'bg-gray-100 text-gray-500'}`}>
                {section.icon}
              </span>
              <span>
                <span className="block text-sm font-bold text-gray-900">{section.label}</span>
                <span className="block text-[11px] text-gray-500">
                  {isLoading ? 'Loading...' : count > 0 ? `${count} ${count === 1 ? 'product' : 'products'} chosen` : 'Automatic: most reviewed products'}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Product search */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-black text-gray-900">Add Products</h2>
            <p className="text-[11px] text-gray-500 mb-3">Search by product name or SKU</p>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. blender"
                aria-label="Search products"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-hidden focus:border-[#36135d]"
              />
            </div>
          </div>

          {!searchTerm ? (
            <div className="py-12 text-center text-xs text-gray-500">Type above to find products.</div>
          ) : isSearching && results.length === 0 ? (
            <div className="py-12 flex items-center justify-center text-gray-400 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">No products match &quot;{searchTerm}&quot;.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.map((product) => {
                const isAdded = pickedIds.has(product.id);
                return (
                  <li key={product.id} className="p-3 flex items-center gap-3">
                    <ProductThumb product={product} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{product.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {formatPrice(product)}
                        {product.category?.name ? ` · ${product.category.name}` : ''}
                      </p>
                    </div>
                    {!product.is_active ? (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-200 text-gray-600 shrink-0">HIDDEN</span>
                    ) : isAdded ? (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 px-2 shrink-0">
                        <Check className="w-3.5 h-3.5" /> Added
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => add(product)}
                        disabled={busyId === product.id}
                        className="bg-[#36135d] hover:bg-[#a7144c] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-60 shrink-0"
                      >
                        {busyId === product.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>Add</span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Chosen products */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-gray-900">{activeSection.label}</h2>
              <p className="text-[11px] text-gray-500">Use the arrows to set the order. The homepage shows {DISPLAY_LIMIT} at a time.</p>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">{liveCount} Live</span>
          </div>

          {isLoading ? (
            <div className="py-12 flex items-center justify-center text-gray-400 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading products...
            </div>
          ) : picked.length === 0 ? (
            <div className="py-12 px-6 text-center text-xs text-gray-500">
              No products chosen, so this section automatically shows the most reviewed products. Add a product to take control of it.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {picked.map((product, index) => {
                const isOverflow = product.is_active && ++livePosition > DISPLAY_LIMIT;
                return (
                  <li key={product.id} className={`p-3 flex items-center gap-3 ${product.is_active && !isOverflow ? '' : 'bg-gray-50/70'}`}>
                    <ProductThumb product={product} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{product.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {formatPrice(product)}
                        {product.category?.name ? ` · ${product.category.name}` : ''}
                      </p>
                      {!product.is_active && <p className="text-[10px] font-semibold text-amber-700 mt-0.5">Product is hidden, so it won&apos;t appear on the homepage</p>}
                      {isOverflow && <p className="text-[10px] font-semibold text-amber-700 mt-0.5">{activeSection.overflowHint}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${product.name} up`}
                        className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === picked.length - 1}
                        aria-label={`Move ${product.name} down`}
                        className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(product)}
                        disabled={busyId === product.id}
                        aria-label={`Remove ${product.name}`}
                        className="w-8 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer disabled:opacity-40"
                      >
                        {busyId === product.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
