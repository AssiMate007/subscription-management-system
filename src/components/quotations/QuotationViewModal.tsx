import React from 'react';
import { Check, Download, Printer, X } from 'lucide-react';
import { Subscription } from '../../types';
import { useAuth } from '../../lib/auth';
import { customersRepo, plansRepo, settingsRepo, subscriptionsRepo } from '../../lib/db';
import { formatDate, formatINR } from '../../lib/formatters';
import { generateQuotationPDF } from '../../lib/pdf';
import { StatusBadge } from '../common/StatusBadge';
import { useToast } from '../../context/ToastContext';

interface QuotationViewModalProps {
  subscriptionId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export const QuotationViewModal: React.FC<QuotationViewModalProps> = ({
  subscriptionId,
  onClose,
  onUpdated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  if (!subscriptionId) return null;

  const subscription = subscriptionsRepo.getById(subscriptionId, user);
  if (!subscription) return null;

  const customer = customersRepo.getById(subscription.customerId, user);
  const plan = plansRepo.getById(subscription.planId);
  const settings = settingsRepo.get();

  const handleDownloadPDF = () => {
    generateQuotationPDF(subscription, customer, plan);
    showToast('success', 'PDF Downloaded', `Quotation ${subscription.subscriptionNumber}.pdf saved.`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmQuotation = () => {
    try {
      subscriptionsRepo.update(subscription.id, { status: 'Confirmed' }, user);
      showToast('success', 'Quotation Confirmed', 'The quotation has been confirmed. Staff can now activate recurring billing.');
      onUpdated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Action Failed', msg);
    }
  };

  const handleActivate = () => {
    try {
      subscriptionsRepo.update(subscription.id, { status: 'Active' }, user);
      showToast('success', 'Subscription Activated', 'Subscription is now active and recurring billing is scheduled.');
      onUpdated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Action Failed', msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-900 text-base">{subscription.subscriptionNumber}</span>
            <StatusBadge status={subscription.status} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quotation Body */}
        <div className="overflow-y-auto p-6 sm:p-8 flex-1 print-page">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base">
                  B
                </div>
                <h1 className="text-xl font-bold text-slate-900">{settings.companyName}</h1>
              </div>
              <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
                {settings.companyAddress}
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-xs uppercase tracking-wider font-bold text-indigo-600 block">
                SUBSCRIPTION QUOTATION
              </span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{subscription.subscriptionNumber}</p>
              <p className="text-xs text-slate-500 mt-1">
                Date: <span className="font-medium text-slate-800">{formatDate(subscription.startDate)}</span>
              </p>
              <p className="text-xs text-slate-500">
                Plan: <span className="font-medium text-slate-800">{plan?.name}</span>
              </p>
            </div>
          </div>

          {/* Customer info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs">
            <div>
              <p className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] mb-2">Prepared For</p>
              <p className="text-sm font-bold text-slate-900">{customer?.name}</p>
              {customer?.company && <p className="text-slate-700 font-medium">{customer.company}</p>}
              <p className="text-slate-600 mt-1">{customer?.address}, {customer?.city}</p>
              <p className="text-slate-600">{customer?.email} | {customer?.phone}</p>
            </div>
            <div className="sm:text-right">
              <p className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] mb-2">Terms & Validity</p>
              <p className="text-slate-800 font-medium">Payment Terms: {subscription.paymentTerms}</p>
              <p className="text-slate-600">Billing Cycle: {plan?.billingFrequency}</p>
              <p className="text-slate-600">Valid Through: {formatDate(subscription.expiryDate)}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-6">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Product / Variant</th>
                  <th className="pb-2.5 text-center">Qty</th>
                  <th className="pb-2.5 text-right">Unit Price</th>
                  <th className="pb-2.5 text-right">Discount</th>
                  <th className="pb-2.5 text-right">GST %</th>
                  <th className="pb-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscription.lines.map((line) => (
                  <tr key={line.id} className="text-slate-800">
                    <td className="py-3">
                      <p className="font-medium text-slate-900">{line.productName}</p>
                      {line.variantName && (
                        <p className="text-slate-500 text-[11px]">Variant: {line.variantName}</p>
                      )}
                    </td>
                    <td className="py-3 text-center">{line.quantity}</td>
                    <td className="py-3 text-right">{formatINR(line.unitPrice + line.variantExtra)}</td>
                    <td className="py-3 text-right">{line.discountPercent}%</td>
                    <td className="py-3 text-right">{line.taxPercent}%</td>
                    <td className="py-3 text-right font-medium">{formatINR(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-900">{formatINR(subscription.subtotal)}</span>
              </div>
              {subscription.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span className="font-medium">-{formatINR(subscription.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST (18%):</span>
                <span className="font-medium text-slate-900">{formatINR(subscription.taxTotal)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                <span>Grand Total:</span>
                <span>{formatINR(subscription.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="no-print p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div>
            {subscription.status === 'Quotation' && (
              <button
                onClick={handleConfirmQuotation}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Quotation</span>
              </button>
            )}

            {(user?.role === 'admin' || user?.role === 'staff') && subscription.status === 'Confirmed' && (
              <button
                onClick={handleActivate}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Activate Subscription</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
