import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  FileCheck,
  FileText,
  Layers,
  Package,
  Repeat,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../lib/auth';

interface DemoGuidePageProps {
  onNavigate: (page: string) => void;
}

export const DemoGuidePage: React.FC<DemoGuidePageProps> = ({ onNavigate }) => {
  const { user, switchDemoUser } = useAuth();

  const steps = [
    {
      step: 1,
      title: 'Admin Configures Products & Plans',
      role: 'admin',
      desc: 'Admin creates software products with variants (e.g. Odoo compatible +₹560), margin calculator, and flexible subscription plans (monthly, yearly, minimum quantities, cancellation policies).',
      actionLabel: 'Explore Products & Variants',
      targetPage: 'products',
      userSwitch: 'admin' as const,
    },
    {
      step: 2,
      title: 'Customer Self-Registration & Security',
      role: 'customer',
      desc: 'Customers self-register with strict password security (min 9 chars, uppercase, lowercase, number, symbol), live checklist, and hashed passwords stored via Web Crypto API.',
      actionLabel: 'View Customer Profiles',
      targetPage: 'customers',
      userSwitch: 'customer' as const,
    },
    {
      step: 3,
      title: 'Staff Creates Quotation from Template',
      role: 'staff',
      desc: 'Sales reps generate quotations using pre-built templates or customized bundles. Customer reviews and clicks "Confirm Quotation".',
      actionLabel: 'Open Quotations & Templates',
      targetPage: 'quotations',
      userSwitch: 'staff' as const,
    },
    {
      step: 4,
      title: 'Activate Subscription & Lifecycle Policy',
      role: 'staff',
      desc: 'Staff activates the confirmed subscription (Strict workflow: Draft → Quotation → Confirmed → Active → Closed). Plan policies dictate pausing, renewal, or early termination fee.',
      actionLabel: 'Manage Subscriptions',
      targetPage: 'subscriptions',
      userSwitch: 'staff' as const,
    },
    {
      step: 5,
      title: 'Automated Recurring Billing Engine',
      role: 'admin',
      desc: 'Billing engine evaluates subscriptions due <= today, calculates GST (18%) and coupons, advances next billing date by frequency, and prevents duplicate billing via idempotency keys.',
      actionLabel: 'View Generated Invoices',
      targetPage: 'invoices',
      userSwitch: 'admin' as const,
    },
    {
      step: 6,
      title: 'Payment Reconciliation & PDF Download',
      role: 'staff',
      desc: 'Record full or partial payments via UPI, NEFT, or Cards. Status auto-updates to Paid when balance reaches zero. Print or download high-fidelity tax invoice PDFs.',
      actionLabel: 'Record Payments',
      targetPage: 'payments',
      userSwitch: 'staff' as const,
    },
    {
      step: 7,
      title: 'Customer Isolated Self-Service Portal',
      role: 'customer',
      desc: 'Customer logs in and sees exclusively their own subscriptions, invoices, and payments. Ownership checks strictly prevent Customer A from accessing Customer B.',
      actionLabel: 'View Customer Dashboard',
      targetPage: 'dashboard',
      userSwitch: 'customer' as const,
    },
    {
      step: 8,
      title: 'Executive Dashboards & Financial Analytics',
      role: 'admin',
      desc: 'Monitor real-time MRR, ARR, overdue receivables, revenue trends, top subscription plans, and export datasets to CSV format.',
      actionLabel: 'Open Executive Dashboard',
      targetPage: 'dashboard',
      userSwitch: 'admin' as const,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-lg">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/30 border border-indigo-400/30 rounded-full text-xs font-medium text-indigo-200 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Interactive End-to-End Walkthrough</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Brightloop Evaluation & Demo Guide
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
          Follow the 8-step lifecycle below to test all core modules: role-based access control, product variants,
          quotation workflows, automated idempotent billing, discount validation, payments, and reporting.
        </p>

        {/* Current Identity Bar */}
        <div className="mt-6 pt-4 border-t border-indigo-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400">Current Logged-in Identity: </span>
            <strong className="text-white font-semibold">{user?.name}</strong>{' '}
            <span className="text-indigo-300 capitalize">({user?.role})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Switch Identity:</span>
            <button
              onClick={() => switchDemoUser('admin')}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs transition-colors"
            >
              Admin
            </button>
            <button
              onClick={() => switchDemoUser('staff')}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs transition-colors"
            >
              Staff
            </button>
            <button
              onClick={() => switchDemoUser('customer')}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs transition-colors"
            >
              Customer
            </button>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {steps.map((st) => (
          <div
            key={st.step}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-indigo-300 transition-colors"
          >
            <div className="flex items-start gap-3.5 flex-1">
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                {st.step}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{st.title}</h3>
                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {st.role}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{st.desc}</p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => {
                  switchDemoUser(st.userSwitch);
                  onNavigate(st.targetPage);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                <span>{st.actionLabel}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
