import React, { useMemo, useState } from 'react';
import {
  CheckCircle,
  Lock,
  Mail,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { validatePassword } from '../lib/crypto';
import { useToast } from '../context/ToastContext';

interface RegisterPageProps {
  onNavigateToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateToLogin }) => {
  const { register } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      showToast('error', 'Required Fields', 'Name and email are mandatory.');
      return;
    }

    if (!passwordValidation.isValid) {
      showToast('error', 'Password Rules Not Met', 'Please satisfy all 5 password requirements.');
      return;
    }

    if (password !== confirmPassword) {
      showToast('error', 'Mismatch', 'Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || '+91 98000 00000',
        company: company.trim(),
        city: city.trim(),
      });

      if (!res.success) {
        showToast('error', 'Registration Failed', res.error);
      } else {
        showToast('success', 'Account Created', 'Welcome to Brightloop! Your customer account is active.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full my-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-2xl shadow-md mb-2">
            B
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Create Customer Account
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Register to subscribe to software modules and access client billing.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Patel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Work Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="ramesh@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Patel Logistics"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />

              {/* Password Checklist */}
              <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-[11px]">
                <p className="font-semibold text-slate-600 mb-1">Live Password Strength Checklist:</p>
                <div className={`flex items-center gap-1.5 ${passwordValidation.criteria.minLength ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {passwordValidation.criteria.minLength ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Minimum 9 characters (more than 8 required)</span>
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
                  <span>At least 1 special character (!, @, #, $, etc.)</span>
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Confirm Password <span className="text-rose-500">*</span>
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
              {isSubmitting ? 'Creating Profile...' : 'Complete Customer Registration'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-600">
            <span>Already have an account? </span>
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
