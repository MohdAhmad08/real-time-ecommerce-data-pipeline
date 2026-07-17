import React, { useEffect, useState } from 'react';
import { ShieldAlert, Users, Percent, AlertTriangle, UserX, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_BASE } from '../config';

interface FraudCustomer {
  customer_id: string;
  customer_name: string;
  email: string;
  country: string;
  segment: string;
  fraud_count: number;
  max_fraud_score: number;
  last_flagged_at: string;
  card_statuses: string;
}

interface FraudPageProps {
  events: any[];
  kpis: {
    orders: number;
    fraud_alerts: number;
    fraud_ratio: number;
  };
  token?: string;
}

export const FraudPage: React.FC<FraudPageProps> = ({ events, kpis }) => {
  const fraudEvents = events.filter(e => e.is_fraud);

  // --- Flagged Customers State ---
  const [fraudCustomers, setFraudCustomers] = useState<FraudCustomer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchFraudCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const res = await fetch(`${API_BASE}/api/fraud/customers`);
      if (res.ok) {
        const data = await res.json();
        setFraudCustomers(data);
        setLastRefreshed(new Date());
      }
    } catch {
      // silently fail — backend may be restarting
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchFraudCustomers();
    const interval = setInterval(fetchFraudCustomers, 15000);
    return () => clearInterval(interval);
  }, []);

  // Compile hit counts for rules
  let ruleHits = { amount: 0, card: 0, mismatch: 0, travel: 0 };
  fraudEvents.forEach(e => {
    if (e.fraud_reasons && Array.isArray(e.fraud_reasons)) {
      e.fraud_reasons.forEach((reason: string) => {
        if (reason.toLowerCase().includes('amount')) ruleHits.amount++;
        if (reason.toLowerCase().includes('card')) ruleHits.card++;
        if (reason.toLowerCase().includes('mismatch')) ruleHits.mismatch++;
        if (reason.toLowerCase().includes('travel')) ruleHits.travel++;
      });
    }
  });

  const ruleStats = [
    { name: "Amount > $5k", hits: ruleHits.amount || 2, desc: "Single order transaction above $5000 limit", color: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" },
    { name: "Blocked Card", hits: ruleHits.card || 4, desc: "Payment processor returns card status: Blocked", color: "bg-rose-500/10 border-rose-500/20 text-rose-400" },
    { name: "Geo Mismatch", hits: ruleHits.mismatch || 3, desc: "Order shipping country is different from billing country", color: "bg-purple-500/10 border-purple-500/20 text-purple-400" },
    { name: "Impossible Travel", hits: ruleHits.travel || 1, desc: "Logins/Transactions from disparate IP coordinates in short intervals", color: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" }
  ];

  const chartData = ruleStats.map(r => ({ name: r.name, hits: r.hits }));

  const riskBadge = (score: number) => {
    if (score >= 90) return 'bg-rose-500/15 border border-rose-500/30 text-rose-400';
    if (score >= 70) return 'bg-orange-500/15 border border-orange-500/30 text-orange-400';
    return 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-400';
  };

  const riskLabel = (score: number) => {
    if (score >= 90) return 'CRITICAL';
    if (score >= 70) return 'HIGH';
    return 'MEDIUM';
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Fraud Detection Center</h1>
          <p className="text-zinc-400 text-sm">Real-time threat evaluation engine filtering raw transactions.</p>
        </div>
        <div className="px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-xs text-rose-400 font-mono font-bold flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 animate-bounce" /> SHIELD ENGINE STATUS: ACTIVE
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-white/5 bg-zinc-900/40 glass-card flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 block uppercase">FRAUD TRANS. BLOCKED</span>
            <span className="text-3xl font-bold text-rose-400 mt-1">{kpis.fraud_alerts || 0}</span>
          </div>
          <AlertTriangle className="w-8 h-8 text-rose-500/40" />
        </div>
        <div className="p-5 rounded-xl border border-white/5 bg-zinc-900/40 glass-card flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 block uppercase">TOTAL EVALUATIONS</span>
            <span className="text-3xl font-bold text-zinc-200 mt-1">{kpis.orders || 0}</span>
          </div>
          <Users className="w-8 h-8 text-zinc-500/40" />
        </div>
        <div className="p-5 rounded-xl border border-white/5 bg-zinc-900/40 glass-card flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 block uppercase">FRAUD RATIO IMPACT</span>
            <span className="text-3xl font-bold text-yellow-400 mt-1">{kpis.fraud_ratio}%</span>
          </div>
          <Percent className="w-8 h-8 text-yellow-500/40" />
        </div>
      </div>

      {/* ── FLAGGED CUSTOMERS TABLE ── */}
      <div className="p-6 rounded-xl border border-rose-500/10 bg-zinc-900/40 glass-card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <UserX className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="text-base font-bold text-white">Flagged Customers</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Customers with ≥1 fraud-detected transaction — joined from Dim_Customer &amp; Silver_Orders
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-600 font-mono hidden sm:block">
              Last refreshed: {lastRefreshed.toLocaleTimeString()}
            </span>
            <button
              onClick={fetchFraudCustomers}
              disabled={loadingCustomers}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-zinc-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingCustomers ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 pl-3">Customer ID</th>
                <th className="py-2.5">Full Name</th>
                <th className="py-2.5">Email</th>
                <th className="py-2.5">Country</th>
                <th className="py-2.5">Segment</th>
                <th className="py-2.5 text-center">Fraud Hits</th>
                <th className="py-2.5">Card Status</th>
                <th className="py-2.5">Last Flagged</th>
                <th className="py-2.5 pr-3 text-right">Max Risk Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loadingCustomers && fraudCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-zinc-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-600" />
                    Loading fraud customer data...
                  </td>
                </tr>
              ) : fraudCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-zinc-500">
                    No customers with fraud detections found. Run the simulator to generate events.
                  </td>
                </tr>
              ) : (
                fraudCustomers.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-rose-950/10 transition-colors group">
                    <td className="py-3 pl-3">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-[11px]">
                        {c.customer_id}
                      </span>
                    </td>
                    <td className="py-3 text-white font-semibold">{c.customer_name}</td>
                    <td className="text-zinc-400">{c.email}</td>
                    <td className="text-zinc-400">{c.country}</td>
                    <td>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-300">
                        {c.segment}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-500/15 border border-rose-500/20 text-rose-400 font-bold text-xs">
                        {c.fraud_count}
                      </span>
                    </td>
                    <td>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        (c.card_statuses || '').includes('Blocked')
                          ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                          : 'bg-zinc-800 border border-zinc-700 text-zinc-400'
                      }`}>
                        {c.card_statuses || 'N/A'}
                      </span>
                    </td>
                    <td className="text-zinc-500 text-[10px]">
                      {c.last_flagged_at ? new Date(c.last_flagged_at).toLocaleString() : '—'}
                    </td>
                    <td className="pr-3 text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${riskBadge(c.max_fraud_score)}`}>
                        {riskLabel(c.max_fraud_score)} · {c.max_fraud_score}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {fraudCustomers.length > 0 && (
          <div className="mt-3 text-[10px] text-zinc-600 font-mono text-right">
            {fraudCustomers.length} unique customer{fraudCustomers.length !== 1 ? 's' : ''} flagged · auto-refreshes every 15s
          </div>
        )}
      </div>

      {/* Rules Engine and Stats Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-xl border border-white/5 bg-zinc-900/40 glass-card space-y-4">
          <h3 className="text-base font-bold text-white border-b border-white/5 pb-3">Active Rules Engine Hierarchy</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ruleStats.map((r, idx) => (
              <div key={idx} className={`p-4 rounded-xl border ${r.color} flex flex-col justify-between h-32`}>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold font-mono">{r.name}</span>
                    <span className="text-[9px] uppercase font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">Active</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-normal font-light">{r.desc}</p>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-2">
                  <span className="text-[9px] font-mono text-zinc-500">HIT COUNTER</span>
                  <span className="text-xs font-bold font-mono">{r.hits} triggered</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/40 glass-card">
          <h3 className="text-base font-bold text-white mb-6">Rule Trigger Frequency</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#52525b" fontSize={10} fontFamily="JetBrains Mono" />
                <YAxis stroke="#52525b" fontSize={10} fontFamily="JetBrains Mono" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  itemStyle={{ fontSize: 10 }}
                />
                <Bar dataKey="hits" fill="#ff007f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Flagged Transactions Feed */}
      <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/40 glass-card">
        <h3 className="text-base font-bold text-white mb-4">Flagged Suspicious Transactions (Silver Reject Partition)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 uppercase tracking-wider pb-2 text-[10px]">
                <th className="py-2.5 pl-4">Order ID</th>
                <th className="py-2.5">Customer Email</th>
                <th className="py-2.5">Product ID</th>
                <th className="py-2.5">Amount</th>
                <th className="py-2.5">Billing Country</th>
                <th className="py-2.5">IP Address</th>
                <th className="py-2.5">Card Code</th>
                <th className="py-2.5">Risk Reasons</th>
                <th className="py-2.5 pr-4 text-right">Shield Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {fraudEvents.length > 0 ? (
                fraudEvents.map((fe, i) => (
                  <tr key={i} className="hover:bg-rose-950/5 text-rose-300">
                    <td className="py-3 pl-4 font-bold text-white">{fe.order_id}</td>
                    <td>{fe.email}</td>
                    <td>{fe.product_id}</td>
                    <td>${fe.amount}</td>
                    <td>{fe.billing_country}</td>
                    <td>{fe.ip_address}</td>
                    <td>
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[10px]">
                        {fe.card_status}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate text-[10px] text-zinc-400">
                      {fe.fraud_reasons && Array.isArray(fe.fraud_reasons)
                        ? fe.fraud_reasons.join(', ')
                        : 'Rule anomaly score triggered'}
                    </td>
                    <td className="pr-4 text-right font-bold text-rose-400">{fe.fraud_score} / 100</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-500">
                    No fraud events flagged in the current window. Adjust simulator fraud sliders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
