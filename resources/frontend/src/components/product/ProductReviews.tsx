'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Clock, Loader2, MessageSquarePlus, Pencil, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/services/api';
import { ProductReview, ReviewSummary } from '@/types';
import { useAuth } from '@/context/AuthContext';
import StarRating from '@/components/product/StarRating';

interface ProductReviewsProps {
  slug: string;
}

const EMPTY_SUMMARY: ReviewSummary = { average: 0, count: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProductReviews({ slug }: ProductReviewsProps) {
  const { token, isAuthenticated } = useAuth();

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>(EMPTY_SUMMARY);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [myReview, setMyReview] = useState<ProductReview | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getProductReviews(slug, 1)
      .then((res) => {
        if (cancelled) return;
        setReviews(res.data);
        setSummary(res.summary);
        setLastPage(res.pagination.last_page);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api.getMyReview(token, slug)
      .then((res) => {
        if (!cancelled) setMyReview(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, slug]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      const res = await api.getProductReviews(slug, page + 1);
      setReviews((prev) => [...prev, ...res.data]);
      setPage(page + 1);
      setLastPage(res.pagination.last_page);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const startEditing = () => {
    setRating(myReview?.rating ?? 0);
    setTitle(myReview?.title ?? '');
    setComment(myReview?.comment ?? '');
    setFeedback(null);
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (rating === 0) {
      setFeedback({ type: 'error', message: 'Please choose a star rating.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.submitReview(token, slug, { rating, title: title.trim() || undefined, comment: comment.trim() });
      setMyReview(res.data);
      setIsEditing(false);
      setFeedback({ type: 'success', message: res.message });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Could not submit your review.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !window.confirm('Delete your review of this product?')) return;
    try {
      const res = await api.deleteMyReview(token, slug);
      setReviews((prev) => prev.filter((r) => r.id !== myReview?.id));
      setMyReview(null);
      setFeedback({ type: 'success', message: res.message });
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Could not delete your review.' });
    }
  };

  const loginHref = `/login?redirect=${encodeURIComponent(`/product/${slug}/`)}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Summary + write a review */}
      <div className="space-y-4">
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
          {summary.count > 0 ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl font-black text-gray-900">{summary.average.toFixed(1)}</span>
                <div>
                  <StarRating value={summary.average} />
                  <p className="text-xs text-gray-500 mt-0.5">
                    Based on {summary.count} review{summary.count === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const total = summary.distribution[stars] ?? 0;
                  return (
                    <div key={stars} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="w-6">{stars}★</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(total / summary.count) * 100}%` }} />
                      </div>
                      <span className="w-6 text-right text-gray-400">{total}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-2">
              <StarRating value={0} size="w-5 h-5" />
              <p className="text-sm font-bold text-gray-800 mt-2">No reviews yet</p>
              <p className="text-xs text-gray-500">Be the first to share your thoughts on this product.</p>
            </div>
          )}
        </div>

        {feedback && (
          <div className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {!isAuthenticated ? (
          <div className="p-4 rounded-xl border border-dashed border-purple-200 text-center">
            <p className="text-xs text-gray-600 mb-3">Bought this product? Sign in to leave a review.</p>
            <Link href={loginHref} className="inline-flex items-center gap-2 bg-[#36135d] hover:bg-[#a7144c] text-white text-xs font-bold px-4 py-2 rounded-lg transition">
              <MessageSquarePlus className="w-4 h-4" /> Sign in to write a review
            </Link>
          </div>
        ) : isEditing ? (
          <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-3">
            <p className="text-xs font-black text-[#36135d] uppercase tracking-wider">{myReview ? 'Edit your review' : 'Write a review'}</p>
            <StarRating value={rating} onChange={setRating} size="w-6 h-6" />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Headline (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-hidden focus:border-[#36135d]"
            />
            <div>
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you like or dislike? How was the quality and delivery?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-hidden focus:border-[#36135d]"
              />
              <p className="text-[10px] text-gray-400 text-right">{comment.trim().length}/2000 · at least 10 characters</p>
            </div>
            <p className="text-[11px] text-gray-500">Reviews are checked by our team before they appear.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-2 rounded-lg border border-gray-300 text-xs font-bold text-gray-700 hover:bg-white cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-[#36135d] hover:bg-[#a7144c] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-60 cursor-pointer">
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Submit review
              </button>
            </div>
          </form>
        ) : myReview ? (
          <div className="p-4 rounded-xl border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-gray-900">Your review</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${myReview.is_approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {myReview.is_approved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {myReview.is_approved ? 'Published' : 'Waiting for approval'}
              </span>
            </div>
            <StarRating value={myReview.rating} size="w-3.5 h-3.5" />
            {myReview.title && <p className="text-xs font-bold text-gray-800">{myReview.title}</p>}
            <p className="text-xs text-gray-600 line-clamp-3">{myReview.comment}</p>
            <div className="flex gap-2 pt-1">
              <button onClick={startEditing} className="text-xs font-bold text-[#6d28d9] hover:text-[#36135d] flex items-center gap-1 cursor-pointer">
                <Pencil className="w-3 h-3" /> Edit
              </button>
              <button onClick={handleDelete} className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </div>
        ) : (
          <button onClick={startEditing} className="w-full inline-flex items-center justify-center gap-2 bg-[#36135d] hover:bg-[#a7144c] text-white text-xs font-bold px-4 py-2.5 rounded-lg transition cursor-pointer">
            <MessageSquarePlus className="w-4 h-4" /> Write a review
          </button>
        )}
      </div>

      {/* Review list */}
      <div className="lg:col-span-2 space-y-3">
        {isLoading ? (
          <div className="py-10 flex items-center justify-center text-gray-400 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading reviews...
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-10 text-center text-xs text-gray-500 border border-dashed border-gray-200 rounded-xl">
            Customer reviews will appear here once they&apos;re approved.
          </div>
        ) : (
          <>
            {reviews.map((review) => (
              <article key={review.id} className="p-4 border border-gray-100 rounded-xl space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-900">{review.user_name}</span>
                      {review.is_verified_purchase && (
                        <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                          <BadgeCheck className="w-3.5 h-3.5" /> Verified Purchase
                        </span>
                      )}
                    </div>
                    <StarRating value={review.rating} size="w-3.5 h-3.5" />
                  </div>
                  <time className="text-[11px] text-gray-400 shrink-0">{formatDate(review.created_at)}</time>
                </div>
                {review.title && <p className="text-sm font-bold text-gray-800">{review.title}</p>}
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{review.comment}</p>
              </article>
            ))}
            {page < lastPage && (
              <button onClick={loadMore} disabled={isLoadingMore} className="w-full py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
                {isLoadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Load more reviews
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
