'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Package,
  Store,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Percent,
  TrendingUp,
  Tag,
  SlidersHorizontal,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/services/api';
import { Product, Category, Merchant } from '@/types';
import { flattenCategoryTree } from '@/hooks/useCategories';
import { getAssetUrl } from '@/utils/assets';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [selectedMerchant, setSelectedMerchant] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectAllMatching, setSelectAllMatching] = useState(false);

  // Bulk Pricing Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<'discount' | 'regular_price' | 'both'>('discount');
  const [bulkRegularAction, setBulkRegularAction] = useState<'increase_percent' | 'decrease_percent' | 'increase_flat' | 'decrease_flat' | 'set_exact'>('increase_percent');
  const [bulkRegularValue, setBulkRegularValue] = useState<string>('10');
  const [bulkDiscountAction, setBulkDiscountAction] = useState<'set_percent' | 'set_flat_discount' | 'set_sale_price' | 'clear_discount'>('set_percent');
  const [bulkDiscountValue, setBulkDiscountValue] = useState<string>('15');
  const [bulkRoundTo, setBulkRoundTo] = useState<'none' | '1' | '10' | '50' | '100'>('1');
  const [bulkSaleHandling, setBulkSaleHandling] = useState<'keep_discount_percent' | 'keep_sale_price' | 'remove_sale_price'>('keep_discount_percent');
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // Export State
  const [isExporting, setIsExporting] = useState(false);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importUpdateExisting, setImportUpdateExisting] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreviewRows, setImportPreviewRows] = useState<any[]>([]);
  const [importTotalCount, setImportTotalCount] = useState<number>(0);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    imported: number;
    updated: number;
    skipped: number;
    errors?: string[];
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    merchant_id: '',
    sku: '',
    regular_price: '',
    sale_price: '',
    stock_quantity: '50',
    short_description: '',
    description: '',
    image_url: '',
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchProducts = async (page = 1) => {
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await api.getAdminProducts(token, {
        page,
        search: search || undefined,
        category_id: selectedCategory,
        merchant_id: selectedMerchant,
      });

      if (res.success) {
        setProducts(res.data);
        setPagination(res.pagination);
      }
    } catch {
      // error handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (token) {
      api.getAdminCategories(token).then((res) => {
        if (res.success) setCategories(res.data);
      });
      api.getAdminMerchants(token, { all: true }).then((res) => {
        if (res.success) setMerchants(res.data);
      });
    }
    fetchProducts(1);
  }, [selectedCategory, selectedMerchant]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(1);
  };

  // Selection helpers
  const isProductSelected = (id: number) => selectAllMatching || selectedIds.includes(id);

  const allPageSelected = useMemo(() => {
    return products.length > 0 && products.every((p) => selectedIds.includes(p.id));
  }, [products, selectedIds]);

  const somePageSelected = useMemo(() => {
    return products.some((p) => selectedIds.includes(p.id)) && !allPageSelected;
  }, [products, selectedIds, allPageSelected]);

  const selectedCount = selectAllMatching ? pagination.total : selectedIds.length;

  const toggleSelectAllPage = () => {
    if (allPageSelected || selectAllMatching) {
      setSelectedIds((prev) => prev.filter((id) => !products.some((p) => p.id === id)));
      setSelectAllMatching(false);
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...products.map((p) => p.id)])));
    }
  };

  const toggleSelectProduct = (id: number) => {
    if (selectAllMatching) {
      setSelectAllMatching(false);
      setSelectedIds(products.map((p) => p.id).filter((pid) => pid !== id));
    } else {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectAllMatching(false);
  };

  const selectAllMatchingItems = () => {
    setSelectAllMatching(true);
    setSelectedIds(products.map((p) => p.id));
  };

  const openBulkModal = (target: 'discount' | 'regular_price' | 'both' = 'discount') => {
    if (selectedCount === 0 && products.length > 0) {
      setSelectedIds(products.map((p) => p.id));
    }
    setBulkTarget(target);
    setIsBulkModalOpen(true);
  };

  // Live calculation preview
  const calculateNewPrices = (regularPrice: number, salePrice: number | null) => {
    let newRegular = regularPrice;
    let newSale = salePrice;

    const roundVal = (v: number) => {
      if (bulkRoundTo === '1') return Math.round(v);
      if (bulkRoundTo === '10') return Math.round(v / 10) * 10;
      if (bulkRoundTo === '50') return Math.round(v / 50) * 50;
      if (bulkRoundTo === '100') return Math.round(v / 100) * 100;
      return Math.round(v * 100) / 100;
    };

    // 1. Regular Price adjustment
    if (bulkTarget === 'regular_price' || bulkTarget === 'both') {
      const regVal = parseFloat(bulkRegularValue) || 0;
      if (bulkRegularAction === 'increase_percent') {
        newRegular = regularPrice * (1 + regVal / 100);
      } else if (bulkRegularAction === 'decrease_percent') {
        newRegular = Math.max(0, regularPrice * (1 - regVal / 100));
      } else if (bulkRegularAction === 'increase_flat') {
        newRegular = regularPrice + regVal;
      } else if (bulkRegularAction === 'decrease_flat') {
        newRegular = Math.max(0, regularPrice - regVal);
      } else if (bulkRegularAction === 'set_exact') {
        newRegular = Math.max(0, regVal);
      }
      newRegular = roundVal(newRegular);

      if (bulkTarget === 'regular_price') {
        if (bulkSaleHandling === 'remove_sale_price') {
          newSale = null;
        } else if (bulkSaleHandling === 'keep_discount_percent' && salePrice !== null && regularPrice > 0) {
          const discountRatio = (regularPrice - salePrice) / regularPrice;
          if (discountRatio > 0 && discountRatio < 1) {
            newSale = roundVal(Math.max(0, newRegular * (1 - discountRatio)));
          } else {
            newSale = null;
          }
        } else if (bulkSaleHandling === 'keep_sale_price' && salePrice !== null) {
          if (salePrice >= newRegular) {
            newSale = null;
          }
        }
      }
    }

    // 2. Discount adjustment
    if (bulkTarget === 'discount' || bulkTarget === 'both') {
      const discVal = parseFloat(bulkDiscountValue) || 0;
      if (bulkDiscountAction === 'set_percent') {
        newSale = Math.max(0, newRegular * (1 - discVal / 100));
      } else if (bulkDiscountAction === 'set_flat_discount') {
        newSale = Math.max(0, newRegular - discVal);
      } else if (bulkDiscountAction === 'set_sale_price') {
        newSale = Math.max(0, discVal);
      } else if (bulkDiscountAction === 'clear_discount') {
        newSale = null;
      }

      if (newSale !== null) {
        newSale = roundVal(newSale);
        if (newSale >= newRegular || newSale <= 0) {
          newSale = null;
        }
      }
    }

    const discountPercent =
      newSale !== null && newRegular > 0 && newSale < newRegular
        ? Math.round(((newRegular - newSale) / newRegular) * 100)
        : null;

    return { newRegular, newSale, discountPercent };
  };

  const previewProducts = useMemo(() => {
    if (selectedIds.length > 0) {
      const matched = products.filter((p) => selectedIds.includes(p.id));
      if (matched.length > 0) return matched.slice(0, 3);
    }
    return products.slice(0, 3);
  }, [products, selectedIds]);

  const handleApplyBulkPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) {
      alert('Admin session expired. Please sign in again.');
      return;
    }

    const count = selectAllMatching ? pagination.total : selectedIds.length;
    if (count === 0) {
      alert('Please select at least one product to update.');
      return;
    }

    if (count > 25 && !confirm(`Are you sure you want to update prices for ${count} products?`)) {
      return;
    }

    setIsBulkSubmitting(true);
    try {
      const payload: any = {
        target: bulkTarget,
        round_to: bulkRoundTo,
      };

      if (selectAllMatching) {
        payload.select_all_matching = true;
        payload.filters = {
          search: search || undefined,
          category_id: selectedCategory,
          merchant_id: selectedMerchant,
        };
      } else {
        payload.product_ids = selectedIds;
      }

      if (bulkTarget === 'regular_price' || bulkTarget === 'both') {
        payload.regular_action = bulkRegularAction;
        payload.regular_value = parseFloat(bulkRegularValue) || 0;
        if (bulkTarget === 'regular_price') {
          payload.sale_price_handling = bulkSaleHandling;
        }
      }

      if (bulkTarget === 'discount' || bulkTarget === 'both') {
        payload.discount_action = bulkDiscountAction;
        payload.discount_value = parseFloat(bulkDiscountValue) || 0;
      }

      const res = await api.bulkPricingAdminProducts(token, payload);
      if (res.success) {
        setFeedback(res.message || `Successfully updated ${res.updated_count} products.`);
        setIsBulkModalOpen(false);
        clearSelection();
        fetchProducts(pagination.current_page);
        setTimeout(() => setFeedback(null), 4000);
      } else {
        alert(res.message || 'Bulk pricing failed');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to apply bulk pricing');
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category_id: categories[0]?.id.toString() || '',
      merchant_id: '',
      sku: '',
      regular_price: '',
      sale_price: '',
      stock_quantity: '50',
      short_description: '',
      description: '',
      image_url: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category_id: p.category_id ? p.category_id.toString() : '',
      merchant_id: p.merchant_id ? p.merchant_id.toString() : '',
      sku: p.sku || '',
      regular_price: p.regular_price.toString(),
      sale_price: p.sale_price ? p.sale_price.toString() : '',
      stock_quantity: p.stock_quantity.toString(),
      short_description: p.short_description || '',
      description: p.description || '',
      image_url: p.primary_image || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) return;

    setModalLoading(true);
    try {
      const payload: any = {
        name: formData.name,
        category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
        merchant_id: formData.merchant_id ? parseInt(formData.merchant_id, 10) : null,
        sku: formData.sku || undefined,
        regular_price: parseFloat(formData.regular_price),
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        stock_quantity: parseInt(formData.stock_quantity, 10),
        short_description: formData.short_description || undefined,
        description: formData.description || undefined,
        image_url: formData.image_url || undefined,
      };

      if (editingProduct) {
        await api.updateAdminProduct(token, editingProduct.id, payload);
        setFeedback('Product updated successfully!');
      } else {
        await api.createAdminProduct(token, payload);
        setFeedback('Product added to catalog successfully!');
      }

      setIsModalOpen(false);
      fetchProducts(pagination.current_page);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error saving product');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this product?')) return;
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) return;

    try {
      await api.deleteAdminProduct(token, id);
      setFeedback('Product deleted.');
      fetchProducts(pagination.current_page);
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      alert('Failed to delete product');
    }
  };

  const handleExport = async () => {
    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) return;

    setIsExporting(true);
    try {
      const blob = await api.exportAdminProductsCsv(token, {
        category_id: selectedCategory,
        merchant_id: selectedMerchant,
        search: search || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `thyaga_products_${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setFeedback('Products exported to CSV successfully!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await api.getAdminProductsSampleTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'thyaga_products_sample_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      const csvContent =
        'Name,SKU,Category,Merchant,Regular Price,Sale Price,Stock Quantity,Short Description,Description,Image URL,Is Featured,Is Active\n' +
        '"Premium Wireless Bluetooth Earbuds","THY-EAR-001","Electronics","","4500.00","3990.00","100","Crystal-clear audio with deep bass","Experience superior sound with 30-hour battery life.","https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800","1","1"\n' +
        '"Pure Ceylon Organic Green Tea 100g","THY-TEA-002","Food","","1200.00","","75","Single-origin Ceylon green tea","Handpicked from Nuwara Eliya estates.","https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800","0","1"';
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'thyaga_products_sample_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportResult(null);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        setImportError('The selected CSV file appears to be empty or contains only headers.');
        setImportPreviewRows([]);
        setImportTotalCount(0);
        return;
      }

      const rawHeaders = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
      const cleanHeaders = rawHeaders.map((h) =>
        h.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
      );

      const preview: any[] = [];
      for (let i = 1; i < Math.min(lines.length, 6); i++) {
        const values: string[] = [];
        let curr = '';
        let inQuotes = false;
        for (let j = 0; j < lines[i].length; j++) {
          const char = lines[i][j];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(curr.trim());
            curr = '';
          } else {
            curr += char;
          }
        }
        values.push(curr.trim());

        const rowObj: any = {};
        cleanHeaders.forEach((key, idx) => {
          rowObj[key] = (values[idx] || '').replace(/^["']|["']$/g, '');
        });
        preview.push(rowObj);
      }

      setImportTotalCount(lines.length - 1);
      setImportPreviewRows(preview);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!importFile) {
      setImportError('Please choose a CSV file to import.');
      return;
    }

    const token = localStorage.getItem('thyaga_admin_token') || '';
    if (!token) {
      setImportError('Admin session expired. Please sign in again.');
      return;
    }

    setImportLoading(true);
    setImportError(null);
    setImportResult(null);

    try {
      const res = await api.importAdminProducts(token, importFile, importUpdateExisting);
      setImportResult(res);
      setFeedback(`Import completed: ${res.imported} added, ${res.updated} updated.`);
      setTimeout(() => setFeedback(null), 4000);
      fetchProducts(1);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Action Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">Product Management</h1>
          <p className="text-xs text-gray-500">Manage {pagination.total || 400}+ real Thyaga Mall catalog items, prices & inventory</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Bulk Pricing Button */}
          <button
            type="button"
            onClick={() => openBulkModal('discount')}
            className="bg-purple-50 hover:bg-purple-100 text-[#36135d] border border-purple-200 text-xs font-bold px-3.5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-2xs cursor-pointer"
            title="Bulk adjust discounts and regular prices"
          >
            <Percent className="w-4 h-4 text-[#a7144c]" />
            <span>Bulk Pricing & Discounts{selectedCount > 0 ? ` (${selectedCount})` : ''}</span>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400 text-xs font-bold px-3.5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Export filtered or all products to CSV"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#36135d]" />
            ) : (
              <Download className="w-4 h-4 text-[#36135d]" />
            )}
            <span>Export CSV</span>
          </button>

          {/* Import Products Button */}
          <button
            type="button"
            onClick={() => {
              setIsImportModalOpen(true);
              setImportFile(null);
              setImportPreviewRows([]);
              setImportResult(null);
              setImportError(null);
            }}
            className="bg-purple-50 hover:bg-purple-100 text-[#36135d] border border-purple-200 text-xs font-bold px-3.5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-2xs cursor-pointer"
            title="Import products from a CSV spreadsheet"
          >
            <Upload className="w-4 h-4 text-[#36135d]" />
            <span>Import CSV</span>
          </button>

          {/* Add New Product Button */}
          <button
            type="button"
            onClick={openCreateModal}
            className="bg-[#36135d] hover:bg-[#a7144c] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex-1 max-w-md flex gap-2">
          <input
            type="text"
            placeholder="Search by product name or SKU..."
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

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Category:</span>
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value, 10) : undefined)}
              className="bg-gray-50 border border-gray-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-hidden"
            >
              <option value="">All Categories</option>
              {flattenCategoryTree(categories).map(({ category: c, depth }) => (
                <option key={c.id} value={c.id}>
                  {'\u00A0\u00A0\u00A0'.repeat(depth)}{c.name}{c.is_active ? '' : ' (hidden)'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Merchant:</span>
            <select
              value={selectedMerchant || ''}
              onChange={(e) => setSelectedMerchant(e.target.value ? parseInt(e.target.value, 10) : undefined)}
              className="bg-gray-50 border border-gray-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-hidden"
            >
              <option value="">All Merchants</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Selection Action Banner */}
      {selectedCount > 0 && (
        <div className="bg-gradient-to-r from-[#36135d] via-[#4a187a] to-[#a7144c] text-white p-3.5 sm:p-4 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5 text-pink-200" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black flex items-center gap-2">
                <span>{selectedCount} product{selectedCount === 1 ? '' : 's'} selected</span>
                {selectAllMatching ? (
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    All matching filtered catalog
                  </span>
                ) : (
                  <span className="bg-white/15 text-purple-100 text-[10px] font-medium px-2 py-0.5 rounded-full">
                    Page selection
                  </span>
                )}
              </div>
              <p className="text-[11px] text-purple-200">
                Bulk add discounts or increase regular prices for selected items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => openBulkModal('discount')}
              className="bg-white hover:bg-pink-50 text-[#36135d] font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Percent className="w-3.5 h-3.5 text-[#a7144c]" />
              <span>Add / Manage Discounts</span>
            </button>

            <button
              type="button"
              onClick={() => openBulkModal('regular_price')}
              className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 border border-white/20 cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
              <span>Adjust Regular Prices</span>
            </button>

            <button
              type="button"
              onClick={() => openBulkModal('both')}
              className="bg-[#a7144c] hover:bg-[#85103c] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs border border-pink-400/40 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Combined Pricing</span>
            </button>

            <button
              type="button"
              onClick={clearSelection}
              className="text-purple-200 hover:text-white text-xs font-semibold px-2 py-1 transition cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        {/* Select-All-Matching Banner across entire catalog */}
        {allPageSelected && pagination.total > products.length && (
          <div className="bg-purple-50/90 border-b border-purple-200 px-4 py-2.5 text-xs text-[#36135d] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-[#36135d] shrink-0" />
              <span>
                {selectAllMatching
                  ? `All ${pagination.total} products matching current filters are selected.`
                  : `All ${products.length} products on this page are selected.`}
              </span>
            </div>
            {!selectAllMatching ? (
              <button
                type="button"
                onClick={selectAllMatchingItems}
                className="text-[#a7144c] font-black underline hover:no-underline cursor-pointer"
              >
                Select all {pagination.total} products matching current filter
              </button>
            ) : (
              <button
                type="button"
                onClick={clearSelection}
                className="text-gray-600 font-semibold underline hover:no-underline cursor-pointer"
              >
                Clear selection
              </button>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#36135d] mb-2" />
              <span className="text-xs font-semibold">Loading catalog items...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="p-16 text-center text-xs text-gray-400">
              No products found matching your search.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] border-b border-gray-100">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = somePageSelected;
                      }}
                      onChange={toggleSelectAllPage}
                      className="w-4 h-4 rounded border-gray-300 text-[#36135d] focus:ring-[#36135d] cursor-pointer"
                      title={allPageSelected ? 'Deselect all on this page' : 'Select all on this page'}
                    />
                  </th>
                  <th className="p-3 w-16">Image</th>
                  <th className="p-3">Product Name & SKU</th>
                  <th className="p-3">Category & Merchant</th>
                  <th className="p-3">Regular Price</th>
                  <th className="p-3">Sale Price</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => {
                  const isSelected = isProductSelected(p.id);
                  const regNum = Number(p.regular_price);
                  const saleNum =
                    p.sale_price !== null && p.sale_price !== undefined ? Number(p.sale_price) : null;
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50/70 transition ${
                        isSelected ? 'bg-purple-50/60' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectProduct(p.id)}
                          className="w-4 h-4 rounded border-gray-300 text-[#36135d] focus:ring-[#36135d] cursor-pointer"
                        />
                      </td>
                      <td className="p-3">
                        <div className="relative w-10 h-10 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                          <Image
                            src={getAssetUrl(p.primary_image || 'https://placehold.co/100x100?text=Item')}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        </div>
                      </td>
                      <td className="p-3 max-w-xs">
                        <div className="font-bold text-gray-900 line-clamp-1">{p.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">SKU: {p.sku || `THY-${p.id}`}</div>
                      </td>
                      <td className="p-3">
                        <span className="bg-purple-50 text-[#36135d] font-semibold px-2 py-0.5 rounded text-[10px] inline-block mb-0.5">
                          {p.category?.name || 'General'}
                        </span>
                        {p.merchant && (
                          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                            <Store className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{p.merchant.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-gray-700">
                        Rs. {regNum.toLocaleString()}
                      </td>
                      <td className="p-3">
                        {saleNum !== null ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[#a7144c] font-bold">
                              Rs. {saleNum.toLocaleString()}
                            </span>
                            {regNum > saleNum && (
                              <span className="text-[9px] font-black bg-pink-50 text-[#a7144c] px-1.5 py-0.2 rounded border border-pink-200">
                                {Math.round(((regNum - saleNum) / regNum) * 100)}% OFF
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`font-bold ${p.stock_quantity <= 5 ? 'text-red-600' : 'text-emerald-700'}`}>
                          {p.stock_quantity} units
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-gray-600 hover:text-[#36135d] hover:bg-purple-50 rounded transition cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {pagination.last_page > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Page {pagination.current_page} of {pagination.last_page} ({pagination.total} total items)
            </span>
            <div className="flex gap-1">
              <button
                disabled={pagination.current_page <= 1}
                onClick={() => fetchProducts(pagination.current_page - 1)}
                className="p-1.5 rounded border border-gray-200 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.current_page >= pagination.last_page}
                onClick={() => fetchProducts(pagination.current_page + 1)}
                className="p-1.5 rounded border border-gray-200 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import Products Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#36135d] flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Import Products (Bulk CSV)</h3>
                  <p className="text-xs text-gray-500">Upload a spreadsheet of products to bulk insert or update</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <span>Pre-formatted CSV Template</span>
                  <span className="text-[10px] bg-purple-100 text-[#36135d] px-1.5 py-0.2 rounded font-semibold">Recommended</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Includes required columns: Name, SKU, Category, Price, Stock, Image URL, etc.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-xs font-bold text-[#36135d] bg-white hover:bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample CSV</span>
              </button>
            </div>

            {/* File Upload Zone */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Select CSV File</label>
              <div className="border-2 border-dashed border-gray-300 hover:border-[#36135d] rounded-xl p-5 text-center transition bg-gray-50/50 hover:bg-purple-50/20">
                <input
                  type="file"
                  id="csv-file-input"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="csv-file-input"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-gray-400 hover:text-[#36135d] transition" />
                  <div>
                    <span className="text-xs font-bold text-[#36135d] hover:underline">
                      Click to choose file
                    </span>{' '}
                    <span className="text-xs text-gray-500">or drag and drop</span>
                  </div>
                  <p className="text-[11px] text-gray-400">CSV file up to 10MB</p>
                </label>
              </div>

              {importFile && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-lg text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold truncate">{importFile.name}</span>
                    <span className="text-emerald-600 text-[10px]">({Math.round(importFile.size / 1024)} KB)</span>
                  </div>
                  {importTotalCount > 0 && (
                    <span className="font-bold text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                      {importTotalCount} items detected
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Options */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="update-existing-checkbox"
                checked={importUpdateExisting}
                onChange={(e) => setImportUpdateExisting(e.target.checked)}
                className="rounded border-gray-300 text-[#36135d] focus:ring-[#36135d] cursor-pointer"
              />
              <label htmlFor="update-existing-checkbox" className="text-xs font-medium text-gray-700 cursor-pointer">
                Update existing products if product with matching SKU is found
              </label>
            </div>

            {/* Preview of rows if available */}
            {importPreviewRows.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between">
                  <span>File Preview (First {importPreviewRows.length} rows)</span>
                  <span className="text-gray-400 font-normal">Total: {importTotalCount}</span>
                </div>
                <div className="max-h-36 overflow-x-auto overflow-y-auto border border-gray-200 rounded-lg text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-gray-100 text-gray-600 sticky top-0">
                      <tr>
                        <th className="p-2">Name</th>
                        <th className="p-2">SKU</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">Price</th>
                        <th className="p-2">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {importPreviewRows.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="p-2 font-medium text-gray-900 truncate max-w-[140px]">{r.name || r.product_name || '-'}</td>
                          <td className="p-2 font-mono text-gray-500">{r.sku || '-'}</td>
                          <td className="p-2 text-gray-600">{r.category || '-'}</td>
                          <td className="p-2 font-semibold">Rs. {r.regular_price || r.price || '-'}</td>
                          <td className="p-2 text-gray-600">{r.stock_quantity || '50'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Error Message */}
            {importError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Result Summary */}
            {importResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{importResult.message}</span>
                </div>
                <div className="text-[11px] text-emerald-700 flex gap-4">
                  <span>Added: <strong>{importResult.imported}</strong></span>
                  <span>Updated: <strong>{importResult.updated}</strong></span>
                  <span>Skipped: <strong>{importResult.skipped}</strong></span>
                </div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-2 text-[10px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                    <span className="font-bold">Warnings:</span>
                    <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition cursor-pointer"
              >
                {importResult ? 'Close' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={importLoading || !importFile}
                className="px-5 py-2 bg-[#36135d] hover:bg-[#a7144c] text-white rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {importLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Import...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>{importResult ? 'Import More' : 'Start Import'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {editingProduct ? 'Edit Product Details' : 'Add New Product to Catalog'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:border-[#36135d]"
                  placeholder="e.g. Stainless Steel Food Chopper 2L"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden"
                  >
                    <option value="">Select Category</option>
                    {flattenCategoryTree(categories).map(({ category: c, depth }) => (
                      <option key={c.id} value={c.id}>
                        {'\u00A0\u00A0\u00A0'.repeat(depth)}{c.name}{c.is_active ? '' : ' (hidden)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Merchant Partner</label>
                  <select
                    value={formData.merchant_id}
                    onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden"
                  >
                    <option value="">No Merchant (Store)</option>
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg uppercase"
                    placeholder="THY-XXXX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Regular Price (Rs.) *</label>
                  <input
                    type="number"
                    required
                    value={formData.regular_price}
                    onChange={(e) => setFormData({ ...formData, regular_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="2500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Sale Price (Rs.)</label>
                  <input
                    type="number"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Stock Units *</label>
                  <input
                    type="number"
                    required
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Product specs and details..."
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 bg-[#36135d] hover:bg-[#a7144c] text-white rounded-lg font-bold transition disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Pricing & Discount Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#36135d] via-[#4d1685] to-[#a7144c] text-white p-5 sm:p-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                  <Percent className="w-5 h-5 text-pink-200" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">Bulk Price & Discount Manager</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {selectedCount} product{selectedCount === 1 ? '' : 's'} selected
                    </span>
                    <span className="text-purple-200 text-xs">
                      {selectAllMatching ? 'Across entire matching catalog' : 'From current selection'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope / Selection Notice */}
            <div className="bg-purple-50/80 px-6 py-2.5 border-b border-purple-100 flex items-center justify-between text-xs text-[#36135d]">
              <span className="font-medium">
                {selectAllMatching
                  ? `Applying to ALL ${pagination.total} products matching current search & category filters.`
                  : `Applying to ${selectedIds.length} specifically selected product(s).`}
              </span>
              {pagination.total > selectedIds.length && (
                <button
                  type="button"
                  onClick={() => setSelectAllMatching(!selectAllMatching)}
                  className="text-[#a7144c] font-black underline hover:no-underline cursor-pointer"
                >
                  {selectAllMatching
                    ? `Switch to page selection only (${selectedIds.length} items)`
                    : `Apply to all ${pagination.total} items instead`}
                </button>
              )}
            </div>

            {/* Modal Content Form */}
            <form onSubmit={handleApplyBulkPricing} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
              {/* Tab Selector */}
              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-2">
                  Select Action Mode
                </label>
                <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setBulkTarget('discount')}
                    className={`py-2 px-3 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      bulkTarget === 'discount'
                        ? 'bg-white text-[#36135d] shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5 text-[#a7144c]" />
                    <span>Add Discounts</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkTarget('regular_price')}
                    className={`py-2 px-3 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      bulkTarget === 'regular_price'
                        ? 'bg-white text-[#36135d] shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Regular Prices</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkTarget('both')}
                    className={`py-2 px-3 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      bulkTarget === 'both'
                        ? 'bg-white text-[#36135d] shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
                    <span>Combined (Dual)</span>
                  </button>
                </div>
              </div>

              {/* 1. REGULAR PRICE SETTINGS (Shown in regular_price or both) */}
              {(bulkTarget === 'regular_price' || bulkTarget === 'both') && (
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs border-b border-amber-200/60 pb-2">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <span>Regular Price Adjustment</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Adjustment Action</label>
                      <select
                        value={bulkRegularAction}
                        onChange={(e) => setBulkRegularAction(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-medium focus:outline-hidden focus:border-[#36135d]"
                      >
                        <option value="increase_percent">Increase Regular Price by %</option>
                        <option value="increase_flat">Increase Regular Price by flat Rs.</option>
                        <option value="decrease_percent">Decrease Regular Price by %</option>
                        <option value="decrease_flat">Decrease Regular Price by flat Rs.</option>
                        <option value="set_exact">Set Exact Regular Price (Rs.)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        {bulkRegularAction.includes('percent')
                          ? 'Percentage (%)'
                          : 'Amount in Rs.'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={bulkRegularValue}
                        onChange={(e) => setBulkRegularValue(e.target.value)}
                        placeholder={bulkRegularAction.includes('percent') ? 'e.g. 10' : 'e.g. 500'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold text-gray-900 focus:outline-hidden focus:border-[#36135d]"
                      />
                    </div>
                  </div>

                  {/* Regular Price Presets */}
                  <div>
                    <span className="text-[10px] text-gray-500 font-medium mr-2">Quick Presets:</span>
                    <div className="inline-flex flex-wrap gap-1 mt-1">
                      {bulkRegularAction.includes('percent') ? (
                        ['5', '10', '12', '15', '20', '25'].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setBulkRegularValue(val)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer ${
                              bulkRegularValue === val
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            +{val}%
                          </button>
                        ))
                      ) : (
                        ['50', '100', '250', '500', '1000', '2500'].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setBulkRegularValue(val)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer ${
                              bulkRegularValue === val
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            +Rs. {Number(val).toLocaleString()}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Existing Sale Price Handling (only if not also setting new discount) */}
                  {bulkTarget === 'regular_price' && (
                    <div className="pt-2 border-t border-amber-200/50">
                      <label className="block font-semibold text-gray-700 mb-1">
                        How should existing promotional sale prices be handled?
                      </label>
                      <div className="space-y-1.5 mt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="bulkSaleHandling"
                            checked={bulkSaleHandling === 'keep_discount_percent'}
                            onChange={() => setBulkSaleHandling('keep_discount_percent')}
                            className="text-[#36135d] focus:ring-[#36135d]"
                          />
                          <span className="font-medium text-gray-700">
                            Preserve discount % (scale sale price proportionally with new regular price)
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="bulkSaleHandling"
                            checked={bulkSaleHandling === 'keep_sale_price'}
                            onChange={() => setBulkSaleHandling('keep_sale_price')}
                            className="text-[#36135d] focus:ring-[#36135d]"
                          />
                          <span className="font-medium text-gray-700">
                            Keep existing fixed sale price amount (if lower than new regular price)
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="bulkSaleHandling"
                            checked={bulkSaleHandling === 'remove_sale_price'}
                            onChange={() => setBulkSaleHandling('remove_sale_price')}
                            className="text-[#36135d] focus:ring-[#36135d]"
                          />
                          <span className="font-medium text-gray-700">
                            Remove all sale prices (reset to regular price)
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. DISCOUNT / SALE PRICE SETTINGS (Shown in discount or both) */}
              {(bulkTarget === 'discount' || bulkTarget === 'both') && (
                <div className="p-4 rounded-2xl bg-pink-50/50 border border-pink-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-[#a7144c] font-bold text-xs border-b border-pink-200/60 pb-2">
                    <Percent className="w-4 h-4 text-[#a7144c]" />
                    <span>Discounts & Promotional Sale Pricing</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Discount Action</label>
                      <select
                        value={bulkDiscountAction}
                        onChange={(e) => setBulkDiscountAction(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-medium focus:outline-hidden focus:border-[#36135d]"
                      >
                        <option value="set_percent">Percentage Discount (% OFF regular price)</option>
                        <option value="set_flat_discount">Flat Discount (Rs. OFF regular price)</option>
                        <option value="set_sale_price">Set Exact Sale Price (Rs.)</option>
                        <option value="clear_discount">Clear / Remove Discounts (Remove sale price)</option>
                      </select>
                    </div>

                    {bulkDiscountAction !== 'clear_discount' && (
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">
                          {bulkDiscountAction === 'set_percent'
                            ? 'Discount Percentage (%)'
                            : 'Discount Amount / Price (Rs.)'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          value={bulkDiscountValue}
                          onChange={(e) => setBulkDiscountValue(e.target.value)}
                          placeholder={bulkDiscountAction === 'set_percent' ? 'e.g. 15' : 'e.g. 1000'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-bold text-gray-900 focus:outline-hidden focus:border-[#36135d]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Discount Quick Presets */}
                  {bulkDiscountAction !== 'clear_discount' && (
                    <div>
                      <span className="text-[10px] text-gray-500 font-medium mr-2">Quick Presets:</span>
                      <div className="inline-flex flex-wrap gap-1 mt-1">
                        {bulkDiscountAction === 'set_percent' ? (
                          ['5', '10', '15', '20', '25', '30', '40', '50'].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setBulkDiscountValue(val)}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer ${
                                bulkDiscountValue === val
                                  ? 'bg-[#a7144c] text-white border-[#a7144c]'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                              }`}
                            >
                              {val}% OFF
                            </button>
                          ))
                        ) : (
                          ['100', '250', '500', '1000', '2000', '5000'].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setBulkDiscountValue(val)}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer ${
                                bulkDiscountValue === val
                                  ? 'bg-[#a7144c] text-white border-[#a7144c]'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                              }`}
                            >
                              Rs. {Number(val).toLocaleString()}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. ROUNDING OPTIONS */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-gray-800">Round Calculated Prices</span>
                  <p className="text-[10px] text-gray-500">Auto-round new regular and promotional prices</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: '1', label: 'Nearest Rs. 1' },
                    { id: '10', label: 'Nearest Rs. 10' },
                    { id: '50', label: 'Nearest Rs. 50' },
                    { id: '100', label: 'Nearest Rs. 100' },
                    { id: 'none', label: 'No Rounding' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setBulkRoundTo(r.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        bulkRoundTo === r.id
                          ? 'bg-[#36135d] text-white border-[#36135d]'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. LIVE CALCULATION PREVIEW */}
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-2xs">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Live Preview (Calculations for sample selected items)</span>
                  </div>
                  <span className="text-[10px] text-gray-500">Updates live as you type</span>
                </div>

                <div className="divide-y divide-gray-100">
                  {previewProducts.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-xs">No sample products available.</div>
                  ) : (
                    previewProducts.map((p) => {
                      const { newRegular, newSale, discountPercent } = calculateNewPrices(
                        Number(p.regular_price),
                        p.sale_price ? Number(p.sale_price) : null
                      );
                      const regDiff = newRegular - Number(p.regular_price);
                      const regDiffPercent =
                        Number(p.regular_price) > 0
                          ? Math.round((regDiff / Number(p.regular_price)) * 100)
                          : 0;

                      return (
                        <div key={p.id} className="p-3 flex flex-wrap items-center justify-between gap-2 hover:bg-gray-50/50">
                          <div className="max-w-xs">
                            <div className="font-bold text-gray-900 line-clamp-1">{p.name}</div>
                            <div className="text-[10px] text-gray-400 font-mono">SKU: {p.sku || `THY-${p.id}`}</div>
                          </div>

                          <div className="flex items-center gap-4 text-right">
                            {/* Regular Price change */}
                            <div>
                              <div className="text-[10px] text-gray-400">Regular Price</div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-500 line-through">
                                  Rs. {Number(p.regular_price).toLocaleString()}
                                </span>
                                <span className="font-bold text-gray-900">
                                  → Rs. {newRegular.toLocaleString()}
                                </span>
                                {regDiff !== 0 && (
                                  <span
                                    className={`text-[9px] font-black px-1 rounded ${
                                      regDiff > 0
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-red-50 text-red-700'
                                    }`}
                                  >
                                    {regDiff > 0 ? `+${regDiffPercent}%` : `${regDiffPercent}%`}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Sale / Discount Price change */}
                            <div>
                              <div className="text-[10px] text-gray-400">Sale Price (Discount)</div>
                              <div className="flex items-center gap-1.5">
                                {newSale !== null ? (
                                  <>
                                    <span className="font-bold text-[#a7144c]">
                                      Rs. {newSale.toLocaleString()}
                                    </span>
                                    {discountPercent !== null && (
                                      <span className="bg-pink-100 text-[#a7144c] font-black text-[9px] px-1.5 py-0.2 rounded border border-pink-200">
                                        {discountPercent}% OFF
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400 font-medium">No discount</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBulkSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#36135d] to-[#a7144c] hover:opacity-90 text-white rounded-xl font-bold transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isBulkSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Pricing...</span>
                    </>
                  ) : (
                    <>
                      <Percent className="w-4 h-4" />
                      <span>Apply to {selectedCount} Product{selectedCount === 1 ? '' : 's'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
