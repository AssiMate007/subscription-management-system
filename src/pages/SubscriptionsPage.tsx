import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  History,
  Lock,
  Pause,
  Play,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import {
  Customer,
  Plan,
  Product,
  Subscription,
  SubscriptionLine,
  SubscriptionStatus,
} from '../types';
import { useAuth } from '../lib/auth';
import {
  auditLogsRepo,
  customersRepo,
  discountsRepo,
  invoicesRepo,
  plansRepo,
  productsRepo,
  settingsRepo,
  subscriptionsRepo,
} from '../lib/db';
import { formatDate, formatINR } from '../lib/formatters';
import { generateQuotationPDF } from '../lib/pdf';
import { calculateOrderLine, calculateTotals, round2 } from '../lib/pricing';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Pagination } from '../components/common/Pagination';
import { StatusBadge } from '../components/common/StatusBadge';
import { QuotationViewModal } from '../components/quotations/QuotationViewModal';
import { useToast } from '../context/ToastContext';

export const SubscriptionsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const settings = settingsRepo.get();
  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];

  const canManage = user?.role === 'admin' || user?.role === 'staff';

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals & Detail
  const [viewingSubId, setViewingSubId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    isDestructive?: boolean;
  }>({ isOpen: false, title: '', message: '', action: () => {} });

  // Data
  const subscriptions = useMemo(() => subscriptionsRepo.getAll(user), [user]);
  const customers = useMemo(() => customersRepo.getAll(user), [user]);
  const plans = useMemo(() => plansRepo.getAll(), []);
  const products = useMemo(() => productsRepo.getAll().filter((p) => p.active), []);
  const discounts = useMemo(() => discountsRepo.getAll().filter((d) => d.active), []);

  // Filtered dataset
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
      if (customerFilter !== 'all' && sub.customerId !== customerFilter) return false;
      if (planFilter !== 'all' && sub.planId !== planFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const subNum = sub.subscriptionNumber.toLowerCase();
        const customer = customers.find((c) => c.id === sub.customerId);
        const custName = customer?.name.toLowerCase() || '';
        const compName = customer?.company?.toLowerCase() || '';
        if (!subNum.includes(query) && !custName.includes(query) && !compName.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [subscriptions, statusFilter, customerFilter, planFilter, searchQuery, customers]);

  // Paginated items
  const paginatedSubscriptions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubscriptions.slice(start, start + pageSize);
  }, [filteredSubscriptions, currentPage, pageSize]);

  // Handle status transitions with workflow rules
  const handleTransitionStatus = (sub: Subscription, newStatus: SubscriptionStatus) => {
    const plan = plans.find((p) => p.id === sub.planId);

    // Plan capability checks
    if (newStatus === 'Closed' && plan && !plan.closable) {
      showToast('error', 'Action Restricted', `Plan "${plan.name}" does not permit closing.`);
      return;
    }

    try {
      subscriptionsRepo.update(sub.id, { status: newStatus }, user);
      showToast('success', 'Status Updated', `Subscription transitioned to ${newStatus}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Transition Denied', msg);
    }
  };

  // Plan actions: Pause, Resume, Early Terminate, Renew
  const handlePause = (sub: Subscription) => {
    const plan = plans.find((p) => p.id === sub.planId);
    if (!plan?.pausable) {
      showToast('error', 'Not Allowed', 'This plan does not permit pausing.');
      return;
    }
    subscriptionsRepo.update(
      sub.id,
      { pausedAt: effectiveToday, notes: (sub.notes || '') + `\nPaused on ${effectiveToday}` },
      user
    );
    showToast('info', 'Subscription Paused', 'Recurring billing suspended until resumed.');
  };

  const handleResume = (sub: Subscription) => {
    subscriptionsRepo.update(
      sub.id,
      { pausedAt: undefined, notes: (sub.notes || '') + `\nResumed on ${effectiveToday}` },
      user
    );
    showToast('success', 'Subscription Resumed', 'Subscription is active.');
  };

  const handleEarlyTerminate = (sub: Subscription) => {
    const plan = plans.find((p) => p.id === sub.planId);
    if (!plan?.earlyTerminationAllowed) {
      showToast('error', 'Not Allowed', 'Early termination is not permitted by this plan.');
      return;
    }

    setConfirmModalData({
      isOpen: true,
      title: 'Confirm Early Termination',
      message: `Are you sure you want to early terminate subscription ${sub.subscriptionNumber}? ${
        plan.earlyTerminationFee > 0
          ? `An early termination fee of ₹${plan.earlyTerminationFee.toLocaleString('en-IN')} applies.`
          : ''
      }`,
      isDestructive: true,
      action: () => {
        subscriptionsRepo.update(
          sub.id,
          {
            status: 'Closed',
            closedAt: effectiveToday,
            earlyTerminatedAt: effectiveToday,
            notes: (sub.notes || '') + `\nEarly terminated on ${effectiveToday}. Fee: ₹${plan.earlyTerminationFee}`,
          },
          user
        );
        showToast('info', 'Subscription Terminated', 'Closed with early termination status recorded.');
      },
    });
  };

  const handleRenew = (sub: Subscription) => {
    const plan = plans.find((p) => p.id === sub.planId);
    if (!plan?.renewable) {
      showToast('error', 'Not Allowed', 'This plan is marked as non-renewable.');
      return;
    }

    const curExpiry = new Date(sub.expiryDate);
    curExpiry.setFullYear(curExpiry.getFullYear() + 1);
    const newExpiry = curExpiry.toISOString().split('T')[0];

    subscriptionsRepo.update(
      sub.id,
      { expiryDate: newExpiry, notes: (sub.notes || '') + `\nRenewed on ${effectiveToday} until ${newExpiry}` },
      user
    );
    showToast('success', 'Subscription Renewed', `Expiry date extended to ${formatDate(newExpiry)}.`);
  };

  // State for Create Subscription Modal
  const [newSubCustomer, setNewSubCustomer] = useState<string>(customers[0]?.id || '');
  const [newSubPlan, setNewSubPlan] = useState<string>(plans[0]?.id || '');
  const [newSubTerms, setNewSubTerms] = useState<string>('Net 15');
  const [newSubStatus, setNewSubStatus] = useState<SubscriptionStatus>('Quotation');
  const [newSubDiscount, setNewSubDiscount] = useState<string>('');
  const [newSubLines, setNewSubLines] = useState<
    Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      discountPercent: number;
    }>
  >([{ productId: products[0]?.id || '', quantity: 1, discountPercent: 0 }]);

  // Add line to new subscription
  const handleAddLine = () => {
    if (products.length === 0) return;
    setNewSubLines([...newSubLines, { productId: products[0].id, quantity: 1, discountPercent: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    setNewSubLines(newSubLines.filter((_, i) => i !== index));
  };

  const handleCreateSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCustomer) {
      showToast('error', 'Customer Required', 'Please select a customer.');
      return;
    }
    if (!newSubPlan) {
      showToast('error', 'Plan Required', 'Please select a plan.');
      return;
    }
    if (newSubLines.length === 0) {
      showToast('error', 'Order Lines Required', 'At least one product line is required.');
      return;
    }

    const plan = plans.find((p) => p.id === newSubPlan);
    const totalQty = newSubLines.reduce((acc, l) => acc + l.quantity, 0);

    // Enforce plan minimum quantity
    if (plan && totalQty < plan.minQuantity) {
      showToast(
        'error',
        'Minimum Quantity Not Met',
        `Plan "${plan.name}" requires at least ${plan.minQuantity} items (current: ${totalQty}).`
      );
      return;
    }

    // Build subscription lines
    const builtLines: SubscriptionLine[] = [];
    for (const l of newSubLines) {
      const prod = products.find((p) => p.id === l.productId);
      if (!prod) continue;
      const variant = prod.variants.find((v) => v.id === l.variantId);
      const varExtra = variant ? variant.extraPrice : 0;
      const calc = calculateOrderLine(prod.sellingPrice, varExtra, l.quantity, l.discountPercent, 18);

      builtLines.push({
        id: 'SUBL-' + Math.random().toString(36).substring(2, 9),
        productId: prod.id,
        productName: prod.name,
        variantId: variant?.id,
        variantName: variant?.value,
        quantity: l.quantity,
        unitPrice: prod.sellingPrice,
        variantExtra: varExtra,
        taxPercent: 18,
        discountPercent: l.discountPercent,
        lineTotal: calc.lineTotal,
      });
    }

    const totals = calculateTotals(builtLines, 0);
    const allSubs = subscriptionsRepo.getAll(null);
    const subNumber = `SUB-2026-${String(allSubs.length + 1).padStart(6, '0')}`;

    const startDate = effectiveToday;
    const expiryDate = new Date(new Date(effectiveToday).setFullYear(new Date(effectiveToday).getFullYear() + 1))
      .toISOString()
      .split('T')[0];

    const newSub: Subscription = {
      id: 'SUB-' + Math.random().toString(36).substring(2, 9),
      subscriptionNumber: subNumber,
      customerId: newSubCustomer,
      planId: newSubPlan,
      status: newSubStatus,
      startDate,
      expiryDate,
      nextBillingDate: startDate,
      paymentTerms: newSubTerms,
      lines: builtLines,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      appliedDiscountId: newSubDiscount || undefined,
      createdAt: new Date().toISOString(),
    };

    try {
      subscriptionsRepo.create(newSub, user);
      showToast('success', 'Subscription Created', `Created ${subNumber} in ${newSubStatus} status.`);
      setIsCreateModalOpen(false);
      // Reset form
      setNewSubLines([{ productId: products[0]?.id || '', quantity: 1, discountPercent: 0 }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Creation Failed', msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscriptions & Quotations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Strict lifecycle states: Draft → Quotation → Confirmed → Active → Closed.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Subscription / Quote</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by subscription number, customer name, company..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Statuses ({subscriptions.length})</option>
              <option value="Active">Active</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Quotation">Quotation</option>
              <option value="Draft">Draft</option>
              <option value="Closed">Closed</option>
            </select>

            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Subscription #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Plan / Cycle</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">Next Billing</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No subscriptions found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedSubscriptions.map((sub) => {
                  const customer = customers.find((c) => c.id === sub.customerId);
                  const plan = plans.find((p) => p.id === sub.planId);
                  const isPaused = Boolean(sub.pausedAt);

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {sub.subscriptionNumber}
                        {isPaused && (
                          <span className="ml-2 text-[10px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded font-sans">
                            Paused
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{customer?.name || 'Customer'}</span>
                        {customer?.company && (
                          <span className="text-[11px] text-slate-500 block">{customer.company}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-800 font-medium block">{plan?.name}</span>
                        <span className="text-[11px] text-slate-500 block">{plan?.billingFrequency}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(sub.startDate)}</td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(sub.nextBillingDate)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatINR(sub.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Detail / Quotation */}
                          <button
                            onClick={() => setViewingSubId(sub.id)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="View Quotation / Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Quick Workflow Transitions */}
                          {sub.status === 'Draft' && canManage && (
                            <button
                              onClick={() => handleTransitionStatus(sub, 'Quotation')}
                              className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                            >
                              Send Quote
                            </button>
                          )}

                          {sub.status === 'Quotation' && (
                            <button
                              onClick={() => handleTransitionStatus(sub, 'Confirmed')}
                              className="px-2 py-1 text-[11px] font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded transition-colors"
                            >
                              Confirm
                            </button>
                          )}

                          {sub.status === 'Confirmed' && canManage && (
                            <button
                              onClick={() => handleTransitionStatus(sub, 'Active')}
                              className="px-2 py-1 text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded transition-colors"
                            >
                              Activate
                            </button>
                          )}

                          {/* Pause / Resume */}
                          {sub.status === 'Active' && plan?.pausable && canManage && (
                            isPaused ? (
                              <button
                                onClick={() => handleResume(sub)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Resume Subscription"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePause(sub)}
                                className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                                title="Pause Subscription"
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}

                          {/* Renew */}
                          {sub.status === 'Active' && plan?.renewable && canManage && (
                            <button
                              onClick={() => handleRenew(sub)}
                              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                              title="Renew +1 Year"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Early Terminate */}
                          {sub.status === 'Active' && plan?.earlyTerminationAllowed && canManage && (
                            <button
                              onClick={() => handleEarlyTerminate(sub)}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                              title="Early Terminate"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredSubscriptions.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Quotation / Detail Modal */}
      <QuotationViewModal
        subscriptionId={viewingSubId}
        onClose={() => setViewingSubId(null)}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalData.isOpen}
        title={confirmModalData.title}
        message={confirmModalData.message}
        isDestructive={confirmModalData.isDestructive}
        onConfirm={() => {
          confirmModalData.action();
          setConfirmModalData((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModalData((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Create Subscription / Quotation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-900 text-base">New Subscription / Quotation</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubscription} className="overflow-y-auto p-6 space-y-5 text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Customer <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newSubCustomer}
                    onChange={(e) => setNewSubCustomer(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Select Customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Subscription Plan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newSubPlan}
                    onChange={(e) => setNewSubPlan(e.target.value)}
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Select Plan...</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{p.price.toLocaleString('en-IN')}/{p.billingFrequency} (Min Qty: {p.minQuantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
                  <select
                    value={newSubTerms}
                    onChange={(e) => setNewSubTerms(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Immediate">Immediate (Due on receipt)</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={newSubStatus}
                    onChange={(e) => setNewSubStatus(e.target.value as SubscriptionStatus)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Quotation">Quotation (Client will review)</option>
                    <option value="Draft">Draft</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Active">Active (Immediate billing schedule)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Attach Promotional Discount</label>
                  <select
                    value={newSubDiscount}
                    onChange={(e) => setNewSubDiscount(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">No Discount Attached</option>
                    {discounts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} — {d.name} ({d.type === 'Fixed' ? `₹${d.value} Off` : `${d.value}% Off`})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Order Lines */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Product Order Lines
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Product</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {newSubLines.map((line, idx) => {
                    const prod = products.find((p) => p.id === line.productId);
                    const variants = prod?.variants || [];
                    const selectedVar = variants.find((v) => v.id === line.variantId);
                    const varExtra = selectedVar ? selectedVar.extraPrice : 0;
                    const calc = calculateOrderLine(
                      prod?.sellingPrice || 0,
                      varExtra,
                      line.quantity,
                      line.discountPercent,
                      18
                    );

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3"
                      >
                        <div className="flex-1 w-full">
                          <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">
                            Product
                          </label>
                          <select
                            value={line.productId}
                            onChange={(e) => {
                              const newLines = [...newSubLines];
                              newLines[idx].productId = e.target.value;
                              newLines[idx].variantId = undefined;
                              setNewSubLines(newLines);
                            }}
                            className="w-full p-1.5 border border-slate-300 rounded bg-white text-xs"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (Base ₹{p.sellingPrice})
                              </option>
                            ))}
                          </select>
                        </div>

                        {variants.length > 0 && (
                          <div className="w-full sm:w-44">
                            <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">
                              Variant
                            </label>
                            <select
                              value={line.variantId || ''}
                              onChange={(e) => {
                                const newLines = [...newSubLines];
                                newLines[idx].variantId = e.target.value || undefined;
                                setNewSubLines(newLines);
                              }}
                              className="w-full p-1.5 border border-slate-300 rounded bg-white text-xs"
                            >
                              <option value="">Default Standard (+₹0)</option>
                              {variants.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.attribute}: {v.value} (+₹{v.extraPrice})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="w-20">
                          <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">
                            Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => {
                              const newLines = [...newSubLines];
                              newLines[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
                              setNewSubLines(newLines);
                            }}
                            className="w-full p-1.5 border border-slate-300 rounded bg-white text-xs font-semibold text-center"
                          />
                        </div>

                        <div className="w-20">
                          <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">
                            Disc %
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={line.discountPercent}
                            onChange={(e) => {
                              const newLines = [...newSubLines];
                              newLines[idx].discountPercent = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                              setNewSubLines(newLines);
                            }}
                            className="w-full p-1.5 border border-slate-300 rounded bg-white text-xs text-center"
                          />
                        </div>

                        <div className="w-28 text-right self-end sm:self-center">
                          <label className="block text-[10px] text-slate-500 uppercase font-semibold mb-1">
                            Line Total
                          </label>
                          <span className="font-bold text-slate-900 block py-1.5">
                            {formatINR(calc.lineTotal)}
                          </span>
                        </div>

                        {newSubLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded self-end sm:self-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-xs"
                >
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
