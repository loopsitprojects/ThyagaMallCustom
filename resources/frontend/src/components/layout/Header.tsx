'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, ShoppingBag, Heart, User, ChevronDown, Package, LogOut } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { useCategories } from '@/hooks/useCategories';
import { getAssetUrl } from '@/utils/assets';

export default function Header() {
  const router = useRouter();
  const { cartCount, openDrawer } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, isAuthenticated, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { categories } = useCategories();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (searchTerm.trim()) query.append('search', searchTerm.trim());
    if (selectedCategory) query.append('category', selectedCategory);
    router.push(`/shop?${query.toString()}`);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-site mx-auto px-4 lg:px-6 py-3 flex items-center justify-between gap-4 md:gap-8">
        {/* Official Thyaga Mall Logo */}
        <Link href="/" className="shrink-0 flex items-center group">
          <Image
            src={getAssetUrl('/logo.png')}
            alt="thyāga mall"
            width={170}
            height={86}
            className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            priority
          />
        </Link>

        {/* Central Search Bar with Category Dropdown & Purple Button */}
        <form
          onSubmit={handleSearch}
          className="flex-1 max-w-2xl relative hidden sm:flex items-center rounded-lg border border-gray-300 focus-within:border-[#36135d] focus-within:ring-1 focus-within:ring-[#36135d] bg-white transition p-0.5"
        >
          {/* Category Dropdown */}
          <div className="relative border-r border-gray-200 bg-transparent shrink-0 flex items-center">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-transparent pl-3 pr-7 py-2 text-xs font-semibold text-gray-600 focus:outline-hidden cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <React.Fragment key={cat.id}>
                  <option value={cat.slug}>{cat.name}</option>
                  {cat.children?.map((sub) => (
                    <option key={sub.id} value={sub.slug}>
                      {'\u00A0\u00A0\u00A0'}{sub.name}
                    </option>
                  ))}
                </React.Fragment>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 pointer-events-none" />
          </div>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Search for products, brands and more..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden bg-transparent"
          />

          {/* Solid Deep Purple Search Button */}
          <button
            type="submit"
            className="bg-[#4a127a] hover:bg-[#36135d] text-white px-4 py-2.5 rounded-md transition flex items-center justify-center cursor-pointer shadow-xs"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>

        {/* Right Navigation Icons */}
        <div className="flex items-center gap-5 md:gap-7 shrink-0 text-gray-700">
          {/* Sign In / Account */}
          {isAuthenticated && user ? (
            <div className="relative group py-2">
              <Link
                href="/account"
                className="flex items-center gap-2 hover:text-[#36135d] transition"
              >
                <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 text-[#36135d] font-bold text-xs flex items-center justify-center shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:flex flex-col text-left leading-tight">
                  <span className="text-[10px] text-gray-400">Hi, {user.name.split(' ')[0]}</span>
                  <span className="text-xs font-bold text-gray-800 group-hover:text-[#36135d] flex items-center gap-0.5">
                    My Account <ChevronDown className="w-3 h-3 text-gray-400" />
                  </span>
                </div>
              </Link>

              {/* Dropdown Menu on Hover */}
              <div className="absolute right-0 top-full -mt-1 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-900 truncate">{user.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                </div>
                <Link
                  href="/account"
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-purple-50 hover:text-[#36135d] transition font-medium"
                >
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span>Account Dashboard</span>
                </Link>
                <Link
                  href="/account"
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-purple-50 hover:text-[#36135d] transition font-medium"
                >
                  <Package className="w-3.5 h-3.5 text-gray-400" />
                  <span>My Orders</span>
                </Link>
                <button
                  onClick={() => logout()}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition border-t border-gray-100 cursor-pointer text-left font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 hover:text-[#36135d] transition group"
            >
              <User className="w-5 h-5 text-gray-700 group-hover:text-[#36135d] transition" />
              <div className="hidden lg:flex flex-col text-left leading-tight">
                <span className="text-[10px] text-gray-400">Sign In</span>
                <span className="text-xs font-bold text-gray-800 group-hover:text-[#36135d]">Account</span>
              </div>
            </Link>
          )}

          {/* Wishlist */}
          <Link
            href="/wishlist"
            className="flex items-center gap-2 hover:text-[#36135d] transition group"
          >
            <div className="relative">
              <Heart className="w-5 h-5 text-gray-700 group-hover:text-[#e11d48] transition" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#e11d48] text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {wishlistCount}
                </span>
              )}
            </div>
            <div className="hidden lg:flex flex-col text-left leading-tight">
              <span className="text-[10px] text-gray-400">Wishlist</span>
              <span className="text-xs font-bold text-gray-800">My Items</span>
            </div>
          </Link>

          {/* My Cart */}
          <button
            onClick={openDrawer}
            className="flex items-center gap-2 hover:text-[#36135d] transition group cursor-pointer"
            aria-label="Shopping Cart"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5 text-gray-700 group-hover:text-[#36135d] transition" />
              <span className="absolute -top-1.5 -right-2 bg-[#e11d48] text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {cartCount}
              </span>
            </div>
            <div className="hidden lg:flex flex-col text-left leading-tight">
              <span className="text-[10px] text-gray-400">Shopping</span>
              <span className="text-xs font-bold text-gray-800 group-hover:text-[#36135d]">My Cart</span>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="sm:hidden px-4 pb-3">
        <form onSubmit={handleSearch} className="flex items-center rounded-lg border border-gray-300 p-1 bg-white">
          <input
            type="text"
            placeholder="Search for products, brands and more..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs text-gray-800 focus:outline-hidden"
          />
          <button type="submit" className="bg-[#4a127a] text-white p-2 rounded-md">
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </header>
  );
}
