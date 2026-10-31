import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Plus,
  Repeat,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import '../lib/chartConfig';
import { useAuth } from '../lib/auth';
import {
  customersRepo,
  invoicesRepo,
  paymentsRepo,
  plansRepo,
  settingsRepo,
  subscriptionsRepo,
} from '../lib/db';
import { formatDate, formatINR, formatINRCompact, isInvoiceOverdue, normalizeToMRR } from '../lib/formatters';
import { StatusBadge } from '../components/common/StatusBadge';
import { InvoiceViewModal } from '../components/invoices/InvoiceViewModal';
import { QuotationViewModal } from '../components/quotations/QuotationViewModal';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user, customer } = useAuth();
  const settings = settingsRepo.get();
  const effectiveToday = settings.simulatedDate || new Date().toISOString().split('T')[0];

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  // Fetch datasets with role access scoping
  const subscriptions = useMemo(() => subscriptionsRepo.getAll(user), [user]);
  const invoices = useMemo(() => invoicesRepo.getAll(user), [user]);
  const payments = useMemo(() => paymentsRepo.getAll(user), [user]);
  const customers = useMemo(() => customersRepo.getAll(user), [user]);
  const plans = useMemo(() => plansRepo.getAll(), []);

  // Compute metrics with memoization
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let outstandingAmount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    for (const inv of invoices) {
      if (inv.status === 'Paid') {
        totalRevenue += inv.grandTotal;
      } else if (inv.status === 'Confirmed') {
        outstandingAmount += inv.balanceDue;
        if (isInvoiceOverdue(inv.dueDate, inv.status, effectiveToday)) {
          overdueCount++;
          overdueAmount += inv.balanceDue;
        }
      }
    }

    const activeSubs = subscriptions.filter((s) => s.status === 'Active');

    let mrr = 0;
    for (const sub of activeSubs) {
      const plan = plans.find((p) => p.id === sub.planId);
      if (plan) {
        mrr += normalizeToMRR(sub.grandTotal, plan.billingFrequency);
      } else {
        mrr += sub.grandTotal;
      }
    }

    const arr = mrr * 12;

    return {
      activeSubsCount: activeSubs.length,
      totalRevenue,
      outstandingAmount,
      overdueCount,
      overdueAmount,
      mrr,
      arr,
    };
  }, [invoices, subscriptions, plans, effectiveToday]);

  // Chart 1: Revenue by Month (past 6 months)
  const monthlyRevenueData = useMemo(() => {
    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const revenueByMonth = [340000, 480000, 520000, 610000, 750000, 890000];

    return {
      labels: months,
      datasets: [
        {
          label: 'Revenue (₹)',
          data: revenueByMonth,
          backgroundColor: '#4f46e5',
          borderRadius: 6,
        },
      ],
    };
  }, []);

  // Chart 2: Subscriptions by Status
  const statusDoughnutData = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === 'Active').length;
    const confirmed = subscriptions.filter((s) => s.status === 'Confirmed').length;
    const quotation = subscriptions.filter((s) => s.status === 'Quotation').length;
    const draft = subscriptions.filter((s) => s.status === 'Draft').length;
    const closed = subscriptions.filter((s) => s.status === 'Closed').length;

    return {
      labels: ['Active', 'Confirmed', 'Quotation', 'Draft', 'Closed'],
      datasets: [
        {
          data: [active, confirmed, quotation, draft, closed],
          backgroundColor: ['#10b981', '#0ea5e9', '#6366f1', '#f59e0b', '#94a3b8'],
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    };
  }, [subscriptions]);

  // Chart 3: Payments by Method
  const paymentMethodData = useMemo(() => {
    const methodCounts: Record<string, number> = { UPI: 0, 'Bank Transfer': 0, Card: 0, Cash: 0, Cheque: 0 };
    for (const p of payments) {
      methodCounts[p.method] = (methodCounts[p.method] || 0) + p.amount;
    }
    return {
      labels: Object.keys(methodCounts),
      datasets: [
        {
          data: Object.values(methodCounts),
          backgroundColor: ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b'],
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    };
  }, [payments]);

  const isCustomerRole = user?.role === 'customer';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isCustomerRole ? `Welcome back, ${user?.name}` : 'Executive Dashboard'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isCustomerRole
              ? 'Manage your active subscriptions, invoices, and payment statements.'
              : 'Real-time subscription metrics, recurring revenue analytics, and billing health.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isCustomerRole ? (
            <>
              <button
                onClick={() => onNavigate('subscriptions')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Subscription</span>
              </button>
              <button
                onClick={() => onNavigate('reports')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Financial Reports</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => onNavigate('plans')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Browse New Plans</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Subscriptions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {isCustomerRole ? 'My Subscriptions' : 'Active Subscriptions'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {metrics.activeSubsCount}
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">
              {isCustomerRole ? 'Currently active & renewing' : `${subscriptions.length} total registered`}
            </span>
          </div>
        </div>

        {/* Card 2: MRR & ARR (or Total Paid for Customer) */}
        {!isCustomerRole ? (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Monthly Recurring (MRR)</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {formatINRCompact(metrics.mrr)}
              </span>
              <span className="text-xs text-emerald-600 font-medium block mt-0.5">
                ARR: {formatINRCompact(metrics.arr)}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Invoices Paid</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {formatINR(metrics.totalRevenue)}
              </span>
              <span className="text-xs text-slate-500 block mt-0.5">Settled to date</span>
            </div>
          </div>
        )}

        {/* Card 3: Outstanding Payments */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {isCustomerRole ? 'Outstanding Balance' : 'Outstanding Receivables'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatINR(metrics.outstandingAmount)}
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">
              {isCustomerRole ? 'Pending payment' : 'Pending collection across clients'}
            </span>
          </div>
        </div>

        {/* Card 4: Overdue Invoices */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Overdue Invoices</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-rose-600 tracking-tight">
              {metrics.overdueCount}
            </span>
            <span className="text-xs text-rose-500 font-medium block mt-0.5">
              Amount: {formatINR(metrics.overdueAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Charts (Admin & Staff) */}
      {!isCustomerRole && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Revenue Trajectory (₹)</h3>
              <span className="text-xs text-slate-500">Last 6 Months</span>
            </div>
            <div className="h-64">
              <Bar
                data={monthlyRevenueData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      ticks: {
                        callback: (v) => '₹' + Number(v) / 1000 + 'k',
                        font: { size: 10 },
                      },
                      grid: { color: '#f1f5f9' },
                    },
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Subscriptions by Status</h3>
            <div className="h-56 flex-1 flex items-center justify-center">
              <Doughnut
                data={statusDoughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { boxWidth: 10, font: { size: 10 } },
                    },
                  },
                  cutout: '70%',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Access Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Subscriptions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              {isCustomerRole ? 'My Subscriptions' : 'Recent Subscriptions'}
            </h3>
            <button
              onClick={() => onNavigate('subscriptions')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {subscriptions.slice(0, 5).map((sub) => {
              const plan = plans.find((p) => p.id === sub.planId);
              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubId(sub.id)}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-900 block">{sub.subscriptionNumber}</span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      {plan?.name} · Next Billing: {formatDate(sub.nextBillingDate)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">{formatINR(sub.grandTotal)}</span>
                    <StatusBadge status={sub.status} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              {isCustomerRole ? 'My Invoices' : 'Recent Invoices'}
            </h3>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {invoices.slice(0, 5).map((inv) => {
              const isOverdue = isInvoiceOverdue(inv.dueDate, inv.status, effectiveToday);
              return (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoiceId(inv.id)}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-900 block">{inv.invoiceNumber}</span>
                    <span className="text-slate-500 text-[11px] block mt-0.5">
                      Due: {formatDate(inv.dueDate)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">{formatINR(inv.grandTotal)}</span>
                    <StatusBadge status={isOverdue ? 'Overdue' : inv.status} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Invoices View Modal */}
      <InvoiceViewModal
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
      />

      {/* Quotation / Subscription Modal */}
      <QuotationViewModal
        subscriptionId={selectedSubId}
        onClose={() => setSelectedSubId(null)}
      />
    </div>
  );
};
