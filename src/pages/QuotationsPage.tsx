import React, { useMemo, useState } from 'react';
import {
  Check,
  Eye,
  FileSpreadsheet,
  Plus,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { QuotationTemplate, Subscription } from '../types';
import { useAuth } from '../lib/auth';
import {
  customersRepo,
  plansRepo,
  productsRepo,
  settingsRepo,
  subscriptionsRepo,
  templatesRepo,
} from '../lib/db';
import { formatDate, formatINR } from '../lib/formatters';
import { calculateOrderLine, calculateTotals } from '../lib/pricing';
import { StatusBadge } from '../components/common/StatusBadge';
import { QuotationViewModal } from '../components/quotations/QuotationViewModal';
import { useToast } from '../context/ToastContext';

export const QuotationsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const settings = settingsRepo.get();
  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];

  const canManage = user?.role === 'admin' || user?.role === 'staff';

  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [isCreateFromTemplateModalOpen, setIsCreateFromTemplateModalOpen] = useState(false);
  const [selectedTemplateForQuote, setSelectedTemplateForQuote] = useState<QuotationTemplate | null>(null);
  const [targetCustomerId, setTargetCustomerId] = useState('');

  const templates = useMemo(() => templatesRepo.getAll(), []);
  const subscriptions = useMemo(() => subscriptionsRepo.getAll(user), [user]);
  const quotations = useMemo(() => subscriptions.filter((s) => s.status === 'Quotation' || s.status === 'Draft'), [subscriptions]);
  const customers = useMemo(() => customersRepo.getAll(user), [user]);
  const plans = useMemo(() => plansRepo.getAll(), []);
  const products = useMemo(() => productsRepo.getAll().filter((p) => p.active), []);

  // New Template form state
  const [tmplName, setTmplName] = useState('');
  const [tmplPlanId, setTmplPlanId] = useState(plans[0]?.id || '');
  const [tmplValidity, setTmplValidity] = useState(30);
  const [tmplTerms, setTmplTerms] = useState('Net 15');
  const [tmplLines, setTmplLines] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: products[0]?.id || '', quantity: 1 },
  ]);

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmplName.trim()) {
      showToast('error', 'Name Required', 'Please enter a name for the quotation template.');
      return;
    }

    const newTmpl: QuotationTemplate = {
      id: 'TMPL-' + Math.random().toString(36).substring(2, 9),
      name: tmplName.trim(),
      defaultPlanId: tmplPlanId,
      validityDays: tmplValidity,
      paymentTerms: tmplTerms,
      defaultLines: tmplLines,
      createdAt: new Date().toISOString(),
    };

    templatesRepo.create(newTmpl, user);
    showToast('success', 'Template Created', `Quotation template "${newTmpl.name}" saved.`);
    setIsNewTemplateModalOpen(false);
    setTmplName('');
  };

  const handleLaunchQuotationFromTemplate = (tmpl: QuotationTemplate) => {
    setSelectedTemplateForQuote(tmpl);
    setTargetCustomerId(customers[0]?.id || '');
    setIsCreateFromTemplateModalOpen(true);
  };

  const handleConfirmQuoteGeneration = () => {
    if (!selectedTemplateForQuote || !targetCustomerId) {
      showToast('error', 'Select Customer', 'Please select a customer for this quotation.');
      return;
    }

    const plan = plans.find((p) => p.id === selectedTemplateForQuote.defaultPlanId) || plans[0];
    const customer = customers.find((c) => c.id === targetCustomerId);

    // Build order lines from template
    const builtLines = selectedTemplateForQuote.defaultLines.map((l) => {
      const prod = products.find((p) => p.id === l.productId) || products[0];
      const calc = calculateOrderLine(prod.sellingPrice, 0, l.quantity, 0, 18);
      return {
        id: 'SUBL-' + Math.random().toString(36).substring(2, 9),
        productId: prod.id,
        productName: prod.name,
        quantity: l.quantity,
        unitPrice: prod.sellingPrice,
        variantExtra: 0,
        taxPercent: 18,
        discountPercent: 0,
        lineTotal: calc.lineTotal,
      };
    });

    const totals = calculateTotals(builtLines, 0);
    const allSubs = subscriptionsRepo.getAll(null);
    const subNumber = `SUB-2026-${String(allSubs.length + 1).padStart(6, '0')}`;

    const expiry = new Date(effectiveToday);
    expiry.setDate(expiry.getDate() + selectedTemplateForQuote.validityDays);

    const newSub: Subscription = {
      id: 'SUB-' + Math.random().toString(36).substring(2, 9),
      subscriptionNumber: subNumber,
      customerId: targetCustomerId,
      planId: plan.id,
      status: 'Quotation',
      startDate: effectiveToday,
      expiryDate: expiry.toISOString().split('T')[0],
      nextBillingDate: effectiveToday,
      paymentTerms: selectedTemplateForQuote.paymentTerms,
      lines: builtLines,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      createdAt: new Date().toISOString(),
    };

    subscriptionsRepo.create(newSub, user);
    showToast('success', 'Quotation Generated', `Quotation ${subNumber} created from template.`);
    setIsCreateFromTemplateModalOpen(false);
    setSelectedSubId(newSub.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quotations & Templates</h1>
          <p className="text-xs text-slate-500 mt-1">
            Pre-configured sales packages with default plans, validity periods, and product lines.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsNewTemplateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Quotation Template</span>
          </button>
        )}
      </div>

      {/* Templates Grid */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
          Available Quotation Templates ({templates.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map((tmpl) => {
            const plan = plans.find((p) => p.id === tmpl.defaultPlanId);
            return (
              <div
                key={tmpl.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-slate-900 text-sm">{tmpl.name}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                      Valid {tmpl.validityDays} Days
                    </span>
                  </div>
                  <p className="text-xs text-indigo-600 font-semibold mt-2">
                    Default Plan: {plan?.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Terms: <strong className="text-slate-700 font-medium">{tmpl.paymentTerms}</strong> · Lines: {tmpl.defaultLines.length} products
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {tmpl.id}
                  </span>
                  {canManage && (
                    <button
                      onClick={() => handleLaunchQuotationFromTemplate(tmpl)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Create Quote</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending / Active Quotations List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">
            Pending & Draft Quotations ({quotations.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Quotation #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4">Valid Until</th>
                <th className="py-3 px-4 text-right">Estimated Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No open quotations at present.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => {
                  const cust = customers.find((c) => c.id === q.customerId);
                  const plan = plans.find((p) => p.id === q.planId);
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {q.subscriptionNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{cust?.name}</span>
                        {cust?.company && <span className="text-[11px] text-slate-500 block">{cust.company}</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{plan?.name}</td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(q.expiryDate)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatINR(q.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedSubId(q.id)}
                          className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View & Print</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quotation Viewer Modal */}
      <QuotationViewModal
        subscriptionId={selectedSubId}
        onClose={() => setSelectedSubId(null)}
      />

      {/* Create Quote from Template Modal */}
      {isCreateFromTemplateModalOpen && selectedTemplateForQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Create Quote from Template
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Template: <strong className="text-slate-800">{selectedTemplateForQuote.name}</strong>
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Customer</label>
                <select
                  value={targetCustomerId}
                  onChange={(e) => setTargetCustomerId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <p className="text-slate-600">Validity: {selectedTemplateForQuote.validityDays} Days</p>
                <p className="text-slate-600">Payment Terms: {selectedTemplateForQuote.paymentTerms}</p>
                <p className="text-slate-600">Included Products: {selectedTemplateForQuote.defaultLines.length}</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateFromTemplateModalOpen(false)}
                  className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmQuoteGeneration}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-xs"
                >
                  Generate Quotation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Template Modal */}
      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Create Quotation Template</h3>

            <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Template Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard SaaS Growth Bundle"
                  value={tmplName}
                  onChange={(e) => setTmplName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Default Plan</label>
                  <select
                    value={tmplPlanId}
                    onChange={(e) => setTmplPlanId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={tmplValidity}
                    onChange={(e) => setTmplValidity(parseInt(e.target.value) || 30)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
                <select
                  value={tmplTerms}
                  onChange={(e) => setTmplTerms(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Immediate">Immediate</option>
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewTemplateModalOpen(false)}
                  className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-xs"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
