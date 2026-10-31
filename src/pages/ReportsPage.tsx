import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  FileSpreadsheet,
  Layers,
  PieChart,
  Repeat,
  TrendingUp,
} from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import '../lib/chartConfig';
import { useAuth } from '../lib/auth';
import {
  customersRepo,
  invoicesRepo,
  paymentsRepo,
  plansRepo,
  subscriptionsRepo,
} from '../lib/db';
import { formatDate, formatINR, formatINRCompact, normalizeToMRR } from '../lib/formatters';
import { useToast } from '../context/ToastContext';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [dateRange, setDateRange] = useState('all');

  const subscriptions = useMemo(() => subscriptionsRepo.getAll(user), [user]);
  const invoices = useMemo(() => invoicesRepo.getAll(user), [user]);
  const payments = useMemo(() => paymentsRepo.getAll(user), [user]);
  const plans = useMemo(() => plansRepo.getAll(), []);
  const customers = useMemo(() => customersRepo.getAll(user), [user]);

  // Financial aggregates
  const financialMetrics = useMemo(() => {
    let totalRevenueCollected = 0;
    let totalOutstanding = 0;
    let totalDiscountGranted = 0;
    let totalGstCollected = 0;

    for (const inv of invoices) {
      totalRevenueCollected += inv.amountPaid;
      totalOutstanding += inv.balanceDue;
      totalDiscountGranted += inv.discountTotal;
      totalGstCollected += (inv.taxTotal * (inv.amountPaid / (inv.grandTotal || 1)));
    }

    let totalMRR = 0;
    for (const sub of subscriptions.filter((s) => s.status === 'Active')) {
      const plan = plans.find((p) => p.id === sub.planId);
      totalMRR += plan ? normalizeToMRR(sub.grandTotal, plan.billingFrequency) : sub.grandTotal;
    }

    return {
      totalRevenueCollected,
      totalOutstanding,
      totalDiscountGranted,
      totalGstCollected,
      totalMRR,
      totalARR: totalMRR * 12,
    };
  }, [invoices, subscriptions, plans]);

  // Plan Revenue Breakdown
  const planRevenueBreakdown = useMemo(() => {
    const revenueMap: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const p of plans) {
      revenueMap[p.id] = { name: p.name, count: 0, revenue: 0 };
    }
    for (const sub of subscriptions) {
      if (revenueMap[sub.planId]) {
        revenueMap[sub.planId].count++;
        revenueMap[sub.planId].revenue += sub.grandTotal;
      }
    }
    return Object.values(revenueMap).sort((a, b) => b.revenue - a.revenue);
  }, [plans, subscriptions]);

  // Chart: Top Plans by Revenue
  const topPlansChartData = useMemo(() => {
    const top = planRevenueBreakdown.slice(0, 6);
    return {
      labels: top.map((t) => t.name),
      datasets: [
        {
          label: 'Revenue (₹)',
          data: top.map((t) => t.revenue),
          backgroundColor: '#4f46e5',
          borderRadius: 6,
        },
      ],
    };
  }, [planRevenueBreakdown]);

  // CSV Exporters
  const exportSubscriptionsCSV = () => {
    const headers = ['Subscription Number', 'Customer', 'Plan', 'Status', 'Start Date', 'Expiry Date', 'Grand Total (INR)'];
    const rows = subscriptions.map((s) => {
      const cust = customers.find((c) => c.id === s.customerId);
      const plan = plans.find((p) => p.id === s.planId);
      return [
        s.subscriptionNumber,
        `"${cust?.name || ''}"`,
        `"${plan?.name || ''}"`,
        s.status,
        s.startDate,
        s.expiryDate,
        s.grandTotal,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV(csvContent, 'Brightloop_Subscriptions.csv');
    showToast('success', 'Export Complete', 'Exported subscriptions to CSV.');
  };

  const exportInvoicesCSV = () => {
    const headers = ['Invoice Number', 'Customer', 'Issue Date', 'Due Date', 'Status', 'Subtotal', 'Tax', 'Grand Total', 'Amount Paid', 'Balance Due'];
    const rows = invoices.map((i) => {
      const cust = customers.find((c) => c.id === i.customerId);
      return [
        i.invoiceNumber,
        `"${cust?.name || ''}"`,
        i.issueDate,
        i.dueDate,
        i.status,
        i.subtotal,
        i.taxTotal,
        i.grandTotal,
        i.amountPaid,
        i.balanceDue,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV(csvContent, 'Brightloop_Invoices.csv');
    showToast('success', 'Export Complete', 'Exported invoices to CSV.');
  };

  const exportPaymentsCSV = () => {
    const headers = ['Payment Ref', 'Customer', 'Date', 'Method', 'Transaction Ref', 'Amount'];
    const rows = payments.map((p) => {
      const cust = customers.find((c) => c.id === p.customerId);
      return [
        p.paymentNumber,
        `"${cust?.name || ''}"`,
        p.date,
        p.method,
        `"${p.transactionRef}"`,
        p.amount,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCSV(csvContent, 'Brightloop_Payments.csv');
    showToast('success', 'Export Complete', 'Exported payments to CSV.');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Reports & Exports</h1>
          <p className="text-xs text-slate-500 mt-1">
            MRR / ARR breakdown, tax receipts, plan popularity, and CSV data exports.
          </p>
        </div>

        {/* CSV Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportSubscriptionsCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export Subs CSV</span>
          </button>
          <button
            onClick={exportInvoicesCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export Invoices CSV</span>
          </button>
          <button
            onClick={exportPaymentsCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export Payments CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Collected Revenue</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {formatINRCompact(financialMetrics.totalRevenueCollected)}
          </p>
          <span className="text-xs text-emerald-600 font-medium block mt-1">
            Net received: {formatINR(financialMetrics.totalRevenueCollected)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total MRR Run-Rate</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {formatINRCompact(financialMetrics.totalMRR)}
          </p>
          <span className="text-xs text-slate-500 block mt-1">
            Annualized (ARR): {formatINRCompact(financialMetrics.totalARR)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Outstanding Receivables</span>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            {formatINRCompact(financialMetrics.totalOutstanding)}
          </p>
          <span className="text-xs text-slate-500 block mt-1">
            Across confirmed & unpaid invoices
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Promotions & Discounts</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {formatINRCompact(financialMetrics.totalDiscountGranted)}
          </p>
          <span className="text-xs text-slate-500 block mt-1">
            Saved by customers via coupons
          </span>
        </div>
      </div>

      {/* Top Plans Chart & Plan Performance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Revenue by Subscription Plan (₹)</h3>
          <div className="h-64">
            <Bar
              data={topPlansChartData}
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

        {/* Plan Breakdown Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Plan Commercial Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Plan Name</th>
                  <th className="py-2.5 px-4 text-center">Subscriptions</th>
                  <th className="py-2.5 px-4 text-right">Total Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {planRevenueBreakdown.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{p.name}</td>
                    <td className="py-3 px-4 text-center">{p.count}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatINR(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
