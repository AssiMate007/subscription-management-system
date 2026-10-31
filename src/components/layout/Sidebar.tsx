import React from 'react';
import {
  BarChart3,
  Cpu,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Inbox,
  Layers,
  LayoutDashboard,
  Package,
  Percent,
  Repeat,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'customer';

  interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }

  const adminItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'subscriptions', label: 'Subscriptions', icon: Repeat },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'quotations', label: 'Quotations', icon: FileSpreadsheet },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Products & Variants', icon: Package },
    { id: 'plans', label: 'Subscription Plans', icon: Layers },
    { id: 'discounts', label: 'Discounts', icon: Percent },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'users', label: 'User Management', icon: ShieldCheck },
    { id: 'mock-inbox', label: 'Mock Inbox', icon: Inbox },
    { id: 'demo-guide', label: 'Demo Guide', icon: Sparkles },
    { id: 'performance', label: 'Performance 5K', icon: Cpu },
  ];

  const staffItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'subscriptions', label: 'Subscriptions', icon: Repeat },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'quotations', label: 'Quotations', icon: FileSpreadsheet },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Products (Catalog)', icon: Package },
    { id: 'plans', label: 'Plans (Catalog)', icon: Layers },
    { id: 'discounts', label: 'Discounts (View)', icon: Percent },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'mock-inbox', label: 'Mock Inbox', icon: Inbox },
    { id: 'demo-guide', label: 'Demo Guide', icon: Sparkles },
  ];

  const customerItems: NavItem[] = [
    { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'subscriptions', label: 'My Subscriptions', icon: Repeat },
    { id: 'invoices', label: 'My Invoices', icon: FileText },
    { id: 'payments', label: 'My Payments', icon: CreditCard },
    { id: 'plans', label: 'Explore Plans', icon: Layers },
    { id: 'mock-inbox', label: 'Mock Inbox', icon: Inbox },
    { id: 'demo-guide', label: 'Demo Guide', icon: Sparkles },
  ];

  const items = role === 'admin' ? adminItems : role === 'staff' ? staffItems : customerItems;

  return (
    <aside className="no-print w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-3">
        <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-slate-400">
          Navigation ({role})
        </div>
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-semibold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-500">
        <div className="font-semibold text-slate-700 mb-0.5">Brightloop v2.4</div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Enforcing role guards, indexed data caches & ₹ en-IN billing.
        </p>
      </div>
    </aside>
  );
};
