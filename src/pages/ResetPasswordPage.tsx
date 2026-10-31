import React, { useMemo, useState } from 'react';
import {
  CheckCircle,
  KeyRound,
  Lock,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { validatePassword } from '../lib/crypto';
import { useToast } from '../context/ToastContext';

interface ResetPasswordPageProps {
  initialToken?: string;
  onNavigateToLogin: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  initialToken = '',
  onNavigateToLogin,
}) => {
  const { resetPassword } = useAuth();
  const { showToast } = useToast();

  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordValidation = useMemo(() => validatePassword(newPassword), [newPassword]);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      showToast('error', 'Token Required', 'Please enter your password reset token.');
      return;
    }

    if (!passwordValidation.isValid) {
      showToast('error', 'Security Requirements', 'Password does not meet the 5 security standards.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('error', 'Mismatch', 'Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPassword(token.trim(), newPassword);
      if (!res.success) {
        showToast('error', 'Reset Failed', res.error || 'Token invalid or expired.');
      } else {
        showToast('success', 'Password Updated', 'Your password has been changed. You may now sign in.');
        onNavigateToLogin();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-2xl shadow-md mb-2">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Reset Account Password
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Single-use token with 30-minute validity generated via Mock Inbox.
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Security Reset Token <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="rst_..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />

              {/* Password Checklist */}
              <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-[11px]">
                <p className="font-semibold text-slate-600 mb-1">Security Standards Checklist:</p>
                <div className={`flex items-center gap-1.5 ${passwordValidation.criteria.minLength ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {passwordValidation.criteria.minLength ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Minimum 9 characters (more than 8)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordValidation.criteria.hasUpper ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {passwordValidation.criteria.hasUpper ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>At least 1 uppercase letter (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordValidation.criteria.hasLower ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {passwordValidation.criteria.hasLower ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>At least 1 lowercase letter (a-z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordValidation.criteria.hasDigit ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {passwordValidation.criteria.hasDigit ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>At least 1 digit (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordValidation.criteria.hasSpecial ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {passwordValidation.criteria.hasSpecial ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>At least 1 special character (!, @, #, etc.)</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {confirmPassword && !passwordsMatch && (
                <span className="text-[11px] text-rose-600 block mt-1">Passwords do not match</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !passwordValidation.isValid || !passwordsMatch}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs disabled:opacity-50 mt-2"
            >
              {isSubmitting ? 'Updating...' : 'Set New Password'}
            </button>
          </form>

          <div className="mt-5 text-center text-xs">
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="font-medium text-slate-600 hover:text-slate-900"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
