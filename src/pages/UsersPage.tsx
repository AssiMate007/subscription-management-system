import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle,
  Edit2,
  Lock,
  Plus,
  Shield,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { Role, User } from '../types';
import { useAuth } from '../lib/auth';
import { generateSalt, hashPassword, validatePassword } from '../lib/crypto';
import { usersRepo } from '../lib/db';
import { formatDate } from '../lib/formatters';
import { Forbidden403 } from '../components/common/Forbidden403';
import { useToast } from '../context/ToastContext';

export const UsersPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  if (user?.role !== 'admin') {
    return <Forbidden403 reason="Only Administrators can access User & Staff account management." />;
  }

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('staff');

  const users = useMemo(() => usersRepo.getAll(user), [user]);
  const passwordCheck = useMemo(() => validatePassword(password), [password]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast('error', 'Required Fields', 'Name and email are mandatory.');
      return;
    }

    if (!passwordCheck.isValid) {
      showToast('error', 'Weak Password', 'Password must satisfy all security requirements.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = usersRepo.getByEmail(cleanEmail);
    if (existing) {
      showToast('error', 'Email Taken', 'A user with this email address already exists.');
      return;
    }

    const salt = generateSalt();
    const hash = await hashPassword(password, salt);

    const newUser: User = {
      id: 'USR-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      name: name.trim(),
      email: cleanEmail,
      role,
      passwordHash: hash,
      salt,
      active: true,
      createdAt: new Date().toISOString(),
    };

    usersRepo.create(newUser, user);
    showToast('success', 'Staff Member Created', `Account for ${newUser.name} (${newUser.role}) created.`);
    setIsModalOpen(false);
    setName('');
    setEmail('');
    setPassword('');
  };

  const handleToggleActive = (targetUser: User) => {
    if (targetUser.id === user.id) {
      showToast('error', 'Cannot Deactivate Self', 'You cannot deactivate your own active admin account.');
      return;
    }
    const newActive = !targetUser.active;
    usersRepo.update(targetUser.id, { active: newActive }, user);
    showToast('info', 'Account Status Changed', `${targetUser.name} is now ${newActive ? 'active' : 'inactive'}.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User & Staff Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Provision internal Staff operators, audit roles, and control access permissions.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 block">{u.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{u.id}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{u.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                        u.role === 'admin'
                          ? 'bg-purple-50 text-purple-700'
                          : u.role === 'staff'
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{formatDate(u.createdAt)}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 text-xs ${
                        u.active ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span>{u.active ? 'Active' : 'Inactive'}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {u.id !== user.id && (
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                          u.active
                            ? 'text-rose-600 hover:bg-rose-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {u.active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Provision Staff Account</h3>

            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Staff Member Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Joshi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. vikram@brightloop.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="staff">Staff (Day-to-day operations)</option>
                  <option value="admin">Administrator (Full permissions)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Temporary Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter strong password (9+ chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />

                {/* Password Criteria Checklist */}
                <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-[11px]">
                  <p className="font-semibold text-slate-600 mb-1">Security Standards Checklist:</p>
                  <div className={`flex items-center gap-1.5 ${passwordCheck.criteria.minLength ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {passwordCheck.criteria.minLength ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>Minimum 9 characters (more than 8)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordCheck.criteria.hasUpper ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {passwordCheck.criteria.hasUpper ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>At least 1 uppercase letter (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordCheck.criteria.hasLower ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {passwordCheck.criteria.hasLower ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>At least 1 lowercase letter (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordCheck.criteria.hasDigit ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {passwordCheck.criteria.hasDigit ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>At least 1 digit (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordCheck.criteria.hasSpecial ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {passwordCheck.criteria.hasSpecial ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>At least 1 special character (@, #, $, %, etc.)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!passwordCheck.isValid}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg shadow-xs"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
