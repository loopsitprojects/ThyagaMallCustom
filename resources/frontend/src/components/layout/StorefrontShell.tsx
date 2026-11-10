'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import TopBar from '@/components/layout/TopBar';
import Header from '@/components/layout/Header';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BottomNavBar from '@/components/layout/BottomNavBar';
import CartDrawer from '@/components/cart/CartDrawer';
import Toast from '@/components/common/Toast';
import ScrollProgress from '@/components/motion/ScrollProgress';
import OnboardingAdPopup from '@/components/common/OnboardingAd';

export default function StorefrontShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/thyaga-portal-admin');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      {/* display:contents keeps the sticky header working; the wrappers only hide the site chrome when printing */}
      <div className="contents print:hidden">
        <ScrollProgress />
        <TopBar />
        <Header />
        <Navbar />
      </div>
      <main className="flex-1 max-w-site w-full mx-auto px-4 lg:px-6 py-4 sm:py-6 pb-20 md:pb-6 print:max-w-none print:p-0">
        {children}
      </main>
      <div className="contents print:hidden">
        <Footer />
        <BottomNavBar />
        <CartDrawer />
        <Toast />
        <OnboardingAdPopup />
      </div>
    </>
  );
}
