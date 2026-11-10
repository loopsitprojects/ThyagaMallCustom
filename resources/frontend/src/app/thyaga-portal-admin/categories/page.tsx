'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  FolderTree,
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
  ChevronRight,
  ChevronDown,
  Home,
  Menu,
  Search,
} from 'lucide-react';
import { api } from '@/services/api';
import { Category, CategoryInput } from '@/types';
import CategoryIcon, { CATEGORY_ICONS } from '@/components/common/CategoryIcon';
import { categoryGradient, flattenCategoryTree } from '@/hooks/useCategories';
import { getAssetUrl } from '@/utils/assets';

type FormState = Required<Pick<CategoryInput, 'name' | 'slug' | 'subtitle' | 'description' | 'icon' | 'color_from' | 'color_to' | 'image'>> & {
  parent_id: number | null;
  is_active: boolean;
  is_featured: boolean;
  show_in_menu: boolean;
};

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  parent_id: null,
  subtitle: '',
  description: '',
  icon: 'ShoppingBag',
  color_from: '#a78bfa',
  color_to: '#36135d',
  image: '',
  is_active: true,
  is_featured: false,
  show_in_menu: false,
};

const COLOR_PRESETS: [string, string][] = [
  ['#a78bfa', '#36135d'], ['#60a5fa', '#2563eb'], ['#2dd4bf', '#0d9488'], ['#4ade80', '#16a34a'],
  ['#fcd34d', '#f59e0b'], ['#fb923c', '#c2410c'], ['#fb7185', '#e11d48'], ['#f9a8d4', '#db2777'],
  ['#c084fc', '#7c3aed'], ['#818cf8', '#4338ca'], ['#94a3b8', '#475569'],
];

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-hidden focus:border-[#36135d]';

function toForm(category: Category): FormState {
  return {
    name: category.name,
    slug: category.slug,
    parent_id: category.parent_id,
    subtitle: category.subtitle ?? '',
    description: category.description ?? '',
    icon: category.icon ?? 'ShoppingBag',
    color_from: category.color_from ?? '#a78bfa',
    color_to: category.color_to ?? '#36135d',
    image: category.image ?? '',
    is_active: category.is_active,
    is_featured: category.is_featured,
    show_in_menu: !!category.show_in_menu,
  };
}

// Empty strings are sent as null so optional fields can be cleared.
function toPayload(form: FormState): CategoryInput {
  const blankToNull = (v: string | null) => (v && v.trim() ? v.trim() : null);
  return {
    ...form,
    slug: blankToNull(form.slug) ?? undefined,
    subtitle: blankToNull(form.subtitle),
    description: blankToNull(form.description),
    image: blankToNull(form.image),
  };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [iconNames, setIconNames] = useState<string[]>(Object.keys(CATEGORY_ICONS));
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  // Editor: null = closed, 0 = new category, >0 = editing that id
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const token = () => localStorage.getItem('thyaga_admin_token') || '';

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const reload = async () => {
    const res = await api.getAdminCategories(token());
    if (res.success) {
      setCategories(res.data);
      if (res.icons?.length) setIconNames(res.icons.filter((name) => name in CATEGORY_ICONS));
    }
  };

  useEffect(() => {
    let cancelled = false;
    api.getAdminCategories(token())
      .then((res) => {
        if (cancelled || !res.success) return;
        setCategories(res.data);
        if (res.icons?.length) setIconNames(res.icons.filter((name) => name in CATEGORY_ICONS));
      })
      .catch((err) => {
        if (!cancelled) notify('error', err instanceof Error ? err.message : 'Failed to load categories');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => flattenCategoryTree(categories), [categories]);
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Hide rows whose ancestor is collapsed (search shows every match regardless).
  const visibleRows = rows.filter(({ category }) => {
    if (search.trim()) return category.name.toLowerCase().includes(search.trim().toLowerCase());
    let parentId = category.parent_id;
    while (parentId !== null) {
      if (collapsed.has(parentId)) return false;
      parentId = byId.get(parentId)?.parent_id ?? null;
    }
    return true;
  });

  // A category can't be moved under itself or any of its own sub-categories.
  const blockedParentIds = useMemo(() => {
    if (!editingId) return new Set<number>();
    const blocked = new Set<number>([editingId]);
    let added = true;
    while (added) {
      added = false;
      categories.forEach((c) => {
        if (c.parent_id !== null && blocked.has(c.parent_id) && !blocked.has(c.id)) {
          blocked.add(c.id);
          added = true;
        }
      });
    }
    return blocked;
  }, [editingId, categories]);

  const siblingsOf = (category: Category) =>
    rows.filter((r) => r.category.parent_id === category.parent_id).map((r) => r.category);

  const openCreate = (parentId: number | null = null) => {
    const parent = parentId ? byId.get(parentId) : undefined;
    setForm({
      ...EMPTY_FORM,
      parent_id: parentId,
      // Sub-categories inherit their parent's colours by default.
      color_from: parent?.color_from ?? EMPTY_FORM.color_from,
      color_to: parent?.color_to ?? EMPTY_FORM.color_to,
    });
    setEditingId(0);
  };

  const openEdit = (category: Category) => {
    setForm(toForm(category));
    setEditingId(category.id);
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId === null) return;
    setIsSaving(true);
    try {
      const res = editingId === 0
        ? await api.createAdminCategory(token(), toPayload(form))
        : await api.updateAdminCategory(token(), editingId, toPayload(form));
      notify('success', res.message);
      setEditingId(null);
      await reload();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not save the category');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFlag = async (category: Category, key: 'is_active' | 'is_featured' | 'show_in_menu', label: string) => {
    setBusyId(category.id);
    try {
      await api.updateAdminCategory(token(), category.id, { [key]: !category[key] });
      setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, [key]: !c[key] } : c)));
      notify('success', `${category.name}: ${label} ${category[key] ? 'off' : 'on'}`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not update the category');
    } finally {
      setBusyId(null);
    }
  };

  const move = async (category: Category, direction: -1 | 1) => {
    const siblings = siblingsOf(category);
    const index = siblings.findIndex((s) => s.id === category.id);
    const target = index + direction;
    if (target < 0 || target >= siblings.length) return;
    const reordered = [...siblings];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const positions = new Map(reordered.map((s, i) => [s.id, i + 1]));
    setCategories((prev) => prev.map((c) => (positions.has(c.id) ? { ...c, sort_order: positions.get(c.id)! } : c)));
    try {
      await api.reorderAdminCategories(token(), reordered.map((s) => s.id));
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not save the new order');
      reload();
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      const res = await api.deleteAdminCategory(token(), deleting.id);
      notify('success', res.message);
      setCategories((prev) => prev.filter((c) => c.id !== deleting.id));
      setDeleting(null);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not delete the category');
      setDeleting(null);
    } finally {
      setBusyId(null);
    }
  };

  const topLevelCount = categories.filter((c) => c.parent_id === null).length;
  const preview = { ...form, ...categoryGradient(form) };

  return (
    <div className="space-y-6">
      {/* Page Title & Main Header */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-100 text-[#36135d] font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
              <FolderTree className="w-3 h-3" />
              <span>Catalogue</span>
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {topLevelCount} main · {categories.length - topLevelCount} sub-categories
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">Categories</h1>
          <p className="text-xs text-gray-500">
            Add categories and sub-categories, and choose where they appear: the menu bar, homepage icons, tiles and filters all read from here
          </p>
        </div>

        <button
          onClick={() => openCreate(null)}
          className="bg-[#36135d] hover:bg-[#a7144c] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Feedback Toast */}
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

      {/* Category tree */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-gray-900">Category Tree</h2>
            <p className="text-[11px] text-gray-500">
              <Home className="inline w-3 h-3 -mt-0.5" /> = homepage icons, tiles &amp; Best Sellers tabs · <Menu className="inline w-3 h-3 -mt-0.5" /> = menu bar
            </p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a category" className={`${inputClass} pl-8 sm:w-56`} />
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center text-gray-400 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading categories...
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">
            {search ? 'No categories match your search.' : 'No categories yet.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visibleRows.map(({ category, depth }) => {
              const siblings = siblingsOf(category);
              const position = siblings.findIndex((s) => s.id === category.id);
              const hasChildren = (category.children_count ?? 0) > 0 || categories.some((c) => c.parent_id === category.id);
              const { from, to } = categoryGradient(category);
              return (
                <li key={category.id} className={`py-2.5 pr-4 flex items-center gap-3 ${category.is_active ? '' : 'bg-gray-50/80'}`} style={{ paddingLeft: `${1 + depth * 1.75}rem` }}>
                  <button
                    onClick={() => setCollapsed((prev) => {
                      const next = new Set(prev);
                      if (next.has(category.id)) next.delete(category.id); else next.add(category.id);
                      return next;
                    })}
                    disabled={!hasChildren}
                    className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-[#36135d] disabled:invisible cursor-pointer"
                    aria-label={collapsed.has(category.id) ? 'Expand' : 'Collapse'}
                  >
                    {collapsed.has(category.id) ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <div
                    className={`relative w-10 h-10 rounded-xl shrink-0 overflow-hidden flex items-center justify-center ${category.is_active ? '' : 'opacity-50'}`}
                    style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                  >
                    {category.image && depth === 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getAssetUrl(category.image)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <CategoryIcon icon={category.icon} className="w-5 h-5 text-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-sm font-bold truncate ${category.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{category.name}</span>
                      {!category.is_active && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">HIDDEN</span>}
                      {category.is_featured && <span title="Shown on the homepage" className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-[#36135d] flex items-center gap-0.5"><Home className="w-2.5 h-2.5" />HOME</span>}
                      {category.show_in_menu && <span title="Shown in the menu bar" className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-0.5"><Menu className="w-2.5 h-2.5" />MENU</span>}
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">
                      /{category.slug} · {category.products_count ?? 0} products{category.subtitle ? ` · ${category.subtitle}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => move(category, -1)} disabled={position <= 0} className="p-1.5 rounded-lg text-gray-400 hover:text-[#36135d] hover:bg-purple-50 disabled:opacity-25 cursor-pointer" title="Move up" aria-label="Move up">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => move(category, 1)} disabled={position === siblings.length - 1} className="p-1.5 rounded-lg text-gray-400 hover:text-[#36135d] hover:bg-purple-50 disabled:opacity-25 cursor-pointer" title="Move down" aria-label="Move down">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    {depth === 0 && (
                      <>
                        <button onClick={() => toggleFlag(category, 'is_featured', 'Homepage')} disabled={busyId === category.id} className={`p-1.5 rounded-lg cursor-pointer ${category.is_featured ? 'text-[#36135d] bg-purple-50' : 'text-gray-300 hover:text-[#36135d]'}`} title="Show on homepage" aria-label="Toggle homepage">
                          <Home className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => toggleFlag(category, 'show_in_menu', 'Menu bar')} disabled={busyId === category.id} className={`p-1.5 rounded-lg cursor-pointer ${category.show_in_menu ? 'text-blue-700 bg-blue-50' : 'text-gray-300 hover:text-blue-700'}`} title="Show in menu bar" aria-label="Toggle menu bar">
                          <Menu className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button onClick={() => toggleFlag(category, 'is_active', 'Visible')} disabled={busyId === category.id} className="p-1.5 rounded-lg text-gray-400 hover:text-[#36135d] hover:bg-purple-50 cursor-pointer" title={category.is_active ? 'Hide from the store' : 'Show in the store'} aria-label={category.is_active ? 'Hide' : 'Show'}>
                      {category.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => openCreate(category.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer" title={`Add a sub-category to ${category.name}`} aria-label="Add sub-category">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => openEdit(category)} className="px-2.5 py-1.5 rounded-lg bg-[#36135d] hover:bg-[#a7144c] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => setDeleting(category)} className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Delete" aria-label="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Editor modal */}
      {editingId !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-black text-gray-900">
                {editingId === 0 ? (form.parent_id ? `Add sub-category to ${byId.get(form.parent_id)?.name}` : 'Add Category') : `Edit ${form.name || 'Category'}`}
              </h2>
              <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-5 gap-5 p-5 text-xs">
              <div className="md:col-span-3 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block font-bold text-gray-700 mb-1">Name *</label>
                    <input required maxLength={100} value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Kitchen" className={inputClass} />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block font-bold text-gray-700 mb-1">URL slug <span className="font-normal text-gray-400">(auto if empty)</span></label>
                    <input maxLength={120} value={form.slug ?? ''} onChange={(e) => update('slug', e.target.value)} placeholder="kitchen" pattern="[A-Za-z0-9_\-]*" title="Letters, numbers, dashes and underscores only" className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">Parent category</label>
                    <select value={form.parent_id ?? ''} onChange={(e) => update('parent_id', e.target.value ? Number(e.target.value) : null)} className={inputClass}>
                      <option value="">— None (main category) —</option>
                      {rows.filter(({ category }) => !blockedParentIds.has(category.id)).map(({ category, depth }) => (
                        <option key={category.id} value={category.id}>
                          {'   '.repeat(depth)}{category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">Subtitle <span className="font-normal text-gray-400">(shown on homepage tiles)</span></label>
                    <input maxLength={80} value={form.subtitle ?? ''} onChange={(e) => update('subtitle', e.target.value)} placeholder="e.g. Make it a Home" className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">Description</label>
                    <textarea maxLength={1000} rows={2} value={form.description ?? ''} onChange={(e) => update('description', e.target.value)} className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">Icon</label>
                  <div className="grid grid-cols-8 sm:grid-cols-11 gap-1.5 max-h-36 overflow-y-auto p-1 border border-gray-200 rounded-lg">
                    {iconNames.map((name) => (
                      <button
                        type="button"
                        key={name}
                        onClick={() => update('icon', name)}
                        title={name}
                        aria-label={name}
                        className={`aspect-square rounded-lg flex items-center justify-center cursor-pointer transition ${form.icon === name ? 'bg-[#36135d] text-white' : 'text-gray-500 hover:bg-purple-50 hover:text-[#36135d]'}`}
                      >
                        <CategoryIcon icon={name} className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1.5">Colours</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {COLOR_PRESETS.map(([from, to]) => (
                      <button
                        type="button"
                        key={from}
                        onClick={() => setForm((prev) => ({ ...prev, color_from: from, color_to: to }))}
                        className={`w-7 h-7 rounded-full cursor-pointer ring-offset-2 ${form.color_from === from && form.color_to === to ? 'ring-2 ring-[#36135d]' : ''}`}
                        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                        aria-label={`Colour preset ${from} to ${to}`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['color_from', 'color_to'] as const).map((key) => (
                      <label key={key} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 cursor-pointer">
                        <input type="color" value={form[key] ?? '#000000'} onChange={(e) => update(key, e.target.value)} className="w-8 h-8 rounded-md border-0 bg-transparent p-0 cursor-pointer" />
                        <span className="font-semibold text-gray-700">{key === 'color_from' ? 'Light' : 'Dark'} <code className="text-gray-400 font-normal">{form[key]}</code></span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Tile image link <span className="font-normal text-gray-400">(optional — the icon is shown if empty)</span></label>
                  <input maxLength={500} value={form.image ?? ''} onChange={(e) => update('image', e.target.value)} placeholder="https://… or /banners/kitchen.jpg" pattern="^(/(?!/)\S*|https://\S+)$" title="A full https:// link or a site path starting with /" className={inputClass} />
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => update('is_active', e.target.checked)} className="accent-[#36135d]" />
                    Visible in the store
                  </label>
                  {form.parent_id === null && (
                    <>
                      <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={form.is_featured} onChange={(e) => update('is_featured', e.target.checked)} className="accent-[#36135d]" />
                        Show on the homepage (icons, category tiles, Best Sellers tabs)
                      </label>
                      <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
                        <input type="checkbox" checked={form.show_in_menu} onChange={(e) => update('show_in_menu', e.target.checked)} className="accent-[#36135d]" />
                        Show in the menu bar (others go under &ldquo;More&rdquo;)
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Live preview */}
              <div className="md:col-span-2 space-y-3">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Preview</span>
                <div className="rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0" style={{ background: `linear-gradient(135deg, ${preview.from}, ${preview.to})`, boxShadow: `0 8px 18px -8px ${preview.to}` }}>
                    <span aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/35 to-transparent" />
                    <CategoryIcon icon={form.icon} className="relative w-8 h-8 text-white" strokeWidth={2.1} />
                  </div>
                  <div className="text-[11px] text-gray-500">Homepage icon<br /><span className="font-bold text-gray-800 text-xs">{form.name || 'Category name'}</span></div>
                </div>
                <div className="rounded-2xl p-3.5 h-44 relative border border-black/5" style={{ background: `linear-gradient(160deg, ${preview.from}26, ${preview.to}1f)` }}>
                  <h3 className="text-xs font-extrabold text-gray-900">{form.name || 'Category name'}</h3>
                  {form.subtitle && <p className="text-[10px] text-gray-500 font-medium">{form.subtitle}</p>}
                  <div className="absolute bottom-2.5 right-2.5 w-20 h-20 rounded-2xl overflow-hidden shadow-md border-2 border-white flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${preview.from}, ${preview.to})` }}>
                    {form.image && /^(\/(?!\/)|https:\/\/)/.test(form.image) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getAssetUrl(form.image)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <CategoryIcon icon={form.icon} className="w-9 h-9 text-white" />
                    )}
                  </div>
                  <span className="absolute left-3.5 bottom-3 text-[10px] text-gray-500">Category tile</span>
                </div>
              </div>

              <div className="md:col-span-5 flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 rounded-lg bg-[#36135d] hover:bg-[#a7144c] text-white font-bold flex items-center gap-2 disabled:opacity-60 cursor-pointer">
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingId === 0 ? 'Create Category' : 'Save Changes'}
                </button>
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
              <h3 className="text-base font-black text-gray-900">Delete &ldquo;{deleting.name}&rdquo;?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Only empty categories can be deleted. To take a category out of the store but keep its products, hide it with the eye button instead.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setDeleting(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 cursor-pointer">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={busyId === deleting.id} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-60 cursor-pointer">
                {busyId === deleting.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
