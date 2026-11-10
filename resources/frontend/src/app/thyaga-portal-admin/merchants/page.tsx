'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Store,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Percent,
  Package,
  ExternalLink,
  Building,
  Check,
  Power,
  Eye,
  SlidersHorizontal,
  LayoutGrid,
  List as ListIcon,
  Tag,
  Sparkles,
} from 'lucide-react';
import { api } from '@/services/api';
import { Merchant, Product } from '@/types';
import { getAssetUrl } from '@/utils/assets';

export default function AdminMerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [stats, setStats] = useState({
    total_merchants: 0,
    active_merchants: 0,
    pending_merchants: 0,
    inactive_merchants: 0,
    total_assigned_products: 0,
    avg_commission: 0,
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 12,
    total: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [deletingMerchant, setDeletingMerchant] = useState<Merchant | null>(null);
  const [viewProductsMerchant, setViewProductsMerchant] = useState<Merchant | null>(null);
  const [merchantProducts, setMerchantProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const initialForm = {
    name: '',
    code: '',
    business_type: 'Retail & Gifts',
    contact_person: '',
    email: '',
    phone: '',
    city: 'Colombo',
    address: '',
    commission_rate: '10.00',
    logo_url: '',
    website: '',
    description: '',
    status: 'active' as Merchant['status'],
    is_featured: false,
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchMerchants = useCallback(async (page = 1) => {
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await api.getAdminMerchants(token, {
        page,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sort_by: sortBy,
        per_page: 12,
      });

      if (res.success) {
        setMerchants(res.data);
        if (res.stats) setStats(res.stats);
        if (res.pagination) {
          setPagination({
            current_page: res.pagination.current_page,
            last_page: res.pagination.last_page,
            per_page: res.pagination.per_page,
            total: res.pagination.total,
          });
        }
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to fetch merchants',
      });
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, sortBy]);

  useEffect(() => {
    fetchMerchants(1);
  }, [fetchMerchants]);

  // Handle Add Merchant
  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) return;

    setIsSubmitting(true);
    try {
      const res = await api.createAdminMerchant(token, {
        ...formData,
        commission_rate: parseFloat(formData.commission_rate) || 10.0,
      });

      if (res.success) {
        setFeedback({ type: 'success', message: 'Merchant partner added successfully!' });
        setIsAddModalOpen(false);
        setFormData(initialForm);
        fetchMerchants(1);
        setTimeout(() => setFeedback(null), 3500);
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error creating merchant',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Merchant
  const handleOpenEdit = (m: Merchant) => {
    setEditingMerchant(m);
    setFormData({
      name: m.name,
      code: m.code || '',
      business_type: m.business_type || 'Retail & Gifts',
      contact_person: m.contact_person || '',
      email: m.email || '',
      phone: m.phone || '',
      city: m.city || 'Colombo',
      address: m.address || '',
      commission_rate: m.commission_rate?.toString() || '10.00',
      logo_url: m.logo_url || '',
      website: m.website || '',
      description: m.description || '',
      status: m.status,
      is_featured: m.is_featured,
    });
  };

  const handleUpdateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMerchant) return;
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) return;

    setIsSubmitting(true);
    try {
      const res = await api.updateAdminMerchant(token, editingMerchant.id, {
        ...formData,
        commission_rate: parseFloat(formData.commission_rate) || 10.0,
      });

      if (res.success) {
        setFeedback({ type: 'success', message: 'Merchant details updated successfully!' });
        setEditingMerchant(null);
        setFormData(initialForm);
        fetchMerchants(pagination.current_page);
        setTimeout(() => setFeedback(null), 3500);
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error updating merchant',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Merchant
  const handleDeleteMerchant = async () => {
    if (!deletingMerchant) return;
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) return;

    setIsSubmitting(true);
    try {
      const res = await api.deleteAdminMerchant(token, deletingMerchant.id);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Merchant partner removed successfully!' });
        setDeletingMerchant(null);
        fetchMerchants(pagination.current_page);
        setTimeout(() => setFeedback(null), 3500);
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete merchant',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Toggle Status
  const handleToggleStatus = async (m: Merchant) => {
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) return;

    const newStatus = m.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await api.toggleAdminMerchantStatus(token, m.id, newStatus);
      if (res.success) {
        setFeedback({ type: 'success', message: `Merchant status changed to ${newStatus}` });
        fetchMerchants(pagination.current_page);
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch {
      alert('Failed to change status');
    }
  };

  // View Merchant Products
  const handleViewProducts = async (m: Merchant) => {
    setViewProductsMerchant(m);
    setIsLoadingProducts(true);
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) return;

    try {
      const res = await api.getAdminMerchantProducts(token, m.id, { per_page: 50 });
      if (res.success) {
        setMerchantProducts(res.data);
      }
    } catch {
      setMerchantProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Main Header */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-100 text-[#36135d] font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
              <Store className="w-3 h-3" />
              <span>Vendors & Brands</span>
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {stats.active_merchants} Active Partners
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">
            Merchant Partners Management
          </h1>
          <p className="text-xs text-gray-500">
            Onboard, configure commission rates, assign products, and manage merchant partner visibility on Thyaga Mall
          </p>
        </div>

        <button
          onClick={() => {
            setFormData(initialForm);
            setIsAddModalOpen(true);
          }}
          className="bg-[#36135d] hover:bg-[#a7144c] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Merchant</span>
        </button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200 ${
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Total Merchants
            </span>
            <Store className="w-4 h-4 text-[#36135d]" />
          </div>
          <div className="text-xl font-black text-gray-900">{stats.total_merchants}</div>
          <span className="text-[10px] text-gray-400">Enrolled store suppliers</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Active Partners
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-xl font-black text-emerald-700">{stats.active_merchants}</div>
          <span className="text-[10px] text-emerald-600/80 font-medium">Selling on storefront</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
              Pending Review
            </span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-700">{stats.pending_merchants}</div>
          <span className="text-[10px] text-amber-600/80 font-medium">Awaiting onboarding</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Catalog Products
            </span>
            <Package className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-[#36135d]">{stats.total_assigned_products}</div>
          <span className="text-[10px] text-gray-400">Assigned items</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Avg. Commission
            </span>
            <Percent className="w-4 h-4 text-pink-600" />
          </div>
          <div className="text-xl font-black text-pink-700">{stats.avg_commission}%</div>
          <span className="text-[10px] text-gray-400">Store platform fee</span>
        </div>
      </div>

      {/* Search, Filter & Toolbar Bar */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by merchant name, code, contact or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-hidden focus:border-[#36135d] focus:ring-1 focus:ring-[#36135d]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          {/* Status Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold text-gray-600">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-emerald-700'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'pending' ? 'bg-white text-amber-700 shadow-xs' : 'hover:text-amber-700'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                statusFilter === 'inactive' ? 'bg-white text-gray-800 shadow-xs' : 'hover:text-gray-800'
              }`}
            >
              Inactive
            </button>
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-medium focus:outline-hidden bg-white cursor-pointer"
          >
            <option value="latest">Newest First</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="products_count">Most Products</option>
            <option value="commission">Highest Commission</option>
          </select>

          {/* View Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded-lg cursor-pointer transition ${
                viewMode === 'grid' ? 'bg-white text-[#36135d] shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1 rounded-lg cursor-pointer transition ${
                viewMode === 'table' ? 'bg-white text-[#36135d] shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Table View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Merchants Content */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#36135d] mb-2" />
          <span className="text-xs font-semibold">Loading merchant partners...</span>
        </div>
      ) : merchants.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-purple-50 text-[#36135d] rounded-2xl flex items-center justify-center mx-auto">
            <Store className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">No Merchant Partners Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {search || statusFilter !== 'all'
              ? 'No merchants matched your active search or filter criteria. Try resetting filters.'
              : 'You have not added any merchant partners yet. Click "Register New Merchant" to get started.'}
          </p>
          {(search || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}
              className="text-xs font-bold text-[#36135d] hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {merchants.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4 relative group"
            >
              {/* Card Top: Logo & Title */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden relative shrink-0 flex items-center justify-center text-sm font-extrabold text-[#36135d]">
                      {m.logo_url ? (
                        <Image
                          src={m.logo_url}
                          alt={m.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span>{m.name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-extrabold text-sm text-gray-900 leading-tight">
                          {m.name}
                        </h3>
                        {m.is_featured && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                            Featured
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono font-bold text-gray-400">
                          {m.code || 'NO-CODE'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          • {m.business_type || 'Retail'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Toggle Button */}
                  <button
                    onClick={() => handleToggleStatus(m)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition shrink-0 ${
                      m.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : m.status === 'pending'
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Click to toggle status"
                  >
                    ● {m.status.toUpperCase()}
                  </button>
                </div>

                {/* Description */}
                {m.description && (
                  <p className="text-[11px] text-gray-600 mt-3 line-clamp-2 leading-relaxed">
                    {m.description}
                  </p>
                )}

                {/* Contact & Location Info */}
                <div className="mt-3.5 pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
                  {m.contact_person && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-gray-400 font-semibold">Contact:</span>
                      <span className="font-medium text-gray-800">{m.contact_person}</span>
                    </div>
                  )}
                  {m.email && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <a href={`mailto:${m.email}`} className="text-gray-700 hover:text-[#36135d] truncate">
                        {m.email}
                      </a>
                    </div>
                  )}
                  {m.phone && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <a href={`tel:${m.phone}`} className="text-gray-700 hover:text-[#36135d]">
                        {m.phone}
                      </a>
                    </div>
                  )}
                  {m.city && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-700 truncate">{m.city}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer: Metrics & Actions */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-gray-700">
                    <Package className="w-3.5 h-3.5 text-[#36135d]" />
                    <button
                      onClick={() => handleViewProducts(m)}
                      className="hover:underline text-[#36135d] cursor-pointer"
                    >
                      {m.products_count || 0} Products
                    </button>
                  </div>
                  <div className="text-[11px] font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md">
                    {Number(m.commission_rate)}% Fee
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleViewProducts(m)}
                    className="p-1.5 text-gray-500 hover:text-[#36135d] hover:bg-purple-50 rounded-lg transition cursor-pointer"
                    title="View Products"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(m)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                    title="Edit Merchant"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingMerchant(m)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    title="Delete Merchant"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-b border-gray-100">
                <tr>
                  <th className="p-3.5">Merchant</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Contact Details</th>
                  <th className="p-3.5">City</th>
                  <th className="p-3.5">Commission</th>
                  <th className="p-3.5">Products</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {merchants.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden relative shrink-0 flex items-center justify-center font-bold text-xs text-[#36135d]">
                          {m.logo_url ? (
                            <Image src={m.logo_url} alt="" fill className="object-cover" />
                          ) : (
                            <span>{m.name.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-1.5">
                            <span>{m.name}</span>
                            {m.is_featured && (
                              <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1 rounded uppercase">
                                Featured
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-gray-400">{m.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-gray-600 font-medium">
                      {m.business_type || 'Retail'}
                    </td>
                    <td className="p-3.5 text-gray-700">
                      <div className="font-semibold">{m.contact_person || 'N/A'}</div>
                      <div className="text-[11px] text-gray-400">{m.email || m.phone || 'No direct contact'}</div>
                    </td>
                    <td className="p-3.5 text-gray-600">{m.city || 'Colombo'}</td>
                    <td className="p-3.5">
                      <span className="font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded">
                        {Number(m.commission_rate)}%
                      </span>
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => handleViewProducts(m)}
                        className="font-bold text-[#36135d] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>{m.products_count || 0}</span>
                      </button>
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggleStatus(m)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition ${
                          m.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        ● {m.status.toUpperCase()}
                      </button>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleViewProducts(m)}
                          className="p-1.5 text-gray-400 hover:text-[#36135d] hover:bg-purple-50 rounded transition cursor-pointer"
                          title="View Products"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingMerchant(m)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.last_page > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
          <span>
            Showing page {pagination.current_page} of {pagination.last_page} ({pagination.total} total merchants)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchMerchants(pagination.current_page - 1)}
              disabled={pagination.current_page <= 1}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => fetchMerchants(pagination.current_page + 1)}
              disabled={pagination.current_page >= pagination.last_page}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Merchant Modal */}
      {(isAddModalOpen || editingMerchant) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-gray-200 shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#36135d] uppercase tracking-wider mb-1">
                  <Store className="w-4 h-4" />
                  <span>{editingMerchant ? 'Edit Merchant Partner' : 'New Merchant Registration'}</span>
                </div>
                <h3 className="text-lg font-black text-gray-900">
                  {editingMerchant ? `Update ${editingMerchant.name}` : 'Register Merchant Partner'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingMerchant(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={editingMerchant ? handleUpdateMerchant : handleCreateMerchant}
              className="space-y-4 text-xs"
            >
              {/* Row 1: Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-gray-700 mb-1">
                    Merchant / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Spa Ceylon Luxury Ayurveda"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Partner Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MER-SPC-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d] font-mono uppercase"
                  />
                </div>
              </div>

              {/* Row 2: Category & Commission */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Business / Product Category *
                  </label>
                  <select
                    value={formData.business_type}
                    onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d] bg-white"
                  >
                    <option value="Wellness & Beauty">Wellness & Beauty</option>
                    <option value="Fashion & Lifestyle">Fashion & Lifestyle</option>
                    <option value="Gourmet Food & Beverages">Gourmet Food & Beverages</option>
                    <option value="Electronics & Home">Electronics & Home</option>
                    <option value="Groceries & Delicacies">Groceries & Delicacies</option>
                    <option value="Cakes & Sweet Treats">Cakes & Sweet Treats</option>
                    <option value="Jewellery & Accessories">Jewellery & Accessories</option>
                    <option value="Furniture & Living">Furniture & Living</option>
                    <option value="Retail & Gifts">Retail & Gifts</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Platform Commission Rate (%) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    placeholder="e.g. 10.00"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d]"
                  />
                </div>
              </div>

              {/* Row 3: Contact Person & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dilini Wickramasinghe"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. merchant@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d]"
                  />
                </div>
              </div>

              {/* Row 4: Phone & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Phone / Hotline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +94 11 258 7777"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Operating City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Colombo 07, Kandy, Galle..."
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d]"
                  />
                </div>
              </div>

              {/* Row 5: Address */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Full Store / Warehouse Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. No. 14, Ward Place, Colombo 07"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d]"
                />
              </div>

              {/* Row 6: Logo URL & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Logo Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://... (or leave empty for auto-generated avatar)"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Account Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Merchant['status'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d] bg-white font-semibold"
                  >
                    <option value="active">Active (Live on Mall)</option>
                    <option value="pending">Pending Approval</option>
                    <option value="inactive">Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Merchant Bio / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of the brand and product line..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d]"
                />
              </div>

              {/* Featured Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-4 h-4 rounded text-[#36135d] focus:ring-[#36135d] cursor-pointer"
                />
                <label htmlFor="is_featured" className="font-semibold text-gray-700 cursor-pointer">
                  Feature this merchant partner on Thyaga Mall homepage & gift guides
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingMerchant(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 font-semibold rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#36135d] hover:bg-[#a7144c] text-white font-bold rounded-lg transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingMerchant ? 'Update Merchant' : 'Save Merchant'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Merchant Products Modal */}
      {viewProductsMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-gray-200 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden relative shrink-0 flex items-center justify-center font-bold text-xs text-[#36135d]">
                  {viewProductsMerchant.logo_url ? (
                    <Image src={viewProductsMerchant.logo_url} alt="" fill className="object-cover" />
                  ) : (
                    <span>{viewProductsMerchant.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 leading-tight">
                    {viewProductsMerchant.name} — Catalog Products
                  </h3>
                  <p className="text-xs text-gray-500">
                    Showing products supplied by partner ({viewProductsMerchant.code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewProductsMerchant(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {isLoadingProducts ? (
                <div className="py-16 text-center text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin text-[#36135d] mx-auto mb-2" />
                  <span className="text-xs">Fetching partner products...</span>
                </div>
              ) : merchantProducts.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-xs">
                  No products currently associated with this merchant partner.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {merchantProducts.map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden relative shrink-0">
                          <Image
                            src={getAssetUrl(p.primary_image || 'https://placehold.co/100x100?text=Product')}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 line-clamp-1">{p.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">SKU: {p.sku}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-gray-900">
                          Rs. {Number(p.regular_price).toLocaleString()}
                        </div>
                        <span className="text-[10px] text-gray-500">{p.stock_quantity} in stock</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <Link
                href={`/thyaga-portal-admin/products?merchant_id=${viewProductsMerchant.id}`}
                className="text-xs font-bold text-[#36135d] hover:underline flex items-center gap-1"
              >
                <span>Manage in Products Panel</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setViewProductsMerchant(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-gray-200 shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">Remove Merchant Partner?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Are you sure you want to remove <strong className="text-gray-800">{deletingMerchant.name}</strong>? Any products currently assigned to this merchant will remain in your catalog but become unassigned.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingMerchant(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMerchant}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Merchant</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
