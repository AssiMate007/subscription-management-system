import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  Download,
  Mail,
  MessageSquare,
  Printer,
  X,
} from 'lucide-react';
import { Customer, Invoice, PaymentMethod, Plan, Subscription } from '../../types';
import { useAuth } from '../../lib/auth';
import {
  customersRepo,
  invoicesRepo,
  mockEmailsRepo,
  paymentsRepo,
  plansRepo,
  settingsRepo,
  subscriptionsRepo,
} from '../../lib/db';
import { formatDate, formatINR, isInvoiceOverdue } from '../../lib/formatters';
import { generateInvoicePDF } from '../../lib/pdf';
import { StatusBadge } from '../common/StatusBadge';
import { useToast } from '../../context/ToastContext';

interface InvoiceViewModalProps {
  invoiceId: string | null;
  onClose: () => void;
  onInvoiceUpdated?: () => void;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  invoiceId,
  onClose,
  onInvoiceUpdated,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [newNote, setNewNote] = useState('');

  if (!invoiceId) return null;

  const invoice = invoicesRepo.getById(invoiceId, user);
  if (!invoice) return null;

  const customer = customersRepo.getById(invoice.customerId, user);
  const subscription = subscriptionsRepo.getById(invoice.subscriptionId, user);
  const plan = subscription ? plansRepo.getById(subscription.planId) : undefined;
  const settings = settingsRepo.get();
  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];
  const isOverdue = isInvoiceOverdue(invoice.dueDate, invoice.status, effectiveToday);

  const canManage = user?.role === 'admin' || user?.role === 'staff';

  const handleDownloadPDF = () => {
    generateInvoicePDF(invoice, customer, subscription, plan);
    showToast('success', 'PDF Generated', `Invoice ${invoice.invoiceNumber}.pdf downloaded.`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    if (!customer) return;
    mockEmailsRepo.send({
      toEmail: customer.email,
      toName: customer.name,
      subject: `Invoice ${invoice.invoiceNumber} from Brightloop Software`,
      type: 'invoice_sent',
      content: `Dear ${customer.name},\n\nPlease find attached invoice ${invoice.invoiceNumber} for amount ${formatINR(
        invoice.grandTotal
      )}.\nDue Date: ${formatDate(invoice.dueDate)}\nBalance Due: ${formatINR(invoice.balanceDue)}\n\nThank you!`,
    });
    invoicesRepo.update(invoice.id, { sentAt: new Date().toISOString() }, user);
    showToast('success', 'Invoice Dispatched', `Simulated email dispatched to ${customer.email} in Mock Inbox.`);
    onInvoiceUpdated?.();
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !user) return;
    invoicesRepo.addFollowUpNote(invoice.id, newNote.trim(), user);
    setNewNote('');
    showToast('info', 'Note Saved', 'Follow-up internal note recorded.');
    onInvoiceUpdated?.();
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('error', 'Invalid Amount', 'Please enter a valid positive payment amount.');
      return;
    }
    if (amountNum > invoice.balanceDue + 0.01) {
      showToast('error', 'Amount Exceeds Balance', `Maximum payable amount is ${formatINR(invoice.balanceDue)}.`);
      return;
    }

    try {
      const allPayments = paymentsRepo.getAll(null);
      const payNumber = `PAY-2026-${String(allPayments.length + 1).padStart(6, '0')}`;

      paymentsRepo.recordPayment(
        {
          id: 'PAY-' + Math.random().toString(36).substring(2, 9),
          paymentNumber: payNumber,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount: amountNum,
          date: effectiveToday,
          method: paymentMethod,
          notes: paymentNotes || 'Manual payment entry',
          transactionRef: `${paymentMethod.toUpperCase()}/REF-${Math.floor(100000 + Math.random() * 900000)}`,
          createdAt: new Date().toISOString(),
        },
        user
      );

      showToast('success', 'Payment Recorded', `Recorded ${formatINR(amountNum)} via ${paymentMethod}.`);
      setIsRecordingPayment(false);
      setPaymentAmount('');
      setPaymentNotes('');
      onInvoiceUpdated?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Payment Failed', msg);
    }
  };

  const handleCancelInvoice = () => {
    if (invoice.amountPaid > 0) {
      showToast('error', 'Cannot Cancel', 'Invoices with recorded payments cannot be cancelled.');
      return;
    }
    invoicesRepo.update(invoice.id, { status: 'Cancelled' }, user);
    showToast('info', 'Invoice Cancelled', `Invoice ${invoice.invoiceNumber} status set to Cancelled.`);
    onInvoiceUpdated?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Modal Header Actions */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-900 text-base">{invoice.invoiceNumber}</span>
            <StatusBadge status={isOverdue ? 'Overdue' : invoice.status} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
              title="Print invoice"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            {canManage && (
              <button
                onClick={handleSendEmail}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors shadow-xs"
                title="Send via simulated email to Mock Inbox"
              >
                <Mail className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send Email</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Printable Invoice Document */}
        <div className="overflow-y-auto p-6 sm:p-8 flex-1 print-page">
          {/* Header Banner */}
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
              <p className="text-xs text-slate-600 font-mono mt-1">
                GSTIN: <span className="font-semibold text-slate-900">{settings.companyGstin}</span>
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-xs uppercase tracking-wider font-bold text-indigo-600 block">
                TAX INVOICE
              </span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{invoice.invoiceNumber}</p>
              <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                <p>
                  Issue Date: <span className="font-medium text-slate-800">{formatDate(invoice.issueDate)}</span>
                </p>
                <p>
                  Due Date: <span className={`font-medium ${isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-800'}`}>{formatDate(invoice.dueDate)}</span>
                </p>
                <p>
                  Terms: <span className="font-medium text-slate-800">{subscription?.paymentTerms || 'Net 15'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Billed To & Subscription Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs">
            <div>
              <p className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] mb-2">Billed To</p>
              <p className="text-sm font-bold text-slate-900">{customer?.name}</p>
              {customer?.company && <p className="text-slate-700 font-medium">{customer.company}</p>}
              <p className="text-slate-600 mt-1">{customer?.address}</p>
              <p className="text-slate-600">{customer?.city}, {customer?.state} - {customer?.pincode}</p>
              <p className="text-slate-600 mt-1">Email: {customer?.email}</p>
              {customer?.gstin && <p className="font-mono text-slate-700 font-medium mt-0.5">GSTIN: {customer.gstin}</p>}
            </div>

            <div className="sm:text-right">
              <p className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] mb-2">Subscription Info</p>
              <p className="text-slate-900 font-medium">Ref: {subscription?.subscriptionNumber || 'N/A'}</p>
              <p className="text-slate-600">Plan: {plan?.name || 'Selected Plan'}</p>
              <p className="text-slate-600 mt-1">
                Period: {formatDate(invoice.billingPeriodStart)} to {formatDate(invoice.billingPeriodEnd)}
              </p>
              <p className="text-slate-500 text-[11px] mt-2">
                Idempotency: <span className="font-mono">{invoice.idempotencyKey}</span>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-6">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Item Description</th>
                  <th className="pb-2.5 text-center">Qty</th>
                  <th className="pb-2.5 text-right">Unit Price</th>
                  <th className="pb-2.5 text-right">GST %</th>
                  <th className="pb-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.lines.map((line) => (
                  <tr key={line.id} className="text-slate-800">
                    <td className="py-3 font-medium text-slate-900">{line.description}</td>
                    <td className="py-3 text-center">{line.quantity}</td>
                    <td className="py-3 text-right">{formatINR(line.unitPrice)}</td>
                    <td className="py-3 text-right">{line.taxPercent}%</td>
                    <td className="py-3 text-right font-medium">{formatINR(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end pt-4 border-t border-slate-200">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-900">{formatINR(invoice.subtotal)}</span>
              </div>
              {invoice.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount ({invoice.appliedDiscountCode || 'Applied'}):</span>
                  <span className="font-medium">-{formatINR(invoice.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST (18%):</span>
                <span className="font-medium text-slate-900">{formatINR(invoice.taxTotal)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                <span>Grand Total:</span>
                <span>{formatINR(invoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Amount Paid:</span>
                <span className="font-medium text-emerald-700">{formatINR(invoice.amountPaid)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold">
                <span className={invoice.balanceDue > 0 ? 'text-rose-600' : 'text-slate-900'}>Balance Due:</span>
                <span className={invoice.balanceDue > 0 ? 'text-rose-600 font-extrabold' : 'text-slate-900'}>
                  {formatINR(invoice.balanceDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Remittance Information */}
          <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <h4 className="font-semibold text-slate-900 mb-1">Bank Remittance & UPI Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] mt-2">
              <p>Account Name: <strong className="text-slate-800">Brightloop Software Pvt Ltd</strong></p>
              <p>Bank: <strong className="text-slate-800">HDFC Bank Ltd</strong></p>
              <p>A/C Number: <strong className="font-mono text-slate-800">50200012345678</strong></p>
              <p>IFSC Code: <strong className="font-mono text-slate-800">HDFC0001234</strong></p>
              <p>UPI ID: <strong className="font-mono text-slate-800">brightloop@hdfcbank</strong></p>
              <p>Ref: <strong className="font-mono text-slate-800">{invoice.invoiceNumber}</strong></p>
            </div>
          </div>

          {/* Internal Follow-Up Notes (Admin/Staff only) */}
          {canManage && (
            <div className="no-print mt-8 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Staff Follow-up & Collection Notes ({invoice.followUpNotes?.length || 0})
                </h4>
              </div>

              <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Add a collection note or customer conversation log..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newNote.trim()}
                  className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  Post Note
                </button>
              </form>

              <div className="space-y-2">
                {invoice.followUpNotes?.map((note) => (
                  <div key={note.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="font-semibold text-slate-800">
                        {note.authorName} ({note.authorRole})
                      </span>
                      <span>{formatDate(note.timestamp)}</span>
                    </div>
                    <p className="text-slate-700">{note.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="no-print p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {canManage && invoice.balanceDue > 0 && invoice.status !== 'Cancelled' && (
              <button
                onClick={() => {
                  setPaymentAmount(String(invoice.balanceDue));
                  setIsRecordingPayment(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Record Payment ({formatINR(invoice.balanceDue)})</span>
              </button>
            )}

            {canManage && invoice.status !== 'Cancelled' && invoice.amountPaid === 0 && (
              <button
                onClick={handleCancelInvoice}
                className="px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                Cancel Invoice
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

        {/* Record Payment Sub-Modal */}
        {isRecordingPayment && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-slate-900">Record Payment</h3>
                <button
                  onClick={() => setIsRecordingPayment(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    disabled
                    value={invoice.invoiceNumber}
                    className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Payment Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={invoice.balanceDue}
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-900"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Outstanding Balance: {formatINR(invoice.balanceDue)}
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                    <option value="Card">Credit / Debit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Notes / Transaction Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. Bank UTR number or cash receipt note"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRecordingPayment(false)}
                    className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-xs"
                  >
                    Confirm & Apply Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
