import React, { useState, useCallback } from 'react';
import { RefreshCw, Download, FileText, Share2, Filter, ChevronLeft, ChevronRight, CheckCircle2, Copy, Check, X, Link } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as BChart, Bar, Cell } from 'recharts';


interface PowerBiPageProps {
  kpis: {
    revenue: number;
    orders: number;
    fraud_alerts: number;
    fraud_ratio: number;
    conversion_rate: number;
    category_sales: Record<string, number>;
    top_products: Array<{ name: string; orders: number }>;
    returns_count: number;
  };
  onTriggerAirflow?: () => void;
  airflowDagStatus?: string;
}

export const PowerBiPage: React.FC<PowerBiPageProps> = ({ kpis, onTriggerAirflow, airflowDagStatus }) => {
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'customers' | 'operations'>('overview');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedChannel, setSelectedChannel] = useState('All');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Simulated filters multiplier
  const mult = selectedRegion === 'North America' ? 0.6 : selectedRegion === 'Europe' ? 0.25 : selectedRegion === 'Asia' ? 0.15 : 1.0;

  const revenue = kpis.revenue * mult;
  const orders = Math.round(kpis.orders * mult);
  const fraudAlerts = Math.round(kpis.fraud_alerts * (selectedRegion === 'All' ? 1.0 : 0.4));

  // Category sales based on region multiplier
  const catData = Object.entries(kpis.category_sales || {}).map(([name, val]) => ({
    name,
    sales: val * mult
  }));

  const COLORS = ['#f2c94c', '#2f80ed', '#27ae60', '#eb5757', '#9b51e0'];

  // --- Export Handler ---
  const handleExport = useCallback(() => {
    const tabLabel =
      activeReportTab === 'overview' ? 'Executive Overview'
      : activeReportTab === 'customers' ? 'Customer Analytics'
      : 'Operations & SLA';

    const rows: string[][] = [];

    if (activeReportTab === 'overview') {
      rows.push(['StreamFlow BI Report – Executive Overview']);
      rows.push(['Region Filter', selectedRegion]);
      rows.push(['Channel Filter', selectedChannel]);
      rows.push([]);
      rows.push(['Metric', 'Value']);
      rows.push(['Total Sales Revenue', `$${revenue.toFixed(2)}`]);
      rows.push(['Purchase Orders', String(orders)]);
      rows.push(['Fraud Blocks', String(fraudAlerts)]);
      rows.push(['Conversion Rate', `${kpis.conversion_rate}%`]);
      rows.push([]);
      rows.push(['Category', 'Revenue']);
      catData.forEach(({ name, sales }) => rows.push([name, `$${sales.toFixed(2)}`]));
    } else if (activeReportTab === 'customers') {
      rows.push(['StreamFlow BI Report – Customer Analytics']);
      rows.push([]);
      rows.push(['Metric', 'Value']);
      rows.push(['Customer Lifetime Value (LTV)', '$345.50 avg']);
      rows.push(['Retention Rate', '78.4%']);
      rows.push(['Churn Risk Rate', '5.2%']);
      rows.push([]);
      rows.push(['Cohort Month', 'New Customers', 'Month 1', 'Month 2', 'Month 3']);
      rows.push(['January 2026', '1200', '45%', '38%', '32%']);
      rows.push(['February 2026', '1450', '48%', '41%', '-']);
      rows.push(['March 2026', '1800', '52%', '-', '-']);
    } else {
      rows.push(['StreamFlow BI Report – Operations & SLA']);
      rows.push([]);
      rows.push(['Metric', 'Value']);
      rows.push(['Avg Delivery SLA', '2.4 days']);
      rows.push(['Shipment Delays', '1.2%']);
      rows.push(['Returns Rate', '3.1%']);
      rows.push([]);
      rows.push(['Service', 'SLA Status']);
      rows.push(['Shipment-Enricher Service', 'SLA COMPLIANT (99.8%)']);
      rows.push(['Fact_Returns Compilation', 'SLA COMPLIANT (100.0%)']);
      rows.push(['dbt Model Materialization', 'WARNING (95.4%)']);
    }

    const csvContent = rows
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StreamFlow_BI_${tabLabel.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [activeReportTab, selectedRegion, selectedChannel, revenue, orders, fraudAlerts, catData, kpis.conversion_rate]);

  // --- Share / Copy Handler ---
  const shareUrl = `${window.location.origin}/dashboard/bi-report?tab=${activeReportTab}&region=${encodeURIComponent(selectedRegion)}&channel=${encodeURIComponent(selectedChannel)}`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [shareUrl]);

  return (
    <div className="space-y-6">

      {/* Share Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={() => setShareModalOpen(false)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 bg-[#eae8e6]">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[#f2c94c] text-[10px] font-bold">Power BI</span>
                <span className="text-sm font-bold text-zinc-800">Share Report</span>
              </div>
              <button onClick={() => setShareModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer rounded p-0.5 hover:bg-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 py-5 space-y-4">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Share this report view with your team. The link includes the current tab, region, and channel filter selections.
              </p>

              {/* Current View Info */}
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                {[
                  { label: 'Report Tab', value: activeReportTab === 'overview' ? 'Executive Overview' : activeReportTab === 'customers' ? 'Customer Analytics' : 'Operations & SLA' },
                  { label: 'Region', value: selectedRegion },
                  { label: 'Channel', value: selectedChannel },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-zinc-50 border border-zinc-200 rounded p-2 text-center">
                    <div className="font-bold text-zinc-400 uppercase tracking-wider mb-1">{label}</div>
                    <div className="font-semibold text-zinc-700 truncate">{value}</div>
                  </div>
                ))}
              </div>

              {/* URL Box */}
              <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
                <Link className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="text-[11px] font-mono text-zinc-600 truncate flex-1">{shareUrl}</span>
              </div>

              {/* Copy Button */}
              <button
                onClick={handleCopy}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#2f80ed] hover:bg-blue-600 text-white'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Link Copied!' : 'Copy Link to Clipboard'}
              </button>

              {/* Divider */}
              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-200" />
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">or share via</span>
                <div className="flex-1 h-px bg-zinc-200" />
              </div>

              {/* Quick share chips */}
              <div className="flex gap-2 justify-center">
                {[
                  { label: 'Email', icon: '✉️', href: `mailto:?subject=StreamFlow%20BI%20Report&body=${encodeURIComponent(shareUrl)}` },
                  { label: 'Teams', icon: '💼', href: `https://teams.microsoft.com/share?href=${encodeURIComponent(shareUrl)}&msgText=StreamFlow+BI+Report` },
                  { label: 'Slack', icon: '💬', href: `https://slack.com/intl/en-us/` },
                ].map(({ label, icon, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-medium text-zinc-700 transition-colors"
                  >
                    <span>{icon}</span> {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Power BI Embedded Portal</h1>
        <p className="text-zinc-400 text-sm">DirectQuery model linked to Snowflake star-schema warehouse partitions.</p>
      </div>

      {/* Simulated Power BI Outer Frame Container */}
      <div className="rounded-xl border border-zinc-700 bg-[#f3f2f1] text-zinc-800 shadow-2xl overflow-hidden flex flex-col min-h-[640px]">
        
        {/* Power BI Cloud Toolbar */}
        <div className="bg-[#eae8e6] border-b border-zinc-300 px-4 py-2 flex items-center justify-between text-xs font-medium text-zinc-700">
          <div className="flex items-center gap-4">
            <span className="font-extrabold text-[#f2c94c] tracking-tight text-sm flex items-center gap-1.5 select-none">
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[#f2c94c] text-[10px]">Power BI</span>
              StreamFlow BI Report
            </span>
            <div className="h-4 w-[1px] bg-zinc-300"></div>
            <button className="flex items-center gap-1 hover:bg-zinc-200 px-2 py-1 rounded transition-colors cursor-pointer select-none">
              <FileText className="w-3.5 h-3.5" /> File
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1 hover:bg-blue-100 hover:text-blue-700 px-2 py-1 rounded transition-colors cursor-pointer select-none font-semibold"
              title="Export current report as CSV"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button
              onClick={() => setShareModalOpen(true)}
              className="flex items-center gap-1 hover:bg-violet-100 hover:text-violet-700 px-2 py-1 rounded transition-colors cursor-pointer select-none font-semibold"
              title="Share this report view"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={onTriggerAirflow}
              disabled={airflowDagStatus === 'Running'}
              className="flex items-center gap-1 text-[11px] hover:bg-zinc-200 disabled:opacity-40 disabled:pointer-events-none px-2.5 py-1 rounded transition-colors font-bold text-zinc-800 cursor-pointer select-none"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#2f80ed] ${airflowDagStatus === 'Running' ? 'animate-spin' : ''}`} /> {airflowDagStatus === 'Running' ? 'Refreshing...' : 'Refresh DWH'}
            </button>
            <div className="h-4 w-[1px] bg-zinc-300"></div>
            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 px-2 py-0.5 rounded font-mono font-bold">
              DirectQuery Connect
            </span>
          </div>
        </div>

        {/* Middle Shell: Workspace Canvas + Filters */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Main Canvas Report Layout */}
          <div className="flex-1 p-6 overflow-y-auto bg-white flex flex-col justify-between">
            <div className="space-y-6">
              
              {/* Report Header */}
              <div className="flex justify-between items-center border-b border-zinc-200 pb-3">
                <div>
                  <h2 className="text-xl font-extrabold text-zinc-900">
                    {activeReportTab === 'overview' && 'Executive Performance Overview'}
                    {activeReportTab === 'customers' && 'Customer Cohort Analysis'}
                    {activeReportTab === 'operations' && 'Logistics & Operational SLAs'}
                  </h2>
                  <p className="text-xs text-zinc-500 font-mono">Snowflake star-schema dataset partition metrics</p>
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  Report Id: SF-RPT-001243
                </div>
              </div>

              {/* TAB 1: EXECUTIVE OVERVIEW */}
              {activeReportTab === 'overview' && (
                <div className="space-y-6">
                  {/* KPI Cards look like Power BI cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-50 border border-zinc-200 p-4 rounded text-center relative flex flex-col justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase block">Total Sales Revenue</span>
                      <span className="text-2xl font-extrabold text-zinc-900 font-mono my-2">
                        ${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-emerald-600 font-bold flex items-center justify-center gap-1">
                        ▲ 4.8% vs last week
                      </span>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200 p-4 rounded text-center relative flex flex-col justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase block">Purchase orders</span>
                      <span className="text-2xl font-extrabold text-zinc-900 font-mono my-2">
                        {orders.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-emerald-600 font-bold flex items-center justify-center gap-1">
                        ▲ 3.2% vs last week
                      </span>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200 p-4 rounded text-center relative flex flex-col justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase block">Fraud Blocks</span>
                      <span className="text-2xl font-extrabold text-rose-600 font-mono my-2">
                        {fraudAlerts} alerts
                      </span>
                      <span className="text-[9px] text-rose-500 font-bold flex items-center justify-center gap-1">
                        ▼ Risk minimized by 12%
                      </span>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200 p-4 rounded text-center relative flex flex-col justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase block">Conversion Rate</span>
                      <span className="text-2xl font-extrabold text-zinc-900 font-mono my-2">
                        {kpis.conversion_rate}%
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono">
                        Active traffic channels
                      </span>
                    </div>
                  </div>

                  {/* Visual Charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    {/* Category Chart */}
                    <div className="border border-zinc-200 p-4 rounded bg-zinc-50">
                      <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase block mb-4">Revenue Breakdown by Product Line</span>
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BChart data={catData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="name" stroke="#555" fontSize={9} />
                            <YAxis stroke="#555" fontSize={9} />
                            <Tooltip itemStyle={{ fontSize: 10 }} />
                            <Bar dataKey="sales" radius={[2, 2, 0, 0]}>
                              {catData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Snowflake Model visual schema description */}
                    <div className="border border-zinc-200 p-4 rounded bg-zinc-50 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase block mb-3">Model Relationships (Star Schema)</span>
                        <div className="space-y-2 text-[10px] font-mono">
                          <div className="flex items-center gap-1.5 p-1 bg-white border border-zinc-200 rounded text-zinc-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Fact_Orders ➔ Dim_Customer (customer_id)</span>
                          </div>
                          <div className="flex items-center gap-1.5 p-1 bg-white border border-zinc-200 rounded text-zinc-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Fact_Orders ➔ Dim_Product (product_id)</span>
                          </div>
                          <div className="flex items-center gap-1.5 p-1 bg-white border border-zinc-200 rounded text-zinc-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Fact_Orders ➔ Dim_Date (date_key)</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[9px] text-zinc-400 mt-4 leading-relaxed font-light">
                        * All relationships are strictly enforced via dbt schema validation constraints in Gold models.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CUSTOMER ANALYTICS */}
              {activeReportTab === 'customers' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-50 border border-zinc-200 p-4 rounded text-center">
                      <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase block">Customer Lifetime Value (LTV)</span>
                      <span className="text-2xl font-extrabold text-zinc-900 font-mono block my-2">$345.50 avg</span>
                      <span className="text-[9px] text-emerald-600 font-bold">▲ 2.5% MoM increase</span>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-200 p-4 rounded text-center">
                      <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase block">Retention Rate</span>
                      <span className="text-2xl font-extrabold text-zinc-900 font-mono block my-2">78.4%</span>
                      <span className="text-[9px] text-emerald-600 font-bold">▲ Healthy returning cohort</span>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-200 p-4 rounded text-center">
                      <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase block">Churn Risk Rate</span>
                      <span className="text-2xl font-extrabold text-zinc-900 font-mono block my-2">5.2%</span>
                      <span className="text-[9px] text-rose-500 font-bold">▼ Decreased from 6.8%</span>
                    </div>
                  </div>

                  {/* Customer Cohort Matrix Simulation */}
                  <div className="border border-zinc-200 p-6 rounded bg-zinc-50">
                    <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase block mb-4">Customer Acquisition Cohorts</span>
                    <div className="overflow-x-auto text-[10px] font-mono">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-300 text-zinc-600 uppercase text-[9px] font-bold">
                            <th className="pb-2">Cohort Month</th>
                            <th className="pb-2">New Customers</th>
                            <th className="pb-2">Month 1</th>
                            <th className="pb-2">Month 2</th>
                            <th className="pb-2">Month 3</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 text-zinc-700">
                          <tr>
                            <td className="py-2.5 font-bold">January 2026</td>
                            <td>1,200</td>
                            <td className="bg-blue-100 text-blue-800 font-bold text-center">45%</td>
                            <td className="bg-blue-50 text-blue-700 font-bold text-center">38%</td>
                            <td className="bg-blue-50/50 text-blue-600 text-center">32%</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 font-bold">February 2026</td>
                            <td>1,450</td>
                            <td className="bg-blue-100 text-blue-800 font-bold text-center">48%</td>
                            <td className="bg-blue-50 text-blue-700 font-bold text-center">41%</td>
                            <td className="text-center font-light text-zinc-400">-</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 font-bold">March 2026</td>
                            <td>1,800</td>
                            <td className="bg-blue-100 text-blue-800 font-bold text-center">52%</td>
                            <td className="text-center font-light text-zinc-400">-</td>
                            <td className="text-center font-light text-zinc-400">-</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: OPERATIONS & SLA */}
              {activeReportTab === 'operations' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-50 border border-zinc-200 p-4 rounded text-center">
                      <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase block">Avg Delivery SLA</span>
                      <span className="text-2xl font-extrabold text-zinc-900 font-mono block my-2">2.4 days</span>
                      <span className="text-[9px] text-emerald-600 font-bold">▲ Within 3-day target limit</span>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-200 p-4 rounded text-center">
                      <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase block">Shipment Delays</span>
                      <span className="text-2xl font-extrabold text-zinc-900 font-mono block my-2">1.2%</span>
                      <span className="text-[9px] text-emerald-600 font-bold">▼ Reduced by 0.5% MoM</span>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-200 p-4 rounded text-center">
                      <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase block">Returns Rate</span>
                      <span className="text-2xl font-extrabold text-zinc-900 font-mono block my-2">3.1%</span>
                      <span className="text-[9px] text-zinc-500">Industry standard SLA</span>
                    </div>
                  </div>

                  <div className="border border-zinc-200 p-6 rounded bg-zinc-50">
                    <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase block mb-4">SLA Compliance Logs</span>
                    <div className="space-y-3 font-mono text-[10px]">
                      <div className="flex justify-between items-center p-2 border-b border-zinc-200 last:border-0 text-zinc-700">
                        <span className="font-bold">Shipment-Enricher Service</span>
                        <span className="text-emerald-700 font-bold">SLA COMPLIANT (99.8%)</span>
                      </div>
                      <div className="flex justify-between items-center p-2 border-b border-zinc-200 last:border-0 text-zinc-700">
                        <span className="font-bold">Fact_Returns Compilation</span>
                        <span className="text-emerald-700 font-bold">SLA COMPLIANT (100.0%)</span>
                      </div>
                      <div className="flex justify-between items-center p-2 border-b border-zinc-200 last:border-0 text-zinc-700">
                        <span className="font-bold">dbt Model Materialization</span>
                        <span className="text-yellow-700 font-bold">WARNING (95.4%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Collapsible Power BI Filter Pane */}
          {filtersOpen ? (
            <div className="w-64 bg-[#f3f2f1] border-l border-zinc-300 p-4 flex flex-col justify-between shrink-0 transition-all select-none">
              <div className="space-y-5">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-700 border-b border-zinc-300 pb-2">
                  <span className="flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Filters</span>
                  <button onClick={() => setFiltersOpen(false)} className="hover:bg-zinc-200 p-0.5 rounded cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Filter 1: Region */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-wider uppercase text-zinc-500">Region Parameter</label>
                  <div className="flex flex-col gap-1">
                    {['All', 'North America', 'Europe', 'Asia'].map((r) => (
                      <button
                        key={r}
                        onClick={() => setSelectedRegion(r)}
                        className={`px-3 py-1.5 rounded text-left text-xs font-medium transition-colors cursor-pointer ${
                          selectedRegion === r
                            ? 'bg-[#2f80ed] text-white'
                            : 'hover:bg-zinc-200 text-zinc-700'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter 2: Channel */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-wider uppercase text-zinc-500">Sales Channel</label>
                  <div className="flex flex-col gap-1">
                    {['All', 'Web', 'Mobile App'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedChannel(c)}
                        className={`px-3 py-1.5 rounded text-left text-xs font-medium transition-colors cursor-pointer ${
                          selectedChannel === c
                            ? 'bg-[#2f80ed] text-white'
                            : 'hover:bg-zinc-200 text-zinc-700'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-[9px] text-zinc-400 font-mono">
                Model: DWH_Gold_Star_Model
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setFiltersOpen(true)}
              className="bg-[#eae8e6] border-l border-zinc-300 w-10 hover:bg-zinc-200 flex flex-col items-center pt-4 gap-2 transition-all cursor-pointer text-zinc-600 select-none shrink-0"
            >
              <Filter className="w-4 h-4" />
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

        </div>

        {/* Bottom Tab strip Navigation (Power BI Service Report Pages) */}
        <div className="bg-[#eae8e6] border-t border-zinc-300 py-1.5 px-4 flex items-center justify-between text-xs font-medium text-zinc-700 select-none">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveReportTab('overview')}
              className={`px-4 py-1 rounded transition-colors border cursor-pointer ${
                activeReportTab === 'overview'
                  ? 'bg-white border-zinc-300 text-zinc-900 font-bold shadow-sm'
                  : 'bg-transparent border-transparent hover:bg-zinc-200 text-zinc-600'
              }`}
            >
              Executive Overview
            </button>
            <button
              onClick={() => setActiveReportTab('customers')}
              className={`px-4 py-1 rounded transition-colors border cursor-pointer ${
                activeReportTab === 'customers'
                  ? 'bg-white border-zinc-300 text-zinc-900 font-bold shadow-sm'
                  : 'bg-transparent border-transparent hover:bg-zinc-200 text-zinc-600'
              }`}
            >
              Customer Analytics
            </button>
            <button
              onClick={() => setActiveReportTab('operations')}
              className={`px-4 py-1 rounded transition-colors border cursor-pointer ${
                activeReportTab === 'operations'
                  ? 'bg-white border-zinc-300 text-zinc-900 font-bold shadow-sm'
                  : 'bg-transparent border-transparent hover:bg-zinc-200 text-zinc-600'
              }`}
            >
              Operations & SLA
            </button>
          </div>

          <div className="text-[10px] text-zinc-400 font-mono">
            Page 1 of 1
          </div>
        </div>

      </div>
    </div>
  );
};
