import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  Edit2,
  Percent,
  Plus,
  Search,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { Discount, DiscountType } from '../types';
import { useAuth } from '../lib/auth';
import { discountsRepo, plansRepo, productsRepo, settingsRepo } from '../lib/db';
import { getDiscountStatus } from '../lib/discounts';
import { formatDate, formatINR } from '../lib/formatters';
import { StatusBadge } from '../components/common/StatusBadge';
import { useToast } from '../context/ToastContext';

export const DiscountsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const settings = settingsRepo.get();
  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];

  const canManage = user?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<DiscountType>('Percentage');
  const [value, setValue] = useState('15');
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('1000');
  const [startDate, setStartDate] = useState(effectiveToday);
  const [expiryDate, setExpiryDate] = useState('2027-12-31');
  const [totalUsageLimit, setTotalUsageLimit] = useState(100);
  const [perCustomerLimit, setPerCustomerLimit] = useState(1);

  const discounts = useMemo(() => discountsRepo.getAll(), []);
  const plans = useMemo(() => plansRepo.getAll(), []);
  const products = useMemo(() => productsRepo.getAll(), []);

  const filteredDiscounts = useMemo(() => {
    return discounts.filter((d) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [discounts, searchQuery]);

  const openCreateModal = () => {
    setEditingDiscount(null);
    setCode('');
    setName('');
    setType('Percentage');
    setValue('15');
    setMinPurchaseAmount('1000');
    setStartDate(effectiveToday);
    setExpiryDate('2027-12-31');
    setTotalUsageLimit(100);
    setPerCustomerLimit(1);
    setIsModalOpen(true);
  };

  const openEditModal = (d: Discount) => {
    setEditingDiscount(d);
    setCode(d.code);
    setName(d.name);
    setType(d.type);
    setValue(String(d.value));
    setMinPurchaseAmount(String(d.minPurchaseAmount));
    setStartDate(d.startDate);
    setExpiryDate(d.expiryDate);
    setTotalUsageLimit(d.totalUsageLimit);
    setPerCustomerLimit(d.perCustomerLimit || 1);
    setIsModalOpen(true);
  };

  const handleSaveDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      showToast('error', 'Fields Required', 'Code and name are required.');
      return;
    }

    const valNum = parseFloat(value);
    const minAmt = parseFloat(minPurchaseAmount) || 0;

    if (isNaN(valNum) || valNum <= 0) {
      showToast('error', 'Invalid Value', 'Discount value must be greater than zero.');
      return;
    }

    try {
      if (editingDiscount) {
        discountsRepo.update(
          editingDiscount.id,
          {
            code: code.trim().toUpperCase(),
            name: name.trim(),
            type,
            value: valNum,
            minPurchaseAmount: minAmt,
            startDate,
            expiryDate,
            totalUsageLimit: Math.max(1, totalUsageLimit),
            perCustomerLimit: Math.max(1, perCustomerLimit),
          },
          user
        );
        showToast('success', 'Discount Updated', `Coupon ${code} updated.`);
      } else {
        const newDisc: Discount = {
          id: 'DISC-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
          code: code.trim().toUpperCase(),
          name: name.trim(),
          type,
          value: valNum,
          minPurchaseAmount: minAmt,
          startDate,
          expiryDate,
          totalUsageLimit: Math.max(1, totalUsageLimit),
          perCustomerLimit: Math.max(1, perCustomerLimit),
          usageCount: 0,
          customerUsage: {},
          active: true,
          createdAt: new Date().toISOString(),
        };
        discountsRepo.create(newDisc, user);
        showToast('success', 'Discount Created', `Coupon ${code} added.`);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Save Failed', msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Discount Engine & Coupons</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure automated promotional rules, usage caps, customer quotas, and validity windows.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Discount</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search discounts by code or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Discounts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Coupon Code</th>
                <th className="py-3 px-4">Campaign Name</th>
                <th className="py-3 px-4">Deduction</th>
                <th className="py-3 px-4">Min Spend</th>
                <th className="py-3 px-4">Validity</th>
                <th className="py-3 px-4">Usage / Cap</th>
                <th className="py-3 px-4 text-center">Status</th>
                {canManage && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDiscounts.map((d) => {
                const status = getDiscountStatus(d, effectiveToday);
                const remaining = Math.max(0, d.totalUsageLimit - d.usageCount);

                return (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {d.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{d.name}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {d.type === 'Fixed' ? formatINR(d.value) : `${d.value}% Off`}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatINR(d.minPurchaseAmount)}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatDate(d.startDate)} to {formatDate(d.expiryDate)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{d.usageCount}</span>
                      <span className="text-slate-400"> / {d.totalUsageLimit}</span>
                      <span className="text-[11px] text-slate-500 block">
                        ({remaining} remaining · max {d.perCustomerLimit || 1}/cust)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={status} />
                    </td>
                    {canManage && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditModal(d)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          title="Edit discount"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editingDiscount ? 'Edit Discount Rule' : 'Create Discount Campaign'}
            </h3>

            <form onSubmit={handleSaveDiscount} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Coupon Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FESTIVE20"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as DiscountType)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Startup Special Offer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Value ({type === 'Fixed' ? '₹' : '%'})
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Spend (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={minPurchaseAmount}
                    onChange={(e) => setMinPurchaseAmount(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={totalUsageLimit}
                    onChange={(e) => setTotalUsageLimit(parseInt(e.target.value) || 100)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Per-Customer Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={perCustomerLimit}
                    onChange={(e) => setPerCustomerLimit(parseInt(e.target.value) || 1)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
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
                  Save Discount
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
