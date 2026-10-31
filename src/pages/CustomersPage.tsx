import React, { useMemo, useState } from 'react';
import {
  Building2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Customer } from '../types';
import { useAuth } from '../lib/auth';
import { customersRepo, invoicesRepo, subscriptionsRepo } from '../lib/db';
import { formatDate, formatINR } from '../lib/formatters';
import { Pagination } from '../components/common/Pagination';
import { useToast } from '../context/ToastContext';

export const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = user?.role === 'admin' || user?.role === 'staff';

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    gstin: '',
  });

  const customers = useMemo(() => customersRepo.getAll(user), [user]);
  const subscriptions = useMemo(() => subscriptionsRepo.getAll(user), [user]);
  const invoices = useMemo(() => invoicesRepo.getAll(user), [user]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        c.city.toLowerCase().includes(q)
      );
    });
  }, [customers, searchQuery]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast('error', 'Required Fields', 'Customer name and email are mandatory.');
      return;
    }

    const newCust: Customer = {
      id: 'CUST-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim() || '+91 98000 00000',
      company: formData.company.trim(),
      address: formData.address.trim() || 'Tech Park',
      city: formData.city.trim() || 'Bengaluru',
      state: formData.state.trim() || 'Karnataka',
      pincode: formData.pincode.trim() || '560001',
      gstin: formData.gstin.trim(),
      active: true,
      createdAt: new Date().toISOString(),
    };

    customersRepo.create(newCust, user);
    showToast('success', 'Customer Added', `Customer record for ${newCust.name} created.`);
    setIsAddModalOpen(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      gstin: '',
    });
  };

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

  const customerSubs = useMemo(() => {
    if (!selectedCustomerId) return [];
    return subscriptions.filter((s) => s.customerId === selectedCustomerId);
  }, [selectedCustomerId, subscriptions]);

  const customerInvs = useMemo(() => {
    if (!selectedCustomerId) return [];
    return invoices.filter((i) => i.customerId === selectedCustomerId);
  }, [selectedCustomerId, invoices]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage corporate client accounts, billing addresses, and GSTIN profiles.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, email, company, city..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">GSTIN</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 block">{c.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{c.id}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {c.company || 'Individual Account'}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <span className="block">{c.email}</span>
                    <span className="text-[11px] text-slate-500">{c.phone}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {c.city}, {c.state}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    {c.gstin || 'Unregistered'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-emerald-700 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Active</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedCustomerId(c.id)}
                      className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredCustomers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Customer Profile & Subscriptions Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{selectedCustomer.name}</h3>
                <span className="text-xs text-slate-500">{selectedCustomer.company || 'Individual Account'}</span>
              </div>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-6 text-xs flex-1">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Email</span>
                  <span className="font-semibold text-slate-900">{selectedCustomer.email}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Phone</span>
                  <span className="font-semibold text-slate-900">{selectedCustomer.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Billing Address</span>
                  <span className="text-slate-700 block">{selectedCustomer.address}</span>
                  <span className="text-slate-600">{selectedCustomer.city}, {selectedCustomer.state} - {selectedCustomer.pincode}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">GSTIN</span>
                  <span className="font-mono text-slate-800">{selectedCustomer.gstin || 'N/A'}</span>
                </div>
              </div>

              {/* Subscriptions */}
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                  Customer Subscriptions ({customerSubs.length})
                </h4>
                <div className="space-y-2">
                  {customerSubs.map((sub) => (
                    <div key={sub.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-slate-900 block">{sub.subscriptionNumber}</span>
                        <span className="text-slate-500 text-[11px]">Next Billing: {formatDate(sub.nextBillingDate)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 block">{formatINR(sub.grandTotal)}</span>
                        <span className="text-[11px] text-emerald-600 font-medium">{sub.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invoices */}
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                  Recent Invoices ({customerInvs.length})
                </h4>
                <div className="space-y-2">
                  {customerInvs.slice(0, 5).map((inv) => (
                    <div key={inv.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-slate-900 block">{inv.invoiceNumber}</span>
                        <span className="text-slate-500 text-[11px]">Due: {formatDate(inv.dueDate)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 block">{formatINR(inv.grandTotal)}</span>
                        <span className="text-[11px] text-slate-600">Balance: {formatINR(inv.balanceDue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Customer Profile</h3>

            <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98000 00000"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g. Acme Tech Solutions"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Office number, tech park, locality"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 29AABCS1429F1Z1"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-xs"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
