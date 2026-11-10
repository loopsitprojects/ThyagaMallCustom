import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { FlashSaleProvider } from '@/context/FlashSaleContext';
import StorefrontShell from '@/components/layout/StorefrontShell';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const poppins = Poppins({
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Thyaga Mall – Premier Online Shopping in Sri Lanka | Flash Deals & Vouchers',
  description: 'Shop authentic electronics, home essentials, beauty, and food products with Thyaga Gift Vouchers. Enjoy 24H flash deals and free islandwide shipping on orders over Rs. 2,999.',
  icons: {
    icon: [
      { url: '/thyaga/favicon.ico', sizes: 'any' },
      { url: '/thyaga/favicon.png', type: 'image/png', sizes: '32x32' },
      { url: '/thyaga/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [
      { url: '/thyaga/apple-touch-icon.png', sizes: '180x180' },
    ],
    shortcut: ['/thyaga/favicon.ico'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#f8f9fa] text-gray-900 font-sans">
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <FlashSaleProvider>
                <StorefrontShell>
                  {children}
                </StorefrontShell>
              </FlashSaleProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
