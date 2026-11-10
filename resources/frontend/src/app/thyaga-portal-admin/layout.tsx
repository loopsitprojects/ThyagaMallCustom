'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  MessageSquareText,
  FolderTree,
  GalleryHorizontalEnd,
  Megaphone,
  MapPin,
  BellRing,
  Flame,
  Package,
  Zap,
  ShoppingBag,
  Users,
  Activity,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Store,
  Award,
  Mail,
  MailCheck,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Admin } from '@/types';
import { getAssetUrl } from '@/utils/assets';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [adminUser, setAdminUser] = useState<Admin | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Strictly identify login route (never false-positive on dashboard or other admin routes)
  const isLoginPage = Boolean(
    pathname?.endsWith('/login') ||
    pathname?.endsWith('/login/') ||
    pathname === '/thyaga-portal-admin/login' ||
    pathname === '/thyaga-portal-admin/login/'
  );

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('thyaga_admin_token') : null;
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('thyaga_admin_user') : null;

    if (token) {
      setIsAuthenticated(true);
      if (userStr) {
        try {
          setAdminUser(JSON.parse(userStr));
        } catch {
          // ignore
        }
      }
    } else {
      setIsAuthenticated(false);
      setAdminUser(null);
      if (!isLoginPage) {
        router.replace('/thyaga-portal-admin/login/');
      }
    }
  }, [pathname, isLoginPage, router]);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('thyaga_admin_sidebar_collapsed') : null;
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('thyaga_admin_token');
    localStorage.removeItem('thyaga_admin_user');
    setIsAuthenticated(false);
    setAdminUser(null);
    setShowLogoutModal(false);
    router.replace('/thyaga-portal-admin/login/');
  };

  // If on login page, show ONLY the login section (no sidebar, no header)
  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center w-full p-4 sm:p-6">
        {children}
      </div>
    );
  }

  // If not logged in, redirecting to login (no sidebar, no header)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center w-full p-4 sm:p-6">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#36135d]" />
          <span className="text-xs font-semibold">Redirecting to login...</span>
        </div>
      </div>
    );
  }

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem('thyaga_admin_sidebar_collapsed', String(next));
        return next;
      });
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/thyaga-portal-admin/dashboard', icon: LayoutDashboard },
    { label: 'Products', href: '/thyaga-portal-admin/products', icon: Package },
    { label: 'Categories', href: '/thyaga-portal-admin/categories', icon: FolderTree },
    { label: 'Brands', href: '/thyaga-portal-admin/brands', icon: Award },
    { label: 'Merchants', href: '/thyaga-portal-admin/merchants', icon: Store },
    { label: 'Flash Sales', href: '/thyaga-portal-admin/flash-sales', icon: Zap, badge: 'HOT' },
    { label: 'Hero Slides', href: '/thyaga-portal-admin/hero-slides', icon: GalleryHorizontalEnd },
    { label: 'Homepage Sections', href: '/thyaga-portal-admin/home-sections', icon: Flame },
    { label: 'Onboarding Ad', href: '/thyaga-portal-admin/onboarding-ad', icon: Megaphone },
    { label: 'Orders', href: '/thyaga-portal-admin/orders', icon: ShoppingBag },
    { label: 'Store Pickup', href: '/thyaga-portal-admin/store-pickup', icon: MapPin },
    { label: 'Reviews', href: '/thyaga-portal-admin/reviews', icon: MessageSquareText },
    { label: 'Restock Alerts', href: '/thyaga-portal-admin/restock-alerts', icon: BellRing },
    { label: 'Customers', href: '/thyaga-portal-admin/users', icon: Users },
    { label: 'Subscribers', href: '/thyaga-portal-admin/subscribers', icon: Mail },
    { label: 'Administrators', href: '/thyaga-portal-admin/admins', icon: ShieldCheck },
    ...(adminUser?.role === 'super_admin' ? [{ label: 'Email Settings', href: '/thyaga-portal-admin/email-settings', icon: MailCheck }] : []),
    { label: 'Activity Logs', href: '/thyaga-portal-admin/activity-logs', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full">
      {/* Admin Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          {/* Universal Sidebar Toggle Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-gray-600 hover:text-[#36135d] hover:bg-gray-100 transition cursor-pointer"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/thyaga-portal-admin/dashboard" className="flex items-center gap-2">
            <Image
              src={getAssetUrl('/logo.png')}
              alt="thyāga mall"
              width={100}
              height={51}
              className="h-7 w-auto object-contain"
              priority
            />
            <span className="font-extrabold text-[11px] text-[#a7144c] tracking-wider uppercase bg-pink-50 border border-pink-100 px-2 py-0.5 rounded">
              Admin
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/"
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#36135d] font-semibold bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition"
          >
            <span>Live Storefront</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {/* Admin User Chip */}
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
            <ShieldCheck className="w-4 h-4 text-[#36135d]" />
            <span className="hidden sm:inline">{adminUser?.name || 'Administrator'}</span>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      <div className="flex-1 flex w-full">
        {/* Admin Sidebar Navigation */}
        <aside
          className={`
            fixed md:sticky top-0 md:top-[57px] inset-y-0 md:inset-auto left-0 z-50 md:z-30
            bg-white border-r border-gray-200 shrink-0
            h-screen md:h-[calc(100vh-57px)]
            flex flex-col justify-between
            transition-all duration-300 ease-in-out
            ${isMobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full md:translate-x-0'}
            ${isCollapsed ? 'md:w-20' : 'md:w-64'}
          `}
        >
          <div className="p-3 sm:p-4 flex flex-col h-full overflow-y-auto">
            {/* Mobile Header with Close Button */}
            <div className="flex md:hidden items-center justify-between pb-3 mb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Image
                  src={getAssetUrl('/logo.png')}
                  alt="thyāga mall"
                  width={90}
                  height={46}
                  className="h-6 w-auto object-contain"
                />
                <span className="font-extrabold text-[10px] text-[#a7144c] tracking-wider uppercase bg-pink-50 border border-pink-100 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Management Category Header */}
            {!isCollapsed ? (
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2 transition-opacity duration-200">
                Management
              </div>
            ) : (
              <div className="hidden md:block border-t border-gray-100 my-2 mx-2" />
            )}

            {/* Navigation links */}
            <nav className="space-y-1 flex-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                // Pages are exported with trailing slashes, so compare without them
                // and keep a section highlighted on its sub-pages too.
                const currentPath = (pathname || '').replace(/\/+$/, '');
                const isActive = currentPath === item.href || currentPath.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setIsMobileOpen(false)}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center rounded-xl text-xs font-semibold transition group relative ${
                      isCollapsed
                        ? 'md:justify-center md:px-0 py-2.5 px-3 justify-between'
                        : 'justify-between px-3.5 py-2.5'
                    } ${
                      isActive
                        ? 'bg-[#36135d] text-white shadow-xs'
                        : 'text-gray-700 hover:bg-purple-50 hover:text-[#36135d]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span
                        className={`whitespace-nowrap transition-opacity duration-200 ${
                          isCollapsed ? 'md:hidden inline' : 'inline'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>

                    {/* Full badge when expanded or on mobile */}
                    {item.badge && (
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                          isCollapsed ? 'md:hidden inline-block' : 'inline-block'
                        } ${
                          isActive ? 'bg-red-500 text-white' : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Dot indicator when collapsed on desktop */}
                    {isCollapsed && item.badge && (
                      <span className="hidden md:block absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                    )}

                    {/* Tooltip on hover when collapsed on desktop */}
                    {isCollapsed && (
                      <div className="hidden md:group-hover:flex absolute left-full ml-3 px-2.5 py-1 bg-gray-900 text-white text-[11px] font-semibold rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none items-center gap-1.5">
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="bg-red-500 text-white text-[9px] px-1 py-0.2 rounded-full font-black">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom Collapse Toggle Button (Desktop Only) */}
            <div className="hidden md:block pt-3 border-t border-gray-100 mt-auto">
              <button
                type="button"
                onClick={() => {
                  setIsCollapsed((prev) => {
                    const next = !prev;
                    localStorage.setItem('thyaga_admin_sidebar_collapsed', String(next));
                    return next;
                  });
                }}
                className={`w-full flex items-center gap-2 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-[#36135d] hover:bg-purple-50 transition cursor-pointer ${
                  isCollapsed ? 'justify-center px-1' : 'px-3'
                }`}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <>
                    <ChevronLeft className="w-4 h-4" />
                    <span>Collapse Sidebar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* Admin Page Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-site w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">Confirm Sign Out</h3>
                <p className="text-xs text-gray-500">End your administrative session</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to log out of Thyaga Mall Admin Portal? You will need to sign in again to access store management.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
