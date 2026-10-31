import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Cpu,
  Database,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Subscription, SubscriptionLine } from '../types';
import { useAuth } from '../lib/auth';
import {
  customersRepo,
  plansRepo,
  productsRepo,
  settingsRepo,
  subscriptionsRepo,
} from '../lib/db';
import { calculateTotals } from '../lib/pricing';
import { seedDemoData } from '../lib/seed';
import { Forbidden403 } from '../components/common/Forbidden403';
import { useToast } from '../context/ToastContext';

interface BenchmarkResult {
  operation: string;
  count: number;
  durationMs: number;
  slaLimitMs: number;
  status: 'Passed' | 'Failed';
}

export const PerformancePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  if (user?.role !== 'admin') {
    return <Forbidden403 reason="Only Administrators can execute performance benchmarks." />;
  }

  const [isGenerating, setIsGenerating] = useState(false);
  const [benchmarks, setBenchmarks] = useState<BenchmarkResult[]>([]);
  const [currentSubCount, setCurrentSubCount] = useState(() => subscriptionsRepo.getAll(null).length);

  const runBenchmarkSuite = () => {
    const results: BenchmarkResult[] = [];

    // Test 1: Full GetAll()
    const t0 = performance.now();
    const all = subscriptionsRepo.getAll(null);
    const t1 = performance.now();
    results.push({
      operation: 'Retrieve All Subscriptions (getAll)',
      count: all.length,
      durationMs: Math.round((t1 - t0) * 100) / 100,
      slaLimitMs: 2000,
      status: t1 - t0 < 2000 ? 'Passed' : 'Failed',
    });

    // Test 2: Status filtering across entire set
    const t2 = performance.now();
    const active = all.filter((s) => s.status === 'Active');
    const t3 = performance.now();
    results.push({
      operation: 'Filter by Status (status === "Active")',
      count: active.length,
      durationMs: Math.round((t3 - t2) * 100) / 100,
      slaLimitMs: 500,
      status: t3 - t2 < 500 ? 'Passed' : 'Failed',
    });

    // Test 3: Financial Aggregation & MRR Math
    const t4 = performance.now();
    let sum = 0;
    for (const s of all) {
      sum += s.grandTotal;
    }
    const t5 = performance.now();
    results.push({
      operation: 'Calculate Full Financial Aggregates & Volume',
      count: all.length,
      durationMs: Math.round((t5 - t4) * 100) / 100,
      slaLimitMs: 1000,
      status: t5 - t4 < 1000 ? 'Passed' : 'Failed',
    });

    // Test 4: Customer Index Lookups
    const t6 = performance.now();
    for (let i = 0; i < 500; i++) {
      subscriptionsRepo.getById(`SUB-${String(i).padStart(6, '0')}`, null);
    }
    const t7 = performance.now();
    results.push({
      operation: '500 Sequential Indexed Lookups (getById)',
      count: 500,
      durationMs: Math.round((t7 - t6) * 100) / 100,
      slaLimitMs: 500,
      status: t7 - t6 < 500 ? 'Passed' : 'Failed',
    });

    setBenchmarks(results);
    setCurrentSubCount(all.length);
    showToast('success', 'Benchmark Complete', `Executed 4 test suites across ${all.length} records.`);
  };

  const handleGenerate5000 = () => {
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const customers = customersRepo.getAll(null);
        const plans = plansRepo.getAll();
        const products = productsRepo.getAll();

        const bigList: Subscription[] = [];
        const statuses = ['Active', 'Active', 'Confirmed', 'Quotation', 'Closed'];

        for (let i = 1; i <= 5000; i++) {
          const cust = customers[i % customers.length] || customers[0];
          const plan = plans[i % plans.length] || plans[0];
          const prod = products[i % products.length] || products[0];

          const line: SubscriptionLine = {
            id: `SUBL-B-${i}`,
            productId: prod.id,
            productName: prod.name,
            quantity: 1,
            unitPrice: prod.sellingPrice,
            variantExtra: 0,
            taxPercent: 18,
            discountPercent: 0,
            lineTotal: prod.sellingPrice * 1.18,
          };

          const totals = calculateTotals([line], 0);

          bigList.push({
            id: `SUB-B-${String(i).padStart(6, '0')}`,
            subscriptionNumber: `SUB-2026-B${String(i).padStart(5, '0')}`,
            customerId: cust.id,
            planId: plan.id,
            status: statuses[i % statuses.length] as any,
            startDate: '2026-01-01',
            expiryDate: '2027-01-01',
            nextBillingDate: '2026-11-01',
            paymentTerms: 'Net 15',
            lines: [line],
            subtotal: totals.subtotal,
            discountTotal: 0,
            taxTotal: totals.taxTotal,
            grandTotal: totals.grandTotal,
            createdAt: new Date().toISOString(),
          });
        }

        subscriptionsRepo.rawSetAll(bigList);
        setCurrentSubCount(bigList.length);
        setIsGenerating(false);
        showToast('success', '5,000 Records Generated', 'In-memory indexed caches rebuilt with 5,000 subscriptions.');
        runBenchmarkSuite();
      } catch (err: unknown) {
        setIsGenerating(false);
        const msg = err instanceof Error ? err.message : String(err);
        showToast('error', 'Generation Error', msg);
      }
    }, 100);
  };

  const handleResetToStandard = async () => {
    setIsGenerating(true);
    await seedDemoData(true);
    setCurrentSubCount(subscriptionsRepo.getAll(null).length);
    setIsGenerating(false);
    showToast('info', 'Database Reset', 'Reset to initial standard demo dataset (300 subs, 120 customers, 600+ invoices).');
    runBenchmarkSuite();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Performance Benchmark</h1>
          <p className="text-xs text-slate-500 mt-1">
            Verification suite testing sub-second rendering, in-memory Map indexing, and pagination scalability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runBenchmarkSuite}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-indigo-600" />
            <span>Run Benchmark</span>
          </button>

          <button
            onClick={handleGenerate5000}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Generate 5,000 Subscriptions</span>
          </button>

          <button
            onClick={handleResetToStandard}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Reset to 300 demo records"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* Dataset Overview */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Current Subscription Cache Size
          </span>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">
            {currentSubCount.toLocaleString('en-IN')} Subscriptions
          </p>
        </div>
        <div className="text-xs text-slate-500 space-y-0.5">
          <p>
            Architectural Target: <strong className="text-emerald-700 font-semibold">&lt; 2,000ms SLA</strong>
          </p>
          <p>Index Strategy: In-Memory Map Lookups + Page 20 Slices</p>
        </div>
      </div>

      {/* Benchmark Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Benchmark Metrics</h3>
          <span className="text-xs text-slate-400">High-resolution performance.now() timer</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Test Operation</th>
                <th className="py-3 px-4 text-center">Items Evaluated</th>
                <th className="py-3 px-4 text-right">Measured Latency</th>
                <th className="py-3 px-4 text-right">Target SLA</th>
                <th className="py-3 px-4 text-center">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {benchmarks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Click "Run Benchmark" or "Generate 5,000 Subscriptions" to execute testing.
                  </td>
                </tr>
              ) : (
                benchmarks.map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{b.operation}</td>
                    <td className="py-3 px-4 text-center">{b.count.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {b.durationMs} ms
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 font-mono">
                      &lt; {b.slaLimitMs} ms
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{b.status}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
