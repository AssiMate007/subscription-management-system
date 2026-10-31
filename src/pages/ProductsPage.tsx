import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Edit2,
  Package,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { Product, ProductType, ProductVariant } from '../types';
import { useAuth } from '../lib/auth';
import { productsRepo } from '../lib/db';
import { formatINR } from '../lib/formatters';
import { calculateMargin } from '../lib/pricing';
import { Pagination } from '../components/common/Pagination';
import { useToast } from '../context/ToastContext';

export const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = user?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<ProductType>('Software');
  const [sellingPrice, setSellingPrice] = useState<string>('500');
  const [costPrice, setCostPrice] = useState<string>('150');
  const [description, setDescription] = useState('');
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  const products = useMemo(() => productsRepo.getAll(), []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [products, typeFilter, searchQuery]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setType('Software');
    setSellingPrice('500');
    setCostPrice('150');
    setDescription('');
    setVariants([]);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setType(p.type);
    setSellingPrice(String(p.sellingPrice));
    setCostPrice(String(p.costPrice));
    setDescription(p.description);
    setVariants(p.variants || []);
    setIsModalOpen(true);
  };

  const handleAddVariant = () => {
    setVariants([
      ...variants,
      {
        id: 'VAR-' + Math.random().toString(36).substring(2, 7),
        attribute: 'Brand Edition',
        value: 'Standard',
        extraPrice: 0,
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Name Required', 'Product name is mandatory.');
      return;
    }

    const sp = parseFloat(sellingPrice);
    const cp = parseFloat(costPrice);

    if (isNaN(sp) || sp < 0 || isNaN(cp) || cp < 0) {
      showToast('error', 'Invalid Pricing', 'Selling price and cost price must be non-negative numbers.');
      return;
    }

    try {
      if (editingProduct) {
        productsRepo.update(
          editingProduct.id,
          {
            name: name.trim(),
            type,
            sellingPrice: sp,
            costPrice: cp,
            description: description.trim(),
            variants,
          },
          user
        );
        showToast('success', 'Product Updated', `Product ${name} updated.`);
      } else {
        const newProduct: Product = {
          id: 'PROD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
          name: name.trim(),
          type,
          sellingPrice: sp,
          costPrice: cp,
          description: description.trim(),
          active: true,
          variants,
          createdAt: new Date().toISOString(),
        };
        productsRepo.create(newProduct, user);
        showToast('success', 'Product Created', `Product ${name} added.`);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Save Failed', msg);
    }
  };

  const handleDeactivate = (p: Product) => {
    try {
      productsRepo.deactivate(p.id, user);
      showToast('info', 'Product Deactivated', `Product ${p.name} deactivated.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Action Restricted', msg);
    }
  };

  const liveMargin = useMemo(() => {
    const sp = parseFloat(sellingPrice) || 0;
    const cp = parseFloat(costPrice) || 0;
    return calculateMargin(sp, cp);
  }, [sellingPrice, costPrice]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products & Pricing Catalog</h1>
          <p className="text-xs text-slate-500 mt-1">
            Software licenses, add-on modules, variants (e.g. Odoo +₹560), and margin calculator.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products by name or description..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All Types ({products.length})</option>
          <option value="Software">Software</option>
          <option value="Add-on">Add-on</option>
          <option value="Service">Service</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-right">Margin</th>
                <th className="py-3 px-4">Variants</th>
                <th className="py-3 px-4 text-center">Status</th>
                {canManage && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.map((p) => {
                const margin = calculateMargin(p.sellingPrice, p.costPrice);

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{p.name}</span>
                      <span className="text-[11px] text-slate-500 block truncate max-w-xs">{p.description}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-700 font-medium">{p.type}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatINR(p.sellingPrice)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {formatINR(p.costPrice)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-semibold ${
                          margin.isWarning
                            ? 'text-rose-600 font-bold'
                            : margin.marginPercent > 40
                            ? 'text-emerald-700'
                            : 'text-slate-700'
                        }`}
                      >
                        {formatINR(margin.marginAmount)} ({margin.marginPercent}%)
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {p.variants && p.variants.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.variants.map((v) => (
                            <span
                              key={v.id}
                              className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono"
                            >
                              {v.value} (+₹{v.extraPrice})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No variants</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-xs ${
                          p.active ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-emerald-500' : 'bg-slate-400'}`}
                        />
                        <span>{p.active ? 'Active' : 'Inactive'}</span>
                      </span>
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {p.active && (
                            <button
                              onClick={() => handleDeactivate(p)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Deactivate"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredProducts.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Product Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="overflow-y-auto space-y-4 text-xs flex-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Brightloop ERP Core"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Product Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ProductType)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Software">Software</option>
                    <option value="Add-on">Add-on</option>
                    <option value="Service">Service</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Selling Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cost Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Real-time Margin & Profitability Preview */}
              <div
                className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                  liveMargin.isWarning
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <div>
                  <span className="font-semibold block">
                    {liveMargin.isWarning ? 'Loss Warning: Cost exceeds Selling Price' : 'Profit Margin'}
                  </span>
                  <span className="text-[11px]">
                    Margin: {formatINR(liveMargin.marginAmount)} ({liveMargin.marginPercent}%)
                  </span>
                </div>
                {liveMargin.isWarning && <AlertTriangle className="w-5 h-5 text-rose-600" />}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Features, billing units, or integration guidelines"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Product Variants (Attribute + Value + Extra Price) */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Product Variants ({variants.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Variant</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {variants.map((v, vIdx) => (
                    <div key={v.id || vIdx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Attribute (e.g. Brand)"
                        value={v.attribute}
                        onChange={(e) => {
                          const copy = [...variants];
                          copy[vIdx].attribute = e.target.value;
                          setVariants(copy);
                        }}
                        className="w-1/3 p-1.5 border border-slate-300 rounded bg-white text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. Odoo)"
                        value={v.value}
                        onChange={(e) => {
                          const copy = [...variants];
                          copy[vIdx].value = e.target.value;
                          setVariants(copy);
                        }}
                        className="w-1/3 p-1.5 border border-slate-300 rounded bg-white text-xs"
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Extra ₹"
                        value={v.extraPrice}
                        onChange={(e) => {
                          const copy = [...variants];
                          copy[vIdx].extraPrice = parseFloat(e.target.value) || 0;
                          setVariants(copy);
                        }}
                        className="w-1/4 p-1.5 border border-slate-300 rounded bg-white text-xs font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(vIdx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-xs"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
