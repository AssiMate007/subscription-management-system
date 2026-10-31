import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileText,
  Mail,
  Printer,
  Search,
} from 'lucide-react';
import { Invoice } from '../types';
import { useAuth } from '../lib/auth';
import {
  customersRepo,
  invoicesRepo,
  mockEmailsRepo,
  settingsRepo,
} from '../lib/db';
import { formatDate, formatINR, getDaysOverdue, isInvoiceOverdue } from '../lib/formatters';
import { generateInvoicePDF } from '../lib/pdf';
import { Pagination } from '../components/common/Pagination';
import { StatusBadge } from '../components/common/StatusBadge';
import { InvoiceViewModal } from '../components/invoices/InvoiceViewModal';
import { useToast } from '../context/ToastContext';

export const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const settings = settingsRepo.get();
  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];

  const canManage = user?.role === 'admin' || user?.role === 'staff';

  // Tabs: 'all' | 'outstanding' | 'overdue' | 'paid' | 'draft' | 'cancelled'
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const invoices = useMemo(() => invoicesRepo.getAll(user), [user]);
  const customers = useMemo(() => customersRepo.getAll(user), [user]);

  // Tab counts
  const tabCounts = useMemo(() => {
    let outstanding = 0;
    let overdue = 0;
    let paid = 0;
    let draft = 0;
    let cancelled = 0;

    for (const inv of invoices) {
      if (inv.status === 'Paid') paid++;
      else if (inv.status === 'Draft') draft++;
      else if (inv.status === 'Cancelled') cancelled++;
      else if (inv.status === 'Confirmed') {
        outstanding++;
        if (isInvoiceOverdue(inv.dueDate, inv.status, effectiveToday)) {
          overdue++;
        }
      }
    }

    return { all: invoices.length, outstanding, overdue, paid, draft, cancelled };
  }, [invoices, effectiveToday]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const isOverdue = isInvoiceOverdue(inv.dueDate, inv.status, effectiveToday);

      if (activeTab === 'outstanding' && inv.status !== 'Confirmed') return false;
      if (activeTab === 'overdue' && !isOverdue) return false;
      if (activeTab === 'paid' && inv.status !== 'Paid') return false;
      if (activeTab === 'draft' && inv.status !== 'Draft') return false;
      if (activeTab === 'cancelled' && inv.status !== 'Cancelled') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const num = inv.invoiceNumber.toLowerCase();
        const cust = customers.find((c) => c.id === inv.customerId);
        const name = cust?.name.toLowerCase() || '';
        const comp = cust?.company?.toLowerCase() || '';
        if (!num.includes(q) && !name.includes(q) && !comp.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [invoices, activeTab, searchQuery, customers, effectiveToday]);

  // Paginated
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  const handleSendReminder = (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    const cust = customers.find((c) => c.id === inv.customerId);
    if (!cust) return;

    const days = getDaysOverdue(inv.dueDate, effectiveToday);
    mockEmailsRepo.send({
      toEmail: cust.email,
      toName: cust.name,
      subject: `Payment Reminder: Overdue Invoice ${inv.invoiceNumber}`,
      type: 'payment_reminder',
      content: `Dear ${cust.name},\n\nThis is a reminder that invoice ${inv.invoiceNumber} for amount ${formatINR(
        inv.balanceDue
      )} was due on ${formatDate(inv.dueDate)} (${days > 0 ? `${days} days overdue` : 'due today'}).\n\nPlease arrange for payment via UPI or Net Banking to avoid service interruption.\n\nThank you,\nBrightloop Software Billing`,
    });

    showToast('success', 'Reminder Sent', `Simulated payment reminder dispatched to ${cust.email} in Mock Inbox.`);
  };

  const handleQuickDownloadPDF = (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    const cust = customers.find((c) => c.id === inv.customerId);
    generateInvoicePDF(inv, cust);
    showToast('success', 'PDF Saved', `Invoice ${inv.invoiceNumber}.pdf downloaded.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoices & Receivables</h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated recurring invoices, payment reconciliation, and reminder dispatch.
          </p>
        </div>
      </div>

      {/* Segmented Filter Tabs (Interactive Controls) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-medium">
          <button
            onClick={() => {
              setActiveTab('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Invoices ({tabCounts.all})
          </button>

          <button
            onClick={() => {
              setActiveTab('outstanding');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'outstanding'
                ? 'bg-white text-sky-800 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Outstanding ({tabCounts.outstanding})
          </button>

          <button
            onClick={() => {
              setActiveTab('overdue');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'overdue'
                ? 'bg-white text-rose-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overdue ({tabCounts.overdue})
          </button>

          <button
            onClick={() => {
              setActiveTab('paid');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'paid'
                ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Paid ({tabCounts.paid})
          </button>

          <button
            onClick={() => {
              setActiveTab('draft');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'draft'
                ? 'bg-white text-amber-800 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Draft ({tabCounts.draft})
          </button>

          <button
            onClick={() => {
              setActiveTab('cancelled');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'cancelled'
                ? 'bg-white text-slate-800 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cancelled ({tabCounts.cancelled})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by invoice number, customer, company..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => {
                  const customer = customers.find((c) => c.id === inv.customerId);
                  const isOverdue = isInvoiceOverdue(inv.dueDate, inv.status, effectiveToday);
                  const daysOverdue = getDaysOverdue(inv.dueDate, effectiveToday);

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoiceId(inv.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{customer?.name || 'Customer'}</span>
                        {customer?.company && (
                          <span className="text-[11px] text-slate-500 block">{customer.company}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(inv.issueDate)}</td>
                      <td className="py-3 px-4">
                        <span className={isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
                          {formatDate(inv.dueDate)}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] text-rose-500 block">
                            {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">
                        {formatINR(inv.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span className={inv.balanceDue > 0 ? 'text-rose-600' : 'text-slate-900'}>
                          {formatINR(inv.balanceDue)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={isOverdue ? 'Overdue' : inv.status} />
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedInvoiceId(inv.id)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => handleQuickDownloadPDF(inv, e)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {canManage && isOverdue && (
                            <button
                              onClick={(e) => handleSendReminder(inv, e)}
                              className="px-2 py-1 text-[11px] font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 rounded transition-colors inline-flex items-center gap-1"
                              title="Send overdue reminder to Mock Inbox"
                            >
                              <Mail className="w-3 h-3" />
                              <span>Remind</span>
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
          totalItems={filteredInvoices.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Invoice Detail Modal */}
      <InvoiceViewModal
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
      />
    </div>
  );
};
