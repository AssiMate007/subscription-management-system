import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../context/ToastContext';

interface LoginPageProps {
  onNavigateToRegister: () => void;
  onNavigateToReset?: (token?: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateToRegister,
  onNavigateToReset,
}) => {
  const { login, requestPasswordReset } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('admin@brightloop.com');
  const [password, setPassword] = useState('Admin@12345');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password Modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await login(email, password, rememberMe);
      if (!res.success) {
        showToast('error', 'Login Failed', res.error || 'Invalid credentials.');
      } else {
        showToast('success', 'Welcome Back', 'Signed in successfully.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setIsSendingReset(true);
    try {
      const res = await requestPasswordReset(forgotEmail.trim());
      showToast('info', 'Reset Dispatched', res.message);
      setIsForgotModalOpen(false);
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-2xl shadow-md mb-3">
            B
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Brightloop Subscription System
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated SaaS recurring billing, invoices, payments, and quotations.
          </p>
        </div>

        {/* Demo Credentials Quick-Selector Helper */}
        <div className="bg-white border border-indigo-100 rounded-xl p-3.5 mb-5 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>1-Click Demo Accounts (Pre-configured)</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleFillDemo('admin@brightloop.com', 'Admin@12345')}
              className="p-2 text-left bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors text-xs"
            >
              <span className="font-bold text-slate-900 block">Admin</span>
              <span className="text-[10px] text-slate-500 block truncate">admin@brightloop.com</span>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('staff@brightloop.com', 'Staff@12345')}
              className="p-2 text-left bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors text-xs"
            >
              <span className="font-bold text-slate-900 block">Staff</span>
              <span className="text-[10px] text-slate-500 block truncate">staff@brightloop.com</span>
            </button>

            <button
              type="button"
              onClick={() => handleFillDemo('customer@brightloop.com', 'Customer@12345')}
              className="p-2 text-left bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors text-xs"
            >
              <span className="font-bold text-slate-900 block">Customer</span>
              <span className="text-[10px] text-slate-500 block truncate">customer@brightloop.com</span>
            </button>
          </div>
        </div>

        {/* Login Form Box */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-5">Sign In to Your Workspace</h2>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-600 font-medium text-xs">Remember this session</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs disabled:opacity-50 mt-2"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-600">
            <span>New customer organization? </span>
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Register Account
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Enter your registered email address. We will generate a secure reset link with a 30-minute expiry token and dispatch it to your <strong>Mock Inbox</strong>.
            </p>

            <form onSubmit={handleSendResetEmail} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="admin@brightloop.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSendingReset ? 'Dispatching...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
