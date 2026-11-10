'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Award,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Package,
  Eye,
  EyeOff,
  Globe,
  Tag,
  Check,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/services/api';
import { Brand, BrandInput } from '@/types';
import { getAssetUrl } from '@/utils/assets';

type FormState = {
  name: string;
  slug: string;
  logo: string;
  website_url: string;
  description: string;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
};

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  logo: '',
  website_url: '',
  description: '',
  is_featured: true,
  is_active: true,
  sort_order: 0,
};

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-hidden focus:border-[#36135d] transition';

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    featured: 0,
    active: 0,
    inactive: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'featured' | 'active' | 'inactive'>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('thyaga_admin_token') || '' : '';

  const fetchBrands = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await api.getAdminBrands(token, {
        search: search || undefined,
        status: filterTab === 'active' ? 'active' : filterTab === 'inactive' ? 'inactive' : undefined,
        featured: filterTab === 'featured' ? true : undefined,
      });

      if (res.success) {
        setBrands(res.data);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load brands',
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, search, filterTab]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // Total products tagged across all loaded brands
  const totalTaggedProducts = useMemo(() => {
    return brands.reduce((acc, b) => acc + (b.products_count || 0), 0);
  }, [brands]);

  // Open Add Modal
  const openAddModal = () => {
    const nextOrder = brands.length > 0 ? Math.max(...brands.map((b) => b.sort_order || 0)) + 1 : 1;
    setEditingBrand(null);
    setFormData({
      ...EMPTY_FORM,
      sort_order: nextOrder,
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (b: Brand) => {
    setEditingBrand(b);
    setFormData({
      name: b.name,
      slug: b.slug,
      logo: b.logo || '',
      website_url: b.website_url || '',
      description: b.description || '',
      is_featured: Boolean(b.is_featured),
      is_active: Boolean(b.is_active),
      sort_order: b.sort_order || 0,
    });
    setIsModalOpen(true);
  };

  // Auto-slugify on name change if creating new brand
  const handleNameChange = (val: string) => {
    setFormData((prev) => {
      const updated = { ...prev, name: val };
      if (!editingBrand) {
        updated.slug = val
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/--+/g, '-')
          .trim();
      }
      return updated;
    });
  };

  // Submit Add / Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!formData.name.trim()) {
      setFeedback({ type: 'error', message: 'Brand name is required.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: BrandInput = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        logo: formData.logo.trim() || null,
        website_url: formData.website_url.trim() || null,
        description: formData.description.trim() || null,
        is_featured: formData.is_featured,
        is_active: formData.is_active,
        sort_order: Number(formData.sort_order) || 0,
      };

      if (editingBrand) {
        const res = await api.updateAdminBrand(token, editingBrand.id, payload);
        if (res.success) {
          setFeedback({ type: 'success', message: `Brand "${payload.name}" updated successfully.` });
          setIsModalOpen(false);
          fetchBrands();
        }
      } else {
        const res = await api.createAdminBrand(token, payload);
        if (res.success) {
          setFeedback({ type: 'success', message: `Brand "${payload.name}" created successfully.` });
          setIsModalOpen(false);
          fetchBrands();
        }
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save brand',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Featured
  const handleToggleFeatured = async (brand: Brand) => {
    if (!token) return;
    try {
      const res = await api.toggleAdminBrandFeatured(token, brand.id);
      if (res.success) {
        setBrands((prev) =>
          prev.map((b) => (b.id === brand.id ? { ...b, is_featured: res.data.is_featured } : b))
        );
        setStats((prev) => ({
          ...prev,
          featured: res.data.is_featured ? prev.featured + 1 : Math.max(0, prev.featured - 1),
        }));
        setFeedback({
          type: 'success',
          message: `${brand.name} is now ${res.data.is_featured ? 'featured on homepage' : 'hidden from featured section'}.`,
        });
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to toggle featured status',
      });
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (brand: Brand) => {
    if (!token) return;
    try {
      const res = await api.toggleAdminBrandStatus(token, brand.id);
      if (res.success) {
        setBrands((prev) =>
          prev.map((b) => (b.id === brand.id ? { ...b, is_active: res.data.is_active } : b))
        );
        setStats((prev) => ({
          ...prev,
          active: res.data.is_active ? prev.active + 1 : Math.max(0, prev.active - 1),
          inactive: !res.data.is_active ? prev.inactive + 1 : Math.max(0, prev.inactive - 1),
        }));
        setFeedback({
          type: 'success',
          message: `${brand.name} is now ${res.data.is_active ? 'active' : 'inactive'}.`,
        });
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to toggle active status',
      });
    }
  };

  // Delete Brand
  const handleDelete = async () => {
    if (!token || !deletingBrand) return;
    setIsSubmitting(true);
    try {
      const res = await api.deleteAdminBrand(token, deletingBrand.id);
      if (res.success) {
        setFeedback({ type: 'success', message: `Brand "${deletingBrand.name}" deleted successfully.` });
        setDeletingBrand(null);
        fetchBrands();
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete brand',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Move brand up or down in sort order
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (!token || isReordering) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= brands.length) return;

    const newBrands = [...brands];
    const [moved] = newBrands.splice(index, 1);
    newBrands.splice(targetIndex, 0, moved);

    setBrands(newBrands);
    setIsReordering(true);

    try {
      const ids = newBrands.map((b) => b.id);
      const res = await api.reorderAdminBrands(token, ids);
      if (res.success) {
        setBrands(res.data);
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save brand reorder',
      });
      fetchBrands();
    } finally {
      setIsReordering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-purple-50 text-[#36135d]">
              <Award className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-gray-900 tracking-tight font-poppins">
              Brand Management
            </h1>
          </div>
          <p className="text-xs text-gray-500">
            Manage storefront partner brands, homepage &ldquo;Top Brands You Love&rdquo; marquee, and catalog tags
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBrands}
            className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-[#36135d] hover:bg-[#4a1b7f] text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Brand</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Total Brands
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.total || brands.length}</div>
          <span className="text-[11px] text-gray-500 mt-1 block">Registered in catalog</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 fill-purple-600" />
            <span>Featured on Home</span>
          </div>
          <div className="text-2xl font-black text-[#36135d]">{stats.featured}</div>
          <span className="text-[11px] text-purple-600/80 mt-1 block">In Top Brands marquee</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">
            Active Brands
          </div>
          <div className="text-2xl font-black text-emerald-700">{stats.active}</div>
          <span className="text-[11px] text-emerald-600/80 mt-1 block">Visible to shoppers</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Package className="w-3.5 h-3.5" />
            <span>Tagged Products</span>
          </div>
          <div className="text-2xl font-black text-blue-700">{totalTaggedProducts}</div>
          <span className="text-[11px] text-blue-600/80 mt-1 block">Assigned in catalog</span>
        </div>
      </div>

      {/* Control Bar: Search & Tabs */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg shrink-0">
          {[
            { id: 'all', label: 'All Brands', count: stats.total || brands.length },
            { id: 'featured', label: 'Featured ⚡', count: stats.featured },
            { id: 'active', label: 'Active', count: stats.active },
            { id: 'inactive', label: 'Inactive', count: stats.inactive },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as typeof filterTab)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                filterTab === tab.id
                  ? 'bg-white text-[#36135d] shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterTab === tab.id ? 'bg-purple-100 text-[#36135d]' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brand by name..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-hidden focus:border-[#36135d]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Brands Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#36135d] mb-2" />
            <span className="text-xs font-medium">Loading brands catalog...</span>
          </div>
        ) : brands.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-50 text-[#36135d] mx-auto flex items-center justify-center mb-3">
              <Award className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">No brands found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
              {search
                ? `No brands matched your search "${search}".`
                : 'No brands registered in this view. Click "Add New Brand" to get started.'}
            </p>
            <button
              onClick={openAddModal}
              className="bg-[#36135d] text-white px-4 py-2 rounded-lg text-xs font-bold transition"
            >
              Add First Brand
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-14 text-center">Order</th>
                  <th className="py-3 px-4 w-28">Preview</th>
                  <th className="py-3 px-4">Brand Details</th>
                  <th className="py-3 px-4 text-center">Products</th>
                  <th className="py-3 px-4 text-center">Featured on Home</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {brands.map((brand, idx) => {
                  return (
                    <tr
                      key={brand.id}
                      className="hover:bg-purple-50/30 transition-colors group"
                    >
                      {/* Sort Controls */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0 || isReordering}
                            onClick={() => handleMove(idx, 'up')}
                            className="p-1 text-gray-400 hover:text-[#36135d] disabled:opacity-20 disabled:hover:text-gray-400 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] font-mono text-gray-400 font-bold">
                            {brand.sort_order ?? idx + 1}
                          </span>
                          <button
                            type="button"
                            disabled={idx === brands.length - 1 || isReordering}
                            onClick={() => handleMove(idx, 'down')}
                            className="p-1 text-gray-400 hover:text-[#36135d] disabled:opacity-20 disabled:hover:text-gray-400 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Brand Logo / Badge Preview */}
                      <td className="py-3 px-4">
                        <div className="w-24 h-12 rounded-lg border border-gray-200 bg-white p-1.5 flex items-center justify-center overflow-hidden shadow-2xs">
                          {brand.logo ? (
                            <Image
                              src={getAssetUrl(brand.logo)}
                              alt={brand.name}
                              width={80}
                              height={36}
                              className="max-h-9 max-w-full object-contain"
                            />
                          ) : (
                            <span className="font-extrabold text-gray-800 text-xs tracking-wide truncate">
                              {brand.name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Brand Name, Slug & Website */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                          <span>{brand.name}</span>
                          {brand.website_url && (
                            <a
                              href={brand.website_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-gray-400 hover:text-[#36135d] transition"
                              title="Visit website"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                          slug: <span className="text-purple-700 font-semibold">{brand.slug}</span>
                        </div>
                        {brand.description && (
                          <div className="text-[11px] text-gray-500 line-clamp-1 mt-1 max-w-md">
                            {brand.description}
                          </div>
                        )}
                      </td>

                      {/* Products Tagged */}
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/thyaga-portal-admin/products?brand_id=${brand.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition cursor-pointer"
                          title="View brand products in admin"
                        >
                          <Package className="w-3 h-3" />
                          <span>{brand.products_count ?? 0}</span>
                        </Link>
                      </td>

                      {/* Featured on Homepage */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(brand)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                            brand.is_featured
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 shadow-2xs'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                          title="Click to toggle featured on homepage marquee"
                        >
                          <Zap
                            className={`w-3.5 h-3.5 ${
                              brand.is_featured ? 'fill-amber-500 text-amber-600' : 'text-gray-400'
                            }`}
                          />
                          <span>{brand.is_featured ? 'Featured' : 'Not Featured'}</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(brand)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                            brand.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                          title="Click to toggle active status"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              brand.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                          <span>{brand.is_active ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(brand)}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-purple-50 hover:text-[#36135d] hover:border-purple-200 transition cursor-pointer"
                            title="Edit Brand"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingBrand(brand)}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition cursor-pointer"
                            title="Delete Brand"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Brand Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-gray-200 shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-100 text-[#36135d]">
                  <Award className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-gray-900 text-sm">
                  {editingBrand ? `Edit Brand: ${editingBrand.name}` : 'Add New Brand'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Brand Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. SAMSUNG, Apple, Sony"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Slug <span className="text-gray-400 font-normal">(URL key)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="e.g. samsung"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Logo URL or Upload Path
                </label>
                <input
                  type="text"
                  value={formData.logo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, logo: e.target.value }))}
                  placeholder="/uploads/brands/samsung.png or https://example.com/logo.png"
                  className={inputClass}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Leave blank to show the brand as high-contrast styled text.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Official Website <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, website_url: e.target.value }))}
                    placeholder="https://www.samsung.com"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, sort_order: parseInt(e.target.value, 10) || 0 }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Description <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Short tagline or notes about this brand partner..."
                  className={inputClass}
                />
              </div>

              {/* Toggles */}
              <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-100">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_featured: e.target.checked }))}
                    className="accent-[#36135d] rounded"
                  />
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>Feature on Storefront Homepage (Top Brands You Love carousel)</span>
                  </span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                    className="accent-[#36135d] rounded"
                  />
                  <span>Active in Store (Visible in brand filters and catalog)</span>
                </label>
              </div>

              {/* Live Preview Box */}
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Storefront Marquee Preview
                </span>
                <div className="p-3 bg-gray-100 rounded-xl flex items-center justify-center">
                  <div className="h-14 w-36 rounded-xl border border-gray-200 bg-white flex items-center justify-center p-2 shadow-xs">
                    {formData.logo ? (
                      <Image
                        src={getAssetUrl(formData.logo)}
                        alt={formData.name || 'Brand'}
                        width={90}
                        height={32}
                        className="max-h-8 max-w-[90%] object-contain"
                      />
                    ) : (
                      <span className="font-extrabold text-gray-800 text-xs sm:text-sm tracking-wide truncate">
                        {formData.name || 'Brand Name'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 bg-[#36135d] hover:bg-[#4a1b7f] text-white text-xs font-bold px-5 py-2 rounded-lg transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingBrand ? 'Save Changes' : 'Create Brand'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBrand && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-gray-200 shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Delete Brand</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to delete <strong className="text-gray-900">{deletingBrand.name}</strong>?
                Any products tagged with this brand will remain in your catalog with their brand unassigned.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingBrand(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Deleting...' : 'Yes, Delete Brand'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

