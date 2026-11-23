'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import { getAssetUrl } from '@/utils/assets';
import PasswordInput from '@/components/common/PasswordInput';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('thyaga_admin_token') : null;
    if (token) {
      router.replace('/thyaga-portal-admin/dashboard/');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.adminLogin(email, password);
      if (res.success && res.token) {
        localStorage.setItem('thyaga_admin_token', res.token);
        localStorage.setItem('thyaga_admin_user', JSON.stringify(res.admin));
        router.replace('/thyaga-portal-admin/dashboard/');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid admin credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-xl p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <Image
            src={getAssetUrl('/logo.png')}
            alt="thyāga mall"
            width={160}
            height={81}
            className="h-12 w-auto object-contain mb-1"
            priority
          />
          <h1 className="text-xl font-black text-gray-900 tracking-tight">
            Admin Portal
          </h1>
          <p className="text-xs text-gray-500">
            Secure administrative control center for store operations, inventory & flash sales
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Admin Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your admin email"
                className="w-full pl-9 pr-3 py-2.5 text-xs border border-gray-300 rounded-xl focus:outline-hidden focus:border-[#36135d]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <PasswordInput
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 text-xs border border-gray-300 rounded-xl focus:outline-hidden focus:border-[#36135d]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#36135d] hover:bg-[#a7144c] text-white py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-gray-100">
          <Link
            href="/"
            className="text-xs font-semibold text-gray-500 hover:text-[#36135d] transition"
          >
            &larr; Back to Public Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
