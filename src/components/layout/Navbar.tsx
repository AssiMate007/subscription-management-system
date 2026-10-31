import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  FastForward,
  Inbox,
  LogOut,
  Play,
  RotateCcw,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { mockEmailsRepo, subscribeToDatabase } from '../../lib/db';
import { formatDate } from '../../lib/formatters';
import { useBillingScheduler } from '../../hooks/useBillingScheduler';
import { useToast } from '../../context/ToastContext';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const { user, logout, switchDemoUser } = useAuth();
  const { triggerRun, isRunning, simulatedDate, effectiveToday, setSimulatedDate } = useBillingScheduler();
  const { showToast } = useToast();
  const [unreadCount, setUnreadCount] = useState(() => mockEmailsRepo.getUnreadCount());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDate, setTempDate] = useState(effectiveToday);

  React.useEffect(() => {
    return subscribeToDatabase(() => {
      setUnreadCount(mockEmailsRepo.getUnreadCount());
    });
  }, []);

  const handleRunBilling = () => {
    const res = triggerRun();
    if (res) {
      showToast(
        'success',
        'Billing Run Completed',
        `Evaluated ${res.subscriptionsEvaluated} active subscriptions. Generated ${res.invoicesCreated} invoices (${res.duplicatesSkipped} duplicates skipped).`
      );
    }
  };

  const handleAdvanceMonth = () => {
    const cur = new Date(effectiveToday);
    cur.setMonth(cur.getMonth() + 1);
    const nextStr = cur.toISOString().split('T')[0];
    setSimulatedDate(nextStr);
    showToast('info', 'Simulated Date Advanced', `Date updated to ${formatDate(nextStr)}. Recurring billing evaluated.`);
  };

  const handleResetDate = () => {
    setSimulatedDate(null);
    showToast('info', 'Simulated Date Reset', 'Reset to actual real-time clock.');
  };

  const handleApplyCustomDate = () => {
    setSimulatedDate(tempDate);
    setIsDatePickerOpen(false);
    showToast('info', 'Date Changed', `Simulation clock set to ${formatDate(tempDate)}.`);
  };

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16">
        {/* Left: Brand title & quick guide button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              B
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg block leading-none">
                Brightloop
              </span>
              <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                Subscription Management
              </span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('demo-guide')}
            className={`hidden md:inline-flex items-center gap-1.5 ml-4 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              currentPage === 'demo-guide'
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Interactive Demo Guide</span>
          </button>
        </div>

        {/* Center / Right Controls: Simulation, Quick Switcher, Mock Inbox, User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Simulated Date Controller */}
          <div className="relative">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs">
              <button
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="flex items-center gap-1.5 px-2 py-1 text-slate-700 hover:text-indigo-600 font-medium rounded hover:bg-white transition-colors"
                title="Click to change simulated date"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline text-slate-500">Date:</span>
                <span className="font-semibold text-slate-900">{formatDate(effectiveToday)}</span>
                {simulatedDate && (
                  <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-1 rounded">
                    Simulated
                  </span>
                )}
              </button>

              <button
                onClick={handleAdvanceMonth}
                aria-label="Advance date by 1 month"
                title="Advance 1 Month"
                className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-white rounded transition-colors"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>

              {simulatedDate && (
                <button
                  onClick={handleResetDate}
                  title="Reset to Today"
                  aria-label="Reset to Today"
                  className="p-1 text-slate-500 hover:text-rose-600 hover:bg-white rounded transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Picker Popover */}
            {isDatePickerOpen && (
              <div className="absolute right-0 mt-2 p-3 bg-white border border-slate-200 rounded-xl shadow-xl w-64 z-50 animate-in fade-in zoom-in-95">
                <p className="text-xs font-semibold text-slate-900 mb-2">Simulate System Date</p>
                <p className="text-[11px] text-slate-500 mb-3">
                  Advance time forward to trigger recurring invoice generations and renewals.
                </p>
                <input
                  type="date"
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg mb-3 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setTempDate(new Date().toISOString().split('T')[0]);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Set Real Today
                  </button>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setIsDatePickerOpen(false)}
                      className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApplyCustomDate}
                      className="px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Billing Engine Run Button (Admin/Staff) */}
          {(user?.role === 'admin' || user?.role === 'staff') && (
            <button
              onClick={handleRunBilling}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium rounded-lg transition-colors shadow-xs disabled:opacity-50"
              title="Run automated recurring invoice generation for all subscriptions due today or earlier"
            >
              {isRunning ? (
                <Clock className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              ) : (
                <Play className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
              )}
              <span className="hidden md:inline">Run Billing Now</span>
            </button>
          )}

          {/* Quick Role Switcher (Helper for Evaluators) */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5">Role:</span>
            <button
              onClick={() => switchDemoUser('admin')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                user?.role === 'admin'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => switchDemoUser('staff')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                user?.role === 'staff'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Staff
            </button>
            <button
              onClick={() => switchDemoUser('customer')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                user?.role === 'customer'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customer
            </button>
          </div>

          {/* Mock Inbox Link with unread count */}
          <button
            onClick={() => onNavigate('mock-inbox')}
            aria-label="Open Mock Inbox"
            className={`relative p-2 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors ${
              currentPage === 'mock-inbox' ? 'bg-indigo-50 text-indigo-600' : ''
            }`}
            title="Mock Inbox (Simulated Emails & Password Reset Links)"
          >
            <Inbox className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Info & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="hidden sm:block text-right">
              <span className="text-xs font-semibold text-slate-900 block truncate max-w-[130px]">
                {user?.name}
              </span>
              <span className="text-[10px] text-slate-500 capitalize block">
                {user?.role}
              </span>
            </div>
            <button
              onClick={logout}
              aria-label="Sign out"
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
