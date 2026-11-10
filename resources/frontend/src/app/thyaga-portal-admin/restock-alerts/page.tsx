'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BellRing,
  Search,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/services/api';
import { ProductWithRestockRequests, RestockRequest } from '@/types';
import { getAssetUrl } from '@/utils/assets';

const SEARCH_DELAY_MS = 300;

type StatusFilter = '' | 'waiting' | 'notified';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'notified', label: 'Notified' },
];

export default function AdminRestockAlertsPage() {
  const [products, setProducts] = useState<ProductWithRestockRequests[]>([]);
  const [stats, setStats] = useState({ waiting: 0, notified: 0 });
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const token = () => localStorage.getItem('thyaga_admin_token') || '';

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Wait for a pause in typing before searching.
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(search.trim());
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    api.getAdminRestockRequests(token(), { page, status: status || undefined, search: appliedSearch || undefined })
      .then((res) => {
        if (cancelled || !res.success) return;
        setProducts(res.data);
        setStats(res.stats);
        setPagination(res.pagination);
      })
      .catch((err) => {
        if (!cancelled) notify('error', err instanceof Error ? err.message : 'Failed to load restock alerts');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, status, appliedSearch]);

  const changeStatus = (next: StatusFilter) => {
    setStatus(next);
    setPage(1);
  };

  const remove = async (product: ProductWithRestockRequests, request: RestockRequest) => {
    if (!window.confirm(`Remove ${request.email} from the alert list for "${product.name}"?`)) return;
    setBusyId(request.id);
    try {
      const res = await api.deleteAdminRestockRequest(token(), request.id);
      setProducts((prev) =>
        prev
          .map((p) => (p.id === product.id ? { ...p, restock_requests: p.restock_requests.filter((r) => r.id !== request.id) } : p))
          .filter((p) => p.restock_requests.length > 0)
      );
      setStats((prev) => (request.notified_at ? { ...prev, notified: prev.notified - 1 } : { ...prev, waiting: prev.waiting - 1 }));
      notify('success', res.message);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not remove the email');
    } finally {
      setBusyId(null);
    }
  };

  const copyEmails = async (product: ProductWithRestockRequests) => {
    try {
      await navigator.clipboard.writeText(product.restock_requests.map((r) => r.email).join(', '));
      notify('success', `Copied ${product.restock_requests.length} email${product.restock_requests.length === 1 ? '' : 's'}`);
    } catch {
      notify('error', 'Could not copy to the clipboard');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="inline-flex bg-purple-100 text-[#36135d] font-extrabold text-[10px] px-2 py-0.5 rounded-full items-center gap-1 uppercase tracking-wider mb-1">
            <BellRing className="w-3 h-3" />
            <span>Customers</span>
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">Restock Alerts</h1>
          <p className="text-xs text-gray-500">Emails left on out-of-stock products. Shoppers are emailed automatically when the product is back in stock.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center">
            <div className="text-lg font-black text-amber-900">{stats.waiting}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Waiting</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-center">
            <div className="text-lg font-black text-emerald-900">{stats.notified}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Notified</div>
          </div>
        </div>
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

      <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product, SKU or email"
            aria-label="Search restock alerts"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-hidden focus:border-[#36135d]"
          />
        </div>
        <div className="flex rounded-lg border border-gray-200 p-0.5 self-start" role="group" aria-label="Filter by status">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={status === option.value}
              onClick={() => changeStatus(option.value)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold cursor-pointer ${status === option.value ? 'bg-[#36135d] text-white' : 'text-gray-500'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex items-center justify-center text-gray-400 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading restock alerts...
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 py-16 text-center text-xs text-gray-500 shadow-xs">
          {appliedSearch || status ? 'No restock alerts match these filters.' : 'No emails yet. They appear here when shoppers ask to be told about an out-of-stock product.'}
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <section key={product.id} className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.primary_image ? getAssetUrl(product.primary_image) : ''} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-bold text-gray-900 truncate">{product.name}</h2>
                  <p className="text-[11px] text-gray-500 truncate">
                    {product.sku ? `SKU ${product.sku} · ` : ''}
                    <span className={product.stock_quantity > 0 ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
                      {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
                    </span>
                    {' · '}
                    {product.restock_requests.length} email{product.restock_requests.length === 1 ? '' : 's'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyEmails(product)}
                  title="Copy emails"
                  aria-label={`Copy emails for ${product.name}`}
                  className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <Link
                  href={`/product/${product.slug}`}
                  target="_blank"
                  title="View product"
                  aria-label={`View ${product.name}`}
                  className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
              <ul className="divide-y divide-gray-100">
                {product.restock_requests.map((request) => (
                  <li key={request.id} className="px-4 py-2.5 flex items-center gap-3">
                    <a href={`mailto:${request.email}`} className="flex-1 min-w-0 text-xs font-semibold text-gray-800 hover:text-[#6d28d9] truncate">
                      {request.email}
                    </a>
                    <span className="hidden sm:block text-[11px] text-gray-400 shrink-0">
                      Asked {new Date(request.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${request.notified_at ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {request.notified_at ? 'NOTIFIED' : 'WAITING'}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(product, request)}
                      disabled={busyId === request.id}
                      aria-label={`Remove ${request.email}`}
                      className="w-7 h-7 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer disabled:opacity-40 shrink-0"
                    >
                      {busyId === request.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {pagination.last_page > 1 && (
        <div className="flex items-center justify-center gap-3 text-xs text-gray-600">
          <button
            type="button"
            onClick={() => setPage(pagination.current_page - 1)}
            disabled={pagination.current_page <= 1}
            aria-label="Previous page"
            className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>Page {pagination.current_page} of {pagination.last_page}</span>
          <button
            type="button"
            onClick={() => setPage(pagination.current_page + 1)}
            disabled={pagination.current_page >= pagination.last_page}
            aria-label="Next page"
            className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
