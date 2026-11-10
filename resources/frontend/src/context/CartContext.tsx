'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE } from '@/utils/shipping';
import { CartItem, Product } from '@/types';
import { api } from '@/services/api';

interface AppliedVoucher {
  code: string;
  title: string;
  discount: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, flashPrice?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
  shippingFee: number;
  freeShippingThreshold: number;
  freeShippingRemaining: number;
  appliedVoucher: AppliedVoucher | null;
  voucherDiscount: number;
  total: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  applyVoucherCode: (code: string) => Promise<{ success: boolean; message: string }>;
  removeVoucher: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);


export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('thyaga_mall_cart');
      if (stored) {
        setItems(JSON.parse(stored));
      }
      const storedVoucher = localStorage.getItem('thyaga_mall_voucher');
      if (storedVoucher) {
        setAppliedVoucher(JSON.parse(storedVoucher));
      }
    } catch {
      // ignore parsing error
    }
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('thyaga_mall_cart', JSON.stringify(items));
    } catch {
      // ignore storage error
    }
  }, [items, isLoaded]);

  // Save voucher to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (appliedVoucher) {
        localStorage.setItem('thyaga_mall_voucher', JSON.stringify(appliedVoucher));
      } else {
        localStorage.removeItem('thyaga_mall_voucher');
      }
    } catch {
      // ignore
    }
  }, [appliedVoucher, isLoaded]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const addToCart = (product: Product, quantity = 1, flashPrice?: number) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      const unitPrice = flashPrice !== undefined
        ? flashPrice
        : (product.sale_price ? Number(product.sale_price) : Number(product.regular_price));

      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity, unitPrice }
            : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity,
          unitPrice,
          isFlashDeal: flashPrice !== undefined,
        },
      ];
    });

    showToast(`Added "${product.name.slice(0, 30)}..." to your cart!`);
    setIsDrawerOpen(true);
  };

  const removeFromCart = (productId: number) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  // Stable identity: the order-success page clears the cart from an effect that depends on it.
  const clearCart = useCallback(() => {
    setItems([]);
    setAppliedVoucher(null);
    localStorage.removeItem('thyaga_mall_cart');
    localStorage.removeItem('thyaga_mall_voucher');
  }, []);

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : STANDARD_SHIPPING_FEE;
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  const voucherDiscount = appliedVoucher ? appliedVoucher.discount : 0;
  const total = Math.max(0, subtotal - voucherDiscount + shippingFee);

  const applyVoucherCode = async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await api.applyVoucher(code, subtotal);
      if (res.success && res.data) {
        setAppliedVoucher({
          code: res.data.code,
          title: res.data.title,
          discount: res.data.discount,
        });
        showToast(res.message);
        return { success: true, message: res.message };
      }
      return { success: false, message: 'Invalid voucher' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not apply voucher';
      return { success: false, message: msg };
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    showToast('Thyaga voucher removed');
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        subtotal,
        shippingFee,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        freeShippingRemaining,
        appliedVoucher,
        voucherDiscount,
        total,
        isDrawerOpen,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
        applyVoucherCode,
        removeVoucher,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
