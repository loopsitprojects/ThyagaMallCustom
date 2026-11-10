'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Printer,
  X,
  Loader2,
  Building2,
  Calendar,
  MapPin,
  Phone,
  Layers,
  ExternalLink,
  Check,
} from 'lucide-react';
import { api } from '@/services/api';
import { MerchantWaybill } from '@/types';

interface MerchantWaybillModalProps {
  orderId: number;
  orderNumber: string;
  onClose: () => void;
}

export default function MerchantWaybillModal({
  orderId,
  orderNumber,
  onClose,
}: MerchantWaybillModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waybills, setWaybills] = useState<MerchantWaybill[]>([]);
  const [selectedMerchantIndex, setSelectedMerchantIndex] = useState<number>(0);
  const [viewAll, setViewAll] = useState<boolean>(false);

  // Editable fields before printing
  const [deliveryDate, setDeliveryDate] = useState<string>('Within 24 hours');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('THYAGA OFFICE');
  const [dispatchContact, setDispatchContact] = useState<string>('JOY- 0710982629');
  const [storeAddress, setStoreAddress] = useState<string>('No.2 Sulaiman Terrace, Colombo 5');
  const [customerShippingAddress, setCustomerShippingAddress] = useState<string>('');

  useEffect(() => {
    const fetchWaybills = async () => {
      const token = localStorage.getItem('thyaga_admin_token') || '';
      if (!token) {
        setError('Admin session expired. Please log in again.');
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      try {
        const res = await api.getAdminOrderWaybills(token, orderId);
        if (res.success && res.data) {
          setWaybills(res.data.waybills || []);
          if (res.data.waybills?.[0]) {
            setDeliveryDate(res.data.waybills[0].delivery_date || 'Within 24 hours');
            setDeliveryAddress(res.data.waybills[0].delivery_address || 'THYAGA OFFICE');
            setDispatchContact(res.data.waybills[0].dispatch_contact || 'JOY- 0710982629');
            setStoreAddress(res.data.waybills[0].store_address || 'No.2 Sulaiman Terrace, Colombo 5');
          }
          if (res.data.order?.shipping_address) {
            setCustomerShippingAddress(
              `${res.data.order.shipping_address}, ${res.data.order.shipping_city || ''}`.trim()
            );
          }
        } else {
          setError('Failed to generate waybills for this order.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load waybills');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWaybills();
  }, [orderId]);

  // Which waybills to render
  const renderedWaybills = useMemo(() => {
    if (viewAll) {
      return waybills;
    }
    const current = waybills[selectedMerchantIndex];
    return current ? [current] : [];
  }, [waybills, selectedMerchantIndex, viewAll]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 waybill-modal-backdrop">
      <div className="bg-gray-100 rounded-2xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden border border-gray-300">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print bg-white px-5 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-[#36135d] flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                <span>Merchant Waybill Generator</span>
                <span className="text-xs bg-purple-100 text-[#36135d] px-2 py-0.5 rounded-full font-bold">
                  Order #{orderNumber}
                </span>
              </h2>
              <p className="text-[11px] text-gray-500">
                Generate separate order collection forms for partner merchants
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isLoading || waybills.length === 0}
              className="bg-[#36135d] hover:bg-[#4d1c83] text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-40 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{viewAll ? `Print All (${waybills.length})` : 'Print Waybill'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Merchant Selector Tabs (Hidden when printing) */}
        {!isLoading && waybills.length > 0 && (
          <div className="no-print bg-gray-50 px-5 py-2.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-gray-500 uppercase mr-1">Merchants:</span>
              {waybills.map((wb, idx) => {
                const isActive = !viewAll && selectedMerchantIndex === idx;
                return (
                  <button
                    key={wb.merchant.code || idx}
                    onClick={() => {
                      setViewAll(false);
                      setSelectedMerchantIndex(idx);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#36135d] text-white shadow-xs'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
                    }`}
                  >
                    <span>{wb.merchant.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {wb.items.length} {wb.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </button>
                );
              })}

              {waybills.length > 1 && (
                <button
                  onClick={() => setViewAll(true)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1 ${
                    viewAll
                      ? 'bg-[#36135d] text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>All Merchants ({waybills.length})</span>
                </button>
              )}
            </div>

            {/* Direct printable link */}
            <a
              href={`/admin/orders/${orderId}/waybill/${viewAll ? '' : (waybills[selectedMerchantIndex]?.merchant.id || '')}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#6d28d9] hover:text-[#5b21b6] font-bold text-[11px] flex items-center gap-1 ml-auto"
            >
              <span>Open in new tab</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Quick Customization Toolbar before printing (Hidden when printing) */}
        {!isLoading && waybills.length > 0 && (
          <div className="no-print bg-purple-50/70 border-b border-purple-100 px-5 py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
            {/* Delivery Date */}
            <div>
              <label className="block font-bold text-gray-700 mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#36135d]" />
                <span>Delivery Date</span>
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs font-semibold focus:outline-hidden focus:border-[#36135d]"
                />
              </div>
            </div>

            {/* Delivery Address */}
            <div>
              <label className="block font-bold text-gray-700 mb-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#36135d]" />
                <span>Delivery Address</span>
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs font-semibold focus:outline-hidden focus:border-[#36135d]"
                />
                {customerShippingAddress && (
                  <button
                    type="button"
                    title="Switch between THYAGA OFFICE and Customer Address"
                    onClick={() =>
                      setDeliveryAddress(
                        deliveryAddress === 'THYAGA OFFICE' ? customerShippingAddress : 'THYAGA OFFICE'
                      )
                    }
                    className="shrink-0 bg-white hover:bg-purple-100 text-purple-700 border border-purple-300 rounded px-1.5 py-1 text-[10px] font-bold"
                  >
                    Swap
                  </button>
                )}
              </div>
            </div>

            {/* Dispatcher Contact */}
            <div>
              <label className="block font-bold text-gray-700 mb-0.5 flex items-center gap-1">
                <Phone className="w-3 h-3 text-[#36135d]" />
                <span>Dispatch Contact</span>
              </label>
              <input
                type="text"
                value={dispatchContact}
                onChange={(e) => setDispatchContact(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs font-semibold focus:outline-hidden focus:border-[#36135d]"
              />
            </div>
          </div>
        )}

        {/* Modal Body / Waybill Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-200/60 printable-waybill-content">
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#36135d] mb-2" />
              <span className="text-xs font-semibold">Generating merchant waybills...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-semibold text-center">
              {error}
            </div>
          ) : waybills.length === 0 ? (
            <div className="p-16 text-center text-xs text-gray-400">
              No items or merchants found for this order.
            </div>
          ) : (
            <div className="space-y-6">
              {renderedWaybills.map((wb, index) => {
                const blankCount = Math.max(2, 10 - wb.items.length);

                return (
                  <div
                    key={`${wb.merchant.code}-${index}`}
                    className="waybill-paper-sheet bg-white max-w-[760px] mx-auto p-8 sm:p-12 rounded-sm shadow-md border border-gray-300 text-black font-mono select-text"
                    style={{ minHeight: '900px' }}
                  >
                    {/* Header: Logo and Title */}
                    <div className="text-center mb-2">
                      {/* Logo */}
                      <div className="flex justify-center mb-1">
                        <img
                          src="/thyaga/logo.png"
                          alt="Thyaga Mall"
                          className="h-12 w-auto object-contain mx-auto"
                          onError={(e) => {
                            // Fallback to /logo.png
                            (e.target as HTMLImageElement).src = '/logo.png';
                          }}
                        />
                      </div>
                      <h1 className="font-serif text-lg sm:text-xl font-bold tracking-[0.35em] text-gray-900 uppercase my-2">
                        O R D E R &nbsp; F O R M
                      </h1>
                    </div>

                    {/* Divider line */}
                    <div className="border-b-2 border-black mb-4"></div>

                    {/* Top Meta Details (2 Columns) */}
                    <div className="grid grid-cols-2 gap-4 text-xs font-bold uppercase mb-4 leading-relaxed tracking-tight">
                      {/* Left Column */}
                      <div className="space-y-1">
                        <div className="flex justify-between sm:justify-start sm:gap-4">
                          <span className="w-32 shrink-0">ORDER NO</span>
                          <span>{wb.order_no}</span>
                        </div>
                        <div className="flex justify-between sm:justify-start sm:gap-4">
                          <span className="w-32 shrink-0">MERCHANT -</span>
                          <span className="font-black">{wb.merchant.name}</span>
                        </div>
                        <div className="flex justify-between sm:justify-start sm:gap-4">
                          <span className="w-32 shrink-0">MERCHANT CODE</span>
                          <span>{wb.merchant.code}</span>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-1">
                        <div className="flex justify-between sm:justify-start sm:gap-4">
                          <span className="w-36 shrink-0">DATE:</span>
                          <span>{wb.date}</span>
                        </div>
                        <div className="flex justify-between sm:justify-start sm:gap-4">
                          <span className="w-36 shrink-0">DELIVERY DATE</span>
                          <span>{deliveryDate}</span>
                        </div>
                        <div className="flex justify-between sm:justify-start sm:gap-4">
                          <span className="w-36 shrink-0">DELIVERY ADDRESS</span>
                          <span className="truncate">{deliveryAddress}</span>
                        </div>
                      </div>
                    </div>

                    {/* Main Table */}
                    <div className="border-2 border-black mb-6">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-black font-bold uppercase text-black">
                            <th className="p-2 text-left border-r border-black w-[55%]">
                              ITEM
                            </th>
                            <th className="p-2 text-center border-r border-black w-[12%]">
                              QTY
                              <div className="text-[9px] -mt-1 tracking-tighter font-normal">---</div>
                            </th>
                            <th className="p-2 text-right border-r border-black w-[16%]">
                              PRICE
                              <div className="text-[9px] -mt-1 tracking-tighter font-normal">---</div>
                            </th>
                            <th className="p-2 text-right w-[17%]">
                              TOTAL
                              <div className="text-[9px] -mt-1 tracking-tighter font-normal">---</div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {wb.items.map((it, itemIdx) => (
                            <tr key={it.id || itemIdx} className="border-b border-gray-300">
                              <td className="p-2 border-r border-black font-semibold text-gray-900">
                                <div>{it.product_name}</div>
                                {it.sku && (
                                  <div className="text-[10px] text-gray-500 font-normal">
                                    SKU: {it.sku}
                                  </div>
                                )}
                              </td>
                              <td className="p-2 border-r border-black text-center font-bold">
                                {it.quantity}
                              </td>
                              <td className="p-2 border-r border-black text-right">
                                {Number(it.unit_price).toFixed(2)}
                              </td>
                              <td className="p-2 text-right font-bold">
                                {Number(it.total_price).toFixed(2)}
                              </td>
                            </tr>
                          ))}

                          {/* Ruled blank filler rows */}
                          {Array.from({ length: blankCount }).map((_, bIdx) => (
                            <tr key={`blank-${bIdx}`} className="border-b border-gray-200 h-7">
                              <td className="p-2 border-r border-black">&nbsp;</td>
                              <td className="p-2 border-r border-black">&nbsp;</td>
                              <td className="p-2 border-r border-black">&nbsp;</td>
                              <td className="p-2">&nbsp;</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Bottom Section: Pickup/Delivery Signatures & Totals */}
                      <div className="grid grid-cols-2 border-t border-black text-xs">
                        {/* Left Signatures */}
                        <div className="p-3 border-r border-black flex flex-col justify-center space-y-4">
                          <div className="flex items-baseline gap-2 font-bold">
                            <span className="shrink-0">{wb.pickup_label || 'Pickup-'}</span>
                            <span className="flex-1 border-b border-black inline-block h-2"></span>
                          </div>
                          <div className="flex items-baseline gap-2 font-bold">
                            <span className="shrink-0">{wb.delivery_label || 'Delivery-'}</span>
                            <span className="flex-1 border-b border-black inline-block h-2"></span>
                          </div>
                        </div>

                        {/* Right Totals */}
                        <div className="p-2.5 font-bold uppercase space-y-1">
                          <div className="flex justify-between">
                            <span>SUBTOTAL</span>
                            <span>{Number(wb.subtotal).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-gray-700">
                            <span>DELIVERY CHARGES</span>
                            <span>
                              {wb.delivery_charges > 0 ? Number(wb.delivery_charges).toFixed(2) : '-'}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-black pt-1.5 font-black text-sm text-black">
                            <span>GRAND TOTAL</span>
                            <span>{Number(wb.grand_total).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-tight text-gray-900 pt-2">
                      <div>{storeAddress}</div>
                      <div>{dispatchContact}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Scoped Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print,
          .waybill-modal-backdrop,
          header,
          footer,
          nav,
          aside {
            display: none !important;
          }
          .printable-waybill-content {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          .waybill-paper-sheet {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 15mm 12mm !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: always !important;
            break-inside: avoid !important;
          }
          .waybill-paper-sheet:last-child {
            page-break-after: auto !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
