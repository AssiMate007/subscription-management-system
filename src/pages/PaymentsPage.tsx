import React, { useMemo, useState } from 'react';
import {
  CreditCard,
  Download,
  Filter,
  Plus,
  Receipt,
  Search,
} from 'lucide-react';
import { PaymentMethod } from '../types';
import { useAuth } from '../lib/auth';
import {
  customersRepo,
  invoicesRepo,
  paymentsRepo,
  settingsRepo,
} from '../lib/db';
import { formatDate, formatINR } from '../lib/formatters';
import { Pagination } from '../components/common/Pagination';
import { InvoiceViewModal } from '../components/invoices/InvoiceViewModal';
import { useToast } from '../context/ToastContext';

export const PaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const settings = settingsRepo.get();
  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];

  const canManage = user?.role === 'admin' || user?.role === 'staff';

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // New payment form
  const [targetInvoiceId, setTargetInvoiceId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const payments = useMemo(() => paymentsRepo.getAll(user), [user]);
  const invoices = useMemo(() => invoicesRepo.getAll(user), [user]);
  const customers = useMemo(() => customersRepo.getAll(user), [user]);

  // Outstanding invoices eligible for payment
  const unpaidInvoices = useMemo(() => {
    return invoices.filter((i) => i.balanceDue > 0 && i.status !== 'Cancelled');
  }, [invoices]);

  // Total collected calculation
  const totalCollected = useMemo(() => {
    return payments.reduce((acc, p) => acc + p.amount, 0);
  }, [payments]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (methodFilter !== 'all' && p.method !== methodFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pNum = p.paymentNumber.toLowerCase();
        const ref = p.transactionRef.toLowerCase();
        const cust = customers.find((c) => c.id === p.customerId);
        const name = cust?.name.toLowerCase() || '';
        const comp = cust?.company?.toLowerCase() || '';
        if (!pNum.includes(q) && !ref.includes(q) && !name.includes(q) && !comp.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [payments, methodFilter, searchQuery, customers]);

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const invoice = invoices.find((i) => i.id === targetInvoiceId);
    if (!invoice) {
      showToast('error', 'Select Invoice', 'Please select an unpaid invoice.');
      return;
    }

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('error', 'Invalid Amount', 'Enter a valid payment amount greater than ₹0.');
      return;
    }

    if (amt > invoice.balanceDue + 0.01) {
      showToast('error', 'Exceeds Balance', `Maximum payable amount is ${formatINR(invoice.balanceDue)}.`);
      return;
    }

    try {
      const allPayments = paymentsRepo.getAll(null);
      const payNum = `PAY-2026-${String(allPayments.length + 1).padStart(6, '0')}`;

      paymentsRepo.recordPayment(
        {
          id: 'PAY-' + Math.random().toString(36).substring(2, 9),
          paymentNumber: payNum,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount: amt,
          date: effectiveToday,
          method: paymentMethod,
          notes: paymentNotes || 'Manual payment receipt entry',
          transactionRef: `${paymentMethod.toUpperCase()}/TXN-${Math.floor(100000 + Math.random() * 900000)}`,
          createdAt: new Date().toISOString(),
        },
        user
      );

      showToast('success', 'Payment Logged', `Recorded ${formatINR(amt)} via ${paymentMethod}.`);
      setIsRecordModalOpen(false);
      setTargetInvoiceId('');
      setPaymentAmount('');
      setPaymentNotes('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Failed to Record Payment', msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payments & Receipts</h1>
          <p className="text-xs text-slate-500 mt-1">
            Reconcile payments across UPI, Bank Transfer, Cards, Cash, and Cheques.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        )}
      </div>

      {/* Summary Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total Payments Collected
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatINR(totalCollected)}</p>
        </div>
        <div className="text-xs text-slate-500 sm:text-right">
          <p>
            Total Transactions: <strong className="text-slate-900 font-semibold">{payments.length}</strong>
          </p>
          <p className="mt-0.5">
            Pending Unpaid Invoices: <strong className="text-rose-600 font-semibold">{unpaidInvoices.length}</strong>
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by payment reference, customer name, transaction..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Payment Methods</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Card">Card</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p) => {
                  const customer = customers.find((c) => c.id === p.customerId);
                  const invoice = invoices.find((i) => i.id === p.invoiceId);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {p.paymentNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{customer?.name || 'Customer'}</span>
                        {customer?.company && (
                          <span className="text-[11px] text-slate-500 block">{customer.company}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <button
                          onClick={() => setSelectedInvoiceId(p.invoiceId)}
                          className="text-indigo-600 hover:underline font-semibold"
                        >
                          {invoice?.invoiceNumber || 'INV-REF'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(p.date)}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.method}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">{p.transactionRef}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        {formatINR(p.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedInvoiceId(p.invoiceId)}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors inline-flex items-center gap-1"
                        >
                          <Receipt className="w-3 h-3 text-slate-500" />
                          <span>View Invoice</span>
                        </button>
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
          totalItems={filteredPayments.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Invoice View Modal */}
      <InvoiceViewModal
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
      />

      {/* Record Payment Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Record Payment Entry</h3>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Unpaid Invoice <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetInvoiceId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setTargetInvoiceId(id);
                    const matched = unpaidInvoices.find((i) => i.id === id);
                    if (matched) {
                      setPaymentAmount(String(matched.balanceDue));
                    }
                  }}
                  required
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select Invoice with outstanding balance...</option>
                  {unpaidInvoices.map((inv) => {
                    const cust = customers.find((c) => c.id === inv.customerId);
                    return (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {cust?.name} (Balance: {formatINR(inv.balanceDue)})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transaction Ref / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. UTR number, cheque number, or receipt remarks"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-xs"
                >
                  Save & Apply Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
