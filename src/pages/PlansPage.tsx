import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  Edit2,
  Layers,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { BillingFrequency, Plan } from '../types';
import { useAuth } from '../lib/auth';
import { plansRepo, settingsRepo } from '../lib/db';
import { formatDate, formatINR } from '../lib/formatters';
import { useToast } from '../context/ToastContext';

export const PlansPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const settings = settingsRepo.get();
  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];

  const canManage = user?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('500');
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>('Monthly');
  const [minQuantity, setMinQuantity] = useState(1);
  const [availabilityStartDate, setAvailabilityStartDate] = useState('2025-01-01');
  const [availabilityEndDate, setAvailabilityEndDate] = useState('2028-12-31');
  const [description, setDescription] = useState('');
  const [pausable, setPausable] = useState(true);
  const [renewable, setRenewable] = useState(true);
  const [closable, setClosable] = useState(true);
  const [earlyTerminationAllowed, setEarlyTerminationAllowed] = useState(true);
  const [earlyTerminationFee, setEarlyTerminationFee] = useState('0');

  const plans = useMemo(() => plansRepo.getAll(), []);

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [plans, searchQuery]);

  const openCreateModal = () => {
    setEditingPlan(null);
    setName('');
    setPrice('500');
    setBillingFrequency('Monthly');
    setMinQuantity(1);
    setAvailabilityStartDate(effectiveToday);
    setAvailabilityEndDate('2028-12-31');
    setDescription('');
    setPausable(true);
    setRenewable(true);
    setClosable(true);
    setEarlyTerminationAllowed(true);
    setEarlyTerminationFee('0');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Plan) => {
    setEditingPlan(p);
    setName(p.name);
    setPrice(String(p.price));
    setBillingFrequency(p.billingFrequency);
    setMinQuantity(p.minQuantity);
    setAvailabilityStartDate(p.availabilityStartDate);
    setAvailabilityEndDate(p.availabilityEndDate);
    setDescription(p.description);
    setPausable(p.pausable);
    setRenewable(p.renewable);
    setClosable(p.closable);
    setEarlyTerminationAllowed(p.earlyTerminationAllowed);
    setEarlyTerminationFee(String(p.earlyTerminationFee));
    setIsModalOpen(true);
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Name Required', 'Plan name is mandatory.');
      return;
    }

    const priceNum = parseFloat(price);
    const feeNum = parseFloat(earlyTerminationFee) || 0;

    if (isNaN(priceNum) || priceNum <= 0) {
      showToast('error', 'Invalid Price', 'Plan price must be greater than zero.');
      return;
    }

    try {
      if (editingPlan) {
        plansRepo.update(
          editingPlan.id,
          {
            name: name.trim(),
            price: priceNum,
            billingFrequency,
            minQuantity: Math.max(1, minQuantity),
            availabilityStartDate,
            availabilityEndDate,
            description: description.trim(),
            pausable,
            renewable,
            closable,
            earlyTerminationAllowed,
            earlyTerminationFee: feeNum,
          },
          user
        );
        showToast('success', 'Plan Updated', `Plan ${name} saved.`);
      } else {
        const newPlan: Plan = {
          id: 'PLAN-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
          name: name.trim(),
          price: priceNum,
          billingFrequency,
          minQuantity: Math.max(1, minQuantity),
          availabilityStartDate,
          availabilityEndDate,
          description: description.trim(),
          pausable,
          renewable,
          closable,
          earlyTerminationAllowed,
          earlyTerminationFee: feeNum,
          active: true,
          createdAt: new Date().toISOString(),
        };
        plansRepo.create(newPlan, user);
        showToast('success', 'Plan Created', `Plan ${name} created.`);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Save Failed', msg);
    }
  };

  const handleDeactivate = (p: Plan) => {
    try {
      plansRepo.deactivate(p.id, user);
      showToast('info', 'Plan Deactivated', `Plan ${p.name} updated.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Action Restricted', msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscription Plans</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure frequencies, minimum quantities, availability windows, and termination policies.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Plan</span>
          </button>
        )}
      </div>

      {/* Plans Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredPlans.map((p) => {
          const isAvailableNow =
            effectiveToday >= p.availabilityStartDate && effectiveToday <= p.availabilityEndDate && p.active;

          return (
            <div
              key={p.id}
              className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                isAvailableNow ? 'border-slate-200 hover:border-indigo-300' : 'border-slate-200 opacity-60 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                    {p.billingFrequency}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      isAvailableNow
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isAvailableNow ? 'Available' : 'Closed Window'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-2">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-900">{formatINR(p.price)}</span>
                  <span className="text-xs text-slate-500 font-medium">/{p.billingFrequency.toLowerCase()}</span>
                </div>

                <p className="text-xs text-slate-600 mt-3 leading-relaxed">{p.description}</p>

                {/* Features & Options Flags */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Min Quantity:</span>
                    <strong className="text-slate-800">{p.minQuantity} unit{p.minQuantity > 1 ? 's' : ''}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pausable:</span>
                    <strong className={p.pausable ? 'text-emerald-700' : 'text-slate-400'}>
                      {p.pausable ? 'Yes' : 'No'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Renewable:</span>
                    <strong className={p.renewable ? 'text-emerald-700' : 'text-slate-400'}>
                      {p.renewable ? 'Yes' : 'No'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Early Terminate:</span>
                    <strong className={p.earlyTerminationAllowed ? 'text-emerald-700' : 'text-slate-400'}>
                      {p.earlyTerminationAllowed ? (p.earlyTerminationFee > 0 ? `Yes (₹${p.earlyTerminationFee} fee)` : 'Yes (Free)') : 'No'}
                    </strong>
                  </div>
                </div>
              </div>

              {canManage && (
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => openEditModal(p)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  {p.active && (
                    <button
                      onClick={() => handleDeactivate(p)}
                      className="text-xs text-slate-400 hover:text-rose-600 transition-colors"
                      title="Deactivate plan"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Plan CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 text-base">
                {editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="overflow-y-auto space-y-4 text-xs flex-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Plan Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Starter Monthly"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Billing Frequency</label>
                  <select
                    value={billingFrequency}
                    onChange={(e) => setBillingFrequency(e.target.value as BillingFrequency)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Minimum Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(parseInt(e.target.value) || 1)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Early Termination Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={earlyTerminationFee}
                    onChange={(e) => setEarlyTerminationFee(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Availability Start</label>
                  <input
                    type="date"
                    value={availabilityStartDate}
                    onChange={(e) => setAvailabilityStartDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Availability End</label>
                  <input
                    type="date"
                    value={availabilityEndDate}
                    onChange={(e) => setAvailabilityEndDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Target audience and included features"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pausable}
                    onChange={(e) => setPausable(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700 font-medium">Pausable</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={renewable}
                    onChange={(e) => setRenewable(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700 font-medium">Renewable</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closable}
                    onChange={(e) => setClosable(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700 font-medium">Closable</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={earlyTerminationAllowed}
                    onChange={(e) => setEarlyTerminationAllowed(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700 font-medium">Allow Early Termination</span>
                </label>
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
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
