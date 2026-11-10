'use client';

import React, { useEffect, useState } from 'react';
import {
  MailCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BellRing,
  BellOff,
} from 'lucide-react';
import { api } from '@/services/api';
import { OrderEmailRecipient } from '@/types';

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-hidden focus:border-[#36135d] bg-white';

export default function AdminEmailSettingsPage() {
  const [recipients, setRecipients] = useState<OrderEmailRecipient[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const token = () => localStorage.getItem('thyaga_admin_token') || '';

  const notify = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 6000);
  };

  useEffect(() => {
    let cancelled = false;
    api.getEmailSettings(token())
      .then((res) => {
        if (cancelled) return;
        setRecipients(res.data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load email settings');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('add');
    try {
      const res = await api.addOrderEmailRecipient(token(), { email: newEmail, name: newName || undefined });
      setRecipients((list) => [...list, res.data].sort((a, b) => a.email.localeCompare(b.email)));
      setNewEmail('');
      setNewName('');
      notify('success', res.message);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not add the email');
    } finally {
      setBusy(null);
    }
  };

  const toggleRecipient = async (recipient: OrderEmailRecipient) => {
    setBusy(`r${recipient.id}`);
    try {
      const res = await api.setOrderEmailRecipientActive(token(), recipient.id, !recipient.is_active);
      setRecipients((list) => list.map((r) => (r.id === recipient.id ? res.data : r)));
      notify('success', res.message);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not update the email');
    } finally {
      setBusy(null);
    }
  };

  const removeRecipient = async (recipient: OrderEmailRecipient) => {
    if (!window.confirm(`Stop sending new order emails to ${recipient.email}?`)) return;
    setBusy(`r${recipient.id}`);
    try {
      const res = await api.deleteOrderEmailRecipient(token(), recipient.id);
      setRecipients((list) => list.filter((r) => r.id !== recipient.id));
      notify('success', res.message);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not remove the email');
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex items-center justify-center text-gray-400 text-xs gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading email settings...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4 rounded-xl border bg-red-50 border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2.5">
        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
        <span>{loadError}</span>
      </div>
    );
  }

  const activeCount = recipients.filter((r) => r.is_active).length;

  return (
    <div className="space-y-6">
      {/* Page Title & Main Header */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-purple-100 text-[#36135d] font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
            <MailCheck className="w-3 h-3" />
            <span>Notifications</span>
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900">Email Settings</h1>
        <p className="text-xs text-gray-500">
          Choose who gets an email when a new order comes in.
        </p>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span className="break-all">{feedback.message}</span>
        </div>
      )}

      <div className="max-w-3xl">
        {/* New order recipients */}
        <section className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-[#36135d]" /> New order emails
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Every address here gets the order details as soon as an order is placed (online payments: once the payment is confirmed).
            </p>
          </div>

          <form onSubmit={addRecipient} className="px-5 py-4 flex flex-col sm:flex-row gap-2 border-b border-gray-100">
            <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="orders@example.com" className={`${inputClass} sm:flex-[3]`} />
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name (optional)" maxLength={100} className={`${inputClass} sm:flex-[2]`} />
            <button type="submit" disabled={busy === 'add'} className="px-4 py-2 rounded-lg bg-[#36135d] hover:bg-[#4a1a80] text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0">
              {busy === 'add' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add
            </button>
          </form>

          {recipients.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">No emails added yet — new orders won&apos;t be emailed to anyone.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recipients.map((recipient) => (
                <li key={recipient.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${recipient.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{recipient.email}</p>
                    <p className="text-[11px] text-gray-400">{recipient.name || '—'}{!recipient.is_active && ' · paused'}</p>
                  </div>
                  <button
                    onClick={() => toggleRecipient(recipient)}
                    disabled={busy === `r${recipient.id}`}
                    title={recipient.is_active ? 'Pause emails' : 'Resume emails'}
                    className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                  >
                    {recipient.is_active ? <BellOff className="w-3.5 h-3.5" /> : <BellRing className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => removeRecipient(recipient)}
                    disabled={busy === `r${recipient.id}`}
                    title="Remove"
                    className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {recipients.length > 0 && (
            <div className="px-5 py-2.5 bg-gray-50 text-[11px] text-gray-500 border-t border-gray-100">
              {activeCount} of {recipients.length} receiving emails
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
