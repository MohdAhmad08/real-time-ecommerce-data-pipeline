import React from 'react';
import { TrendingUp, Award, RefreshCw, ShoppingBag } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';

interface AnalyticsPageProps {
  kpis: {
    revenue: number;
    orders: number;
    conversion_rate: number;
    category_sales: Record<string, number>;
    top_products: Array<{ name: string; orders: number }>;
    returns_count: number;
  };
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ kpis }) => {
  // Format category sales for Recharts
  const catData = Object.entries(kpis.category_sales || {}).map(([name, value]) => ({
    name,
    revenue: value
  }));

  // Historical daily revenue simulation
  const revenueHistory = [
    { day: "07-10", revenue: kpis.revenue * 0.72 },
    { day: "07-11", revenue: kpis.revenue * 0.78 },
    { day: "07-12", revenue: kpis.revenue * 0.81 },
    { day: "07-13", revenue: kpis.revenue * 0.88 },
    { day: "07-14", revenue: kpis.revenue * 0.94 },
    { day: "07-15", revenue: kpis.revenue * 0.97 },
    { day: "07-16", revenue: kpis.revenue }
  ];

  const COLORS = ['#00d2ff', '#9d4edd', '#00f5d4', '#ff007f', '#ffb703'];

  const returnReasonsData = [
    { name: 'Defective/Damaged', value: 45 },
    { name: 'Wrong Size', value: 25 },
    { name: 'Incorrect Item', value: 18 },
    { name: 'Late Delivery', value: 12 }
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Business Intelligence Analytics</h1>
        <p className="text-zinc-400 text-sm">Long-term aggregations and cohort metrics materialized from the Gold data layer.</p>
      </div>

      {/* Grid 1: Revenue Trends & Category Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue timeline */}
        <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/40 glass-card">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Daily Revenue Progression (Gold Table)</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueHistory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d2ff" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#00d2ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="day" stroke="#52525b" fontSize={10} fontFamily="JetBrains Mono" />
                <YAxis stroke="#52525b" fontSize={10} fontFamily="JetBrains Mono" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  itemStyle={{ fontSize: 10 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#00d2ff" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/40 glass-card">
          <div className="flex items-center gap-2 mb-6">
            <ShoppingBag className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">Revenue by Product Category</h3>
          </div>
          <div className="h-64 w-full">
            {catData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#52525b" fontSize={10} fontFamily="JetBrains Mono" />
                  <YAxis stroke="#52525b" fontSize={10} fontFamily="JetBrains Mono" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ fontSize: 10 }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {catData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">
                Awaiting Gold table aggregates...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid 2: Top Products, Returns Anomaly */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top selling products */}
        <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/40 glass-card lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Award className="w-5 h-5 text-yellow-400" />
            <h3 className="text-base font-bold text-white">Top 5 Selling Products (Dim_Product + Fact_Orders)</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/5 text-zinc-500 uppercase text-[9px] pb-2">
                  <th className="py-2 pl-4">Product Name</th>
                  <th className="py-2 text-right pr-4">Orders count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {kpis.top_products && kpis.top_products.length > 0 ? (
                  kpis.top_products.map((prod, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="py-3 pl-4 text-white font-bold">{prod.name}</td>
                      <td className="text-right pr-4 text-cyan-400">{prod.orders} sales</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="py-6 text-center text-zinc-500">
                      No sales recorded in Fact_Orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Returns analysis */}
        <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/40 glass-card flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
              <RefreshCw className="w-5 h-5 text-rose-400" />
              <h3 className="text-base font-bold text-white">Product Returns</h3>
            </div>
            
            <div className="flex justify-between items-center bg-black/40 border border-white/5 rounded-lg p-3 text-xs mb-4">
              <span className="text-zinc-500 font-mono">TOTAL REFUNDS FILTED:</span>
              <span className="font-bold text-rose-400 font-mono">{kpis.returns_count} processes</span>
            </div>
          </div>

          {/* Pie Chart */}
          <div className="relative h-40 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={returnReasonsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {returnReasonsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ fontSize: 10 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-zinc-400 font-mono">REASONS</span>
              <span className="text-[10px] text-zinc-600 font-mono">DISTRIB.</span>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-zinc-400 mt-4 border-t border-white/5 pt-3">
            {returnReasonsData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx] }}></span>
                <span className="truncate">{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
