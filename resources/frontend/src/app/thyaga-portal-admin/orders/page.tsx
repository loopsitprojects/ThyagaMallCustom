'use client';

import React, { useEffect, useState } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  X,
  Loader2,
  Eye,
  FileText,
  Printer,
} from 'lucide-react';
import { api } from '@/services/api';
import { Order } from '@/types';
import MerchantWaybillModal from '@/components/admin/MerchantWaybillModal';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected Order for Modal View
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [waybillOrder, setWaybillOrder] = useState<{ id: number; order_number: string } | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchOrders = async (page = 1) => {
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await api.getAdminOrders(token, {
        page,
        status: selectedStatus || undefined,
        search: search || undefined,
      });

      if (res.success) {
        setOrders(res.data);
        setPagination(res.pagination);
      }
    } catch {
      // error handling
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, [selectedStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders(1);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!activeOrder) return;
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) return;

    setStatusUpdating(true);
    try {
      const res = await api.updateAdminOrderStatus(token, activeOrder.id, newStatus);
      if (res.success) {
        setActiveOrder(res.data);
        setFeedback(`Order status changed to ${newStatus.toUpperCase()}`);
        fetchOrders(pagination.current_page);
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch {
      alert('Could not update order status');
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">Order Fulfillment</h1>
          <p className="text-xs text-gray-500">Track and dispatch customer orders across Sri Lanka</p>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex-1 max-w-md flex gap-2">
          <input
            type="text"
            placeholder="Search by order number or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d]"
          />
          <button
            type="submit"
            className="bg-gray-100 hover:bg-[#36135d] hover:text-white px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-xs rounded-lg px-3 py-2 focus:outline-hidden"
          >
            <option value="">All Orders</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#36135d] mb-2" />
              <span className="text-xs font-semibold">Loading orders...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-16 text-center text-xs text-gray-400">
              No orders found.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-b border-gray-100">
                <tr>
                  <th className="p-3">Order Number</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Destination</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-3 font-bold text-[#36135d]">{ord.order_number}</td>
                    <td className="p-3">
                      <div className="font-semibold text-gray-900">{ord.customer_name}</div>
                      <div className="text-[10px] text-gray-400">{ord.customer_phone}</div>
                    </td>
                    <td className="p-3 text-gray-600">
                      {ord.delivery_method === 'pickup' ? (
                        <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                          Store Pickup
                        </span>
                      ) : (
                        ord.shipping_city
                      )}
                    </td>
                    <td className="p-3 font-black text-gray-900">
                      Rs. {Number(ord.total).toLocaleString()}
                    </td>
                    <td className="p-3 uppercase font-semibold text-gray-600">{ord.payment_method}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        ord.order_status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                        ord.order_status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        ord.order_status === 'processing' ? 'bg-purple-100 text-purple-800' :
                        ord.order_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {ord.order_status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setWaybillOrder({ id: ord.id, order_number: ord.order_number })}
                          className="bg-purple-50 hover:bg-[#36135d] hover:text-white text-[#36135d] px-2.5 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1 border border-purple-200"
                          title="Generate Merchant Waybill"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Waybill</span>
                        </button>
                        <button
                          onClick={() => setActiveOrder(ord)}
                          className="bg-gray-100 hover:bg-gray-800 hover:text-white text-gray-700 px-2.5 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Manage</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination Bar */}
      {pagination.last_page > 1 && (
        <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between text-xs text-gray-600">
          <span>
            Page {pagination.current_page} of {pagination.last_page} ({pagination.total} total orders)
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagination.current_page <= 1}
              onClick={() => fetchOrders(pagination.current_page - 1)}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
            >
              Previous
            </button>
            <button
              disabled={pagination.current_page >= pagination.last_page}
              onClick={() => fetchOrders(pagination.current_page + 1)}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Order Detail & Status Transition Modal */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900">
                  Order Details: {activeOrder.order_number}
                </h3>
                <span className="text-[11px] text-gray-400">
                  Placed on {new Date(activeOrder.created_at).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setActiveOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Customer & Shipping Details */}
              <div className="bg-gray-50 p-3.5 rounded-xl space-y-1 text-gray-700">
                <div><strong>Customer:</strong> {activeOrder.customer_name}</div>
                <div><strong>Email:</strong> {activeOrder.customer_email}</div>
                <div><strong>Phone:</strong> {activeOrder.customer_phone}</div>
                <div>
                  <strong>{activeOrder.delivery_method === 'pickup' ? 'Store Pickup at:' : 'Shipping Address:'}</strong>{' '}
                  {activeOrder.shipping_address}, {activeOrder.shipping_city}
                </div>
                {activeOrder.notes && <div><strong>Notes:</strong> {activeOrder.notes}</div>}
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-bold text-gray-900 uppercase text-[10px] tracking-wider mb-2">
                  Purchased Items ({activeOrder.items?.length || 0})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {activeOrder.items?.map((it) => (
                    <div key={it.id || it.product_id} className="flex justify-between items-center p-2 border border-gray-100 rounded-lg">
                      <div>
                        <div className="font-bold text-gray-800">{it.product_name}</div>
                        <span className="text-gray-400">Qty: {it.quantity} &times; Rs. {Number(it.unit_price).toLocaleString()}</span>
                      </div>
                      <span className="font-bold text-gray-900">
                        Rs. {Number(it.total_price).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="pt-2 border-t border-gray-100 space-y-1 text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rs. {Number(activeOrder.subtotal).toLocaleString()}</span>
                </div>
                {Number(activeOrder.discount) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Voucher Discount:</span>
                    <span>- Rs. {Number(activeOrder.discount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>{activeOrder.delivery_method === 'pickup' ? 'Store Pickup:' : 'Delivery Fee:'}</span>
                  <span>Rs. {Number(activeOrder.shipping_fee).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-gray-900 pt-1 border-t border-gray-100">
                  <span>Total Payable:</span>
                  <span className="text-[#36135d]">
                    Rs. {Number(activeOrder.total).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Status Transition Control */}
              <div className="pt-3 border-t border-gray-100">
                <label className="block font-bold text-gray-800 mb-1.5">
                  Update Order Fulfillment Status:
                </label>
                <div className="flex items-center gap-2">
                  <select
                    disabled={statusUpdating}
                    value={activeOrder.order_status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="flex-1 bg-purple-50 border border-purple-200 text-xs font-bold text-[#36135d] rounded-lg px-3 py-2 focus:outline-hidden"
                  >
                    <option value="pending">Pending (Awaiting Confirmation)</option>
                    <option value="processing">Processing (Packing / Ready)</option>
                    <option value="shipped">Shipped (Handed to Courier)</option>
                    <option value="delivered">Delivered (Successfully Received)</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  {statusUpdating && <Loader2 className="w-4 h-4 animate-spin text-[#36135d]" />}
                </div>
              </div>

              {/* Waybill Button */}
              <div className="pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setWaybillOrder({ id: activeOrder.id, order_number: activeOrder.order_number });
                  }}
                  className="w-full bg-[#36135d] hover:bg-[#4d1c83] text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generate Merchant Waybill(s)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merchant Waybill Modal */}
      {waybillOrder && (
        <MerchantWaybillModal
          orderId={waybillOrder.id}
          orderNumber={waybillOrder.order_number}
          onClose={() => setWaybillOrder(null)}
        />
      )}
    </div>
  );
}
