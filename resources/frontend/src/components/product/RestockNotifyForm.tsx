'use client';

import React, { useState } from 'react';
import { BellRing, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

/** Shown on out-of-stock products: leave an email to hear when the product returns. */
export default function RestockNotifyForm({ productSlug }: { productSlug: string }) {
  const { user } = useAuth();
  const [typedEmail, setTypedEmail] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const email = typedEmail ?? user?.email ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await api.requestRestockAlert(productSlug, email.trim());
      setSavedMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your email. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (savedMessage) {
    return (
      <div role="status" className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 mb-5">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <h4 className="text-xs font-bold text-emerald-900">You&apos;re on the list</h4>
          <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">{savedMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-purple-50/60 border border-purple-100 rounded-xl p-4 mb-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 rounded-lg bg-purple-100 text-[#36135d] shrink-0">
          <BellRing className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-900">Notify me when it&apos;s back</h4>
          <p className="text-[11px] text-gray-600 leading-relaxed">Enter your email and we&apos;ll let you know as soon as this product is restocked.</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          maxLength={255}
          value={email}
          onChange={(e) => setTypedEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Your email address"
          autoComplete="email"
          className="flex-1 min-w-0 px-3 py-2.5 border border-gray-300 rounded-lg text-xs bg-white focus:outline-hidden focus:border-[#36135d]"
        />
        <button
          type="submit"
          disabled={isSaving}
          className="bg-[#36135d] hover:bg-[#250b42] text-white text-xs font-bold px-5 py-2.5 rounded-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shrink-0"
        >
          {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>Notify Me</span>
        </button>
      </div>
      {error && <p role="alert" className="text-[11px] font-semibold text-red-600 mt-2">{error}</p>}
    </form>
  );
}
