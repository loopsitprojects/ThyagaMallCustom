'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MessageSquareText,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  EyeOff,
  Trash2,
  BadgeCheck,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { api } from '@/services/api';
import { ProductReview } from '@/types';
import StarRating from '@/components/product/StarRating';

type StatusFilter = 'pending' | 'approved' | 'all';

const TABS: { key: StatusFilter; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'all', label: 'All' },
];

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, all: 0 });
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const token = () => localStorage.getItem('thyaga_admin_token') || '';

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  useEffect(() => {
    let cancelled = false;
    api.getAdminReviews(token(), { status, search: query || undefined, page })
      .then((res) => {
        if (cancelled) return;
        setReviews(res.data);
        setCounts(res.counts);
        setLastPage(res.pagination.last_page);
      })
      .catch((err) => {
        if (!cancelled) notify('error', err instanceof Error ? err.message : 'Failed to load reviews');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, query, page, reloadKey]);

  const changeTab = (next: StatusFilter) => {
    setIsLoading(true);
    setStatus(next);
    setPage(1);
  };

  const runSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setQuery(search.trim());
    setPage(1);
  };

  const setApproved = async (review: ProductReview, approved: boolean) => {
    setBusyId(review.id);
    try {
      const res = await api.setAdminReviewStatus(token(), review.id, approved);
      notify('success', res.message);
      setReloadKey((k) => k + 1);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not update the review');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (review: ProductReview) => {
    if (!window.confirm(`Delete ${review.user_name}'s review permanently?`)) return;
    setBusyId(review.id);
    try {
      const res = await api.deleteAdminReview(token(), review.id);
      notify('success', res.message);
      setReloadKey((k) => k + 1);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not delete the review');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Main Header */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-100 text-[#36135d] font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
              <MessageSquareText className="w-3 h-3" />
              <span>Customer Feedback</span>
            </span>
            {counts.pending > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {counts.pending} waiting for approval
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">Product Reviews</h1>
          <p className="text-xs text-gray-500">
            Approve customer reviews before they appear on product pages. Approved reviews update each product&apos;s star rating.
          </p>
        </div>

        <form onSubmit={runSearch} className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, customer or text"
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-hidden focus:border-[#36135d]"
          />
        </form>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        {/* Status tabs */}
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => changeTab(tab.key)}
              className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${status === tab.key ? 'border-[#36135d] text-[#36135d] bg-purple-50/50' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab.key === 'pending' && counts.pending > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center text-gray-400 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">
            {status === 'pending' ? 'No reviews waiting for approval. 🎉' : 'No reviews found.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {reviews.map((review) => (
              <li key={review.id} className="p-4 sm:p-5 flex flex-col md:flex-row gap-4">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StarRating value={review.rating} size="w-3.5 h-3.5" />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${review.is_approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {review.is_approved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {review.is_approved ? 'Published' : 'Pending'}
                    </span>
                    {review.is_verified_purchase && (
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                        <BadgeCheck className="w-3.5 h-3.5" /> Verified Purchase
                      </span>
                    )}
                  </div>
                  {review.title && <p className="text-sm font-bold text-gray-900">{review.title}</p>}
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{review.comment}</p>
                  <p className="text-[11px] text-gray-400">
                    <span className="font-semibold text-gray-600">{review.user_name}</span>
                    {review.user_email && <> · {review.user_email}</>}
                    {' · '}
                    {new Date(review.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  {review.product && (
                    <Link href={`/product/${review.product.slug}/`} target="_blank" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6d28d9] hover:text-[#36135d]">
                      {review.product.name} <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                <div className="flex md:flex-col items-stretch gap-2 shrink-0 md:w-32">
                  {review.is_approved ? (
                    <button onClick={() => setApproved(review, false)} disabled={busyId === review.id} className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer">
                      <EyeOff className="w-3.5 h-3.5" /> Hide
                    </button>
                  ) : (
                    <button onClick={() => setApproved(review, true)} disabled={busyId === review.id} className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer">
                      {busyId === review.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
                    </button>
                  )}
                  <button onClick={() => remove(review)} disabled={busyId === review.id} className="flex-1 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {lastPage > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-xs">
            <button onClick={() => { setIsLoading(true); setPage(page - 1); }} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-gray-300 font-bold disabled:opacity-40 cursor-pointer">Previous</button>
            <span className="text-gray-500">Page {page} of {lastPage}</span>
            <button onClick={() => { setIsLoading(true); setPage(page + 1); }} disabled={page >= lastPage} className="px-3 py-1.5 rounded-lg border border-gray-300 font-bold disabled:opacity-40 cursor-pointer">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
