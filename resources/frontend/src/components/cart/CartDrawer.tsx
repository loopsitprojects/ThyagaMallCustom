'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck, Tag, CheckCircle2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { getAssetUrl } from '@/utils/assets';

export default function CartDrawer() {
  const {
    items,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeFromCart,
    subtotal,
    shippingFee,
    freeShippingThreshold,
    freeShippingRemaining,
    appliedVoucher,
    voucherDiscount,
    total,
    applyVoucherCode,
    removeVoucher,
  } = useCart();

  const [voucherInput, setVoucherInput] = useState('');
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  if (!isDrawerOpen) return null;

  const handleApplyVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherInput.trim()) return;
    setIsApplying(true);
    setVoucherError(null);

    const res = await applyVoucherCode(voucherInput.trim());
    if (!res.success) {
      setVoucherError(res.message);
    } else {
      setVoucherInput('');
    }
    setIsApplying(false);
  };

  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#36135d] text-white">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <h2 className="text-base font-bold">Shopping Cart ({items.length})</h2>
            </div>
            <button
              onClick={closeDrawer}
              className="text-gray-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          <div className="bg-purple-50 p-3 border-b border-purple-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#36135d] mb-1.5">
              <Truck className="w-4 h-4 text-[#a7144c]" />
              {freeShippingRemaining > 0 ? (
                <span>
                  Add <strong className="text-[#a7144c]">Rs. {freeShippingRemaining.toLocaleString()}</strong> more to get <strong>FREE SHIPPING!</strong>
                </span>
              ) : (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Congratulations! You unlocked FREE SHIPPING!
                </span>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-linear-to-r from-[#36135d] to-[#a7144c] h-2 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-gray-800 mb-1">Your cart is empty</h3>
                <p className="text-xs text-gray-500 max-w-xs mb-6">
                  Explore thousands of authentic products and exclusive deals from Thyaga Mall.
                </p>
                <button
                  onClick={closeDrawer}
                  className="bg-[#36135d] hover:bg-[#a7144c] text-white text-xs font-bold py-2.5 px-6 rounded-lg transition"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex gap-3 pb-4 border-b border-gray-100 last:border-b-0"
                >
                  <div className="relative w-18 h-18 bg-gray-100 rounded-md overflow-hidden shrink-0 border border-gray-200">
                    <Image
                      src={getAssetUrl(item.product.primary_image || 'https://placehold.co/100x100/f3f4f6/36135d?text=Thyaga')}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                    {item.isFlashDeal && (
                      <span className="absolute top-0 right-0 bg-[#dc2626] text-white text-[8px] font-black px-1 py-0.5 rounded-bl uppercase">
                        ⚡ Flash
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <Link
                          href={`/product/${item.product.slug}`}
                          onClick={closeDrawer}
                          className="text-xs font-semibold text-gray-800 hover:text-[#36135d] line-clamp-2 transition leading-snug"
                        >
                          {item.product.name}
                        </Link>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-gray-400 hover:text-red-600 transition p-1 shrink-0"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-xs font-bold text-[#36135d] mt-1">
                        Rs. {item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity stepper */}
                      <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 hover:bg-gray-100 text-gray-600 transition cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="p-1 hover:bg-gray-100 text-gray-600 transition cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line total */}
                      <span className="text-xs font-semibold text-gray-700">
                        Total: Rs. {(item.unitPrice * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer / Checkout Area */}
          {items.length > 0 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50/50 space-y-3">
              {/* Voucher Code Form */}
              {appliedVoucher ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                    <Tag className="w-3.5 h-3.5" />
                    <span>{appliedVoucher.code} applied (-Rs. {voucherDiscount.toLocaleString()})</span>
                  </div>
                  <button
                    onClick={removeVoucher}
                    className="text-xs font-bold text-red-600 hover:text-red-700 underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyVoucher} className="space-y-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter Thyaga Voucher (e.g. THYAGA500)"
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-hidden focus:border-[#36135d] uppercase"
                    />
                    <button
                      type="submit"
                      disabled={isApplying || !voucherInput.trim()}
                      className="bg-[#36135d] hover:bg-[#a7144c] disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition cursor-pointer"
                    >
                      {isApplying ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                  {voucherError && (
                    <p className="text-[11px] text-red-600 font-medium">{voucherError}</p>
                  )}
                </form>
              )}

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-gray-600 pt-2 border-t border-gray-200">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-800">
                    Rs. {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {voucherDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Voucher Discount</span>
                    <span>- Rs. {voucherDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Shipping Fee</span>
                  {shippingFee === 0 ? (
                    <span className="font-bold text-emerald-600 uppercase">FREE</span>
                  ) : (
                    <span className="font-semibold text-gray-800">
                      Rs. {shippingFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>

                <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Estimated Total</span>
                  <span className="text-base text-[#36135d]">
                    Rs. {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Checkout CTA */}
              <div className="pt-2 space-y-2">
                <Link
                  href="/checkout"
                  onClick={closeDrawer}
                  className="w-full bg-[#a7144c] hover:bg-[#8c0f3f] text-white py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  onClick={closeDrawer}
                  className="w-full text-center text-xs font-semibold text-gray-500 hover:text-gray-800 py-1 transition cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
