import React from 'react';
import { DollarSign, ShoppingCart, ShieldAlert, Activity, Clock, Zap, MapPin, ListFilter } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardPageProps {
  metrics: {
    kafka_lag: number;
    spark_throughput: number;
    spark_latency: number;
    spark_status: string;
  };
  kpis: {
    revenue: number;
    orders: number;
    fraud_alerts: number;
    fraud_ratio: number;
    conversion_rate: number;
    category_sales: Record<string, number>;
    top_products: Array<{ name: string; orders: number }>;
    geo_sales: Array<{ country: string; orders: number; revenue: number }>;
  };
  events: any[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ metrics, kpis, events }) => {
  // Build chart history from recent events
  const chartData = events.slice(0, 10).reverse().map((ev, i) => ({
    time: ev.transaction_date ? ev.transaction_date.slice(11, 19) : `L${10-i}`,
    throughput: metrics.spark_throughput,
    latency: metrics.spark_latency
  }));

  const cardData = [
    {
      label: "TOTAL REVENUE",
      value: `$${(kpis.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <DollarSign className="w-5 h-5 text-cyan-400" />,
      color: "text-cyan-400",
      glow: "shadow-cyan-500/10"
    },
    {
      label: "TOTAL ORDERS",
      value: (kpis.orders || 0).toLocaleString(),
      icon: <ShoppingCart className="w-5 h-5 text-purple-400" />,
      color: "text-purple-400",
      glow: "shadow-purple-500/10"
    },
    {
      label: "FRAUD DETECTED",
      value: `${kpis.fraud_alerts || 0} alerts`,
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
      color: "text-rose-400",
      glow: "shadow-rose-500/10",
      sub: `${kpis.fraud_ratio}% fraud rate`
    },
    {
      label: "STREAM THROUGHPUT",
      value: `${metrics.spark_throughput || 0} eps`,
      icon: <Activity className="w-5 h-5 text-emerald-400" />,
      color: "text-emerald-400",
      glow: "shadow-emerald-500/10",
      sub: "Spark Structured Streaming"
    },
    {
      label: "PROCESSING LATENCY",
      value: `${metrics.spark_latency || 0} ms`,
      icon: <Clock className="w-5 h-5 text-yellow-400" />,
      color: "text-yellow-400",
      glow: "shadow-yellow-500/10",
      sub: `Kafka Lag: ${metrics.kafka_lag} offsets`
    }
  ];

  // Countries positions for SVG Map
  const mapCountries = [
    { code: "US", name: "United States", x: 180, y: 150, color: "#00d2ff" },
    { code: "CA", name: "Canada", x: 170, y: 110, color: "#9d4edd" },
    { code: "GB", name: "United Kingdom", x: 460, y: 115, color: "#00f5d4" },
    { code: "DE", name: "Germany", x: 495, y: 125, color: "#ff007f" },
    { code: "FR", name: "France", x: 480, y: 135, color: "#00d2ff" },
    { code: "JP", name: "Japan", x: 840, y: 165, color: "#9d4edd" },
    { code: "AU", name: "Australia", x: 880, y: 380, color: "#00f5d4" },
    { code: "IN", name: "India", x: 700, y: 220, color: "#ff007f" }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">System Overview</h1>
          <p className="text-zinc-400 text-sm">Real-time processing dashboard updated via persistent WebSockets.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-mono bg-zinc-950/60 border border-white/5 px-3 py-1.5 rounded-lg text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            SPARK ENGINE: RUNNING
          </span>
          <span className="flex items-center gap-2 text-xs font-mono bg-zinc-950/60 border border-white/5 px-3 py-1.5 rounded-lg text-cyan-400">
            <Zap className="w-3.5 h-3.5" />
            LAG: {metrics.kafka_lag}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cardData.map((cd, idx) => (
          <div key={idx} className={`p-5 rounded-xl border border-white/5 bg-zinc-900/40 glass-card relative overflow-hidden flex flex-col justify-between shadow ${cd.glow}`}>
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">{cd.label}</span>
              {cd.icon}
            </div>
            <div>
              <div className={`text-2xl font-bold tracking-tight ${cd.color} mb-1`}>
                {cd.value}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">
                {cd.sub || 'Active ingestion'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Streaming Throughput Chart */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-white/5 bg-zinc-900/40 glass-card">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Stream Pipeline Performance</h3>
              <p className="text-xs text-zinc-500 font-mono">Throughput (eps) vs Processing Latency (ms)</p>
            </div>
            <div className="flex gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500"></span> Throughput
              </span>
              <span className="flex items-center gap-1.5 text-purple-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500"></span> Latency
              </span>
            </div>
          </div>
          <div className="h-72 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorThru" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d2ff" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#00d2ff" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9d4edd" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#9d4edd" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" stroke="#52525b" fontSize={10} fontFamily="JetBrains Mono" />
                  <YAxis stroke="#52525b" fontSize={10} fontFamily="JetBrains Mono" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    itemStyle={{ fontSize: 11 }}
                  />
                  <Area type="monotone" dataKey="throughput" stroke="#00d2ff" fillOpacity={1} fill="url(#colorThru)" strokeWidth={2} />
                  <Area type="monotone" dataKey="latency" stroke="#9d4edd" fillOpacity={1} fill="url(#colorLat)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">
                Awaiting streaming events from producer...
              </div>
            )}
          </div>
        </div>

        {/* Global Sales Heatmap */}
        <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/40 glass-card flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Global Sales Heatmap</h3>
            <p className="text-xs text-zinc-500 font-mono mb-4">Ingested events by country node</p>
          </div>
          
          {/* Map Area */}
          <div className="relative bg-black/40 border border-white/5 rounded-xl h-56 w-full overflow-hidden flex items-center justify-center">
            <svg 
              className="w-full h-full opacity-65" 
              viewBox="0 0 1000 500" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Simplistic stylized world lines */}
              <path d="M50 150 H950 M50 250 H950 M50 350 H950 M300 50 V450 M500 50 V450 M700 50 V450" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              {/* Dynamic point markers */}
              {mapCountries.map((c) => {
                const sales = kpis.geo_sales.find(s => s.country === c.code) || { orders: 0, revenue: 0 };
                const size = sales.orders > 0 ? Math.min(25, 6 + Math.log2(sales.orders) * 3) : 6;
                return (
                  <g key={c.code}>
                    <circle cx={c.x} cy={c.y} r={size} fill={c.color} className="animate-pulse" fillOpacity="0.6" />
                    <circle cx={c.x} cy={c.y} r={size + 5} stroke={c.color} strokeWidth="1" strokeDasharray="3 3" className="animate-spin" style={{ transformOrigin: `${c.x}px ${c.y}px`, animationDuration: '6s' }} fill="none" />
                  </g>
                );
              })}
            </svg>
            
            {/* Absolute overlay country tagger */}
            <div className="absolute bottom-2 left-2 flex flex-col gap-1 p-2 rounded bg-black/80 border border-white/5 text-[9px] font-mono text-zinc-400">
              <span className="font-bold text-white">ACTIVE NODES</span>
              {kpis.geo_sales.slice(0, 3).map((g, i) => (
                <div key={i} className="flex gap-2 justify-between">
                  <span>{g.country}:</span>
                  <span className="text-cyan-400">${g.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Order Stream */}
      <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/40 glass-card">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-base font-bold text-white">Live Event Stream Console</h3>
            <p className="text-xs text-zinc-500 font-mono">Direct Kafka consumer group orders stream</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono border border-white/5 bg-zinc-950/60 px-2.5 py-1 rounded">
            <ListFilter className="w-3.5 h-3.5 text-zinc-500" /> Kafka Topic: orders
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/5 text-zinc-500 uppercase tracking-wider pb-2 text-[10px]">
                <th className="py-2.5 pl-4">Order ID</th>
                <th className="py-2.5">Customer</th>
                <th className="py-2.5">Product</th>
                <th className="py-2.5">Price</th>
                <th className="py-2.5">Qty</th>
                <th className="py-2.5">Total Amount</th>
                <th className="py-2.5">Billing Country</th>
                <th className="py-2.5">Card Status</th>
                <th className="py-2.5 pr-4 text-right">Risk Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {events.length > 0 ? (
                events.slice(0, 10).map((ev, i) => (
                  <tr 
                    key={ev.order_id || i} 
                    className={`transition-colors duration-150 ${
                      ev.is_fraud 
                        ? 'bg-rose-950/15 text-rose-300 hover:bg-rose-950/25' 
                        : 'hover:bg-white/5 text-zinc-300'
                    }`}
                  >
                    <td className="py-3 pl-4 font-bold text-white">{ev.order_id}</td>
                    <td>{ev.email ? ev.email.split('@')[0] : ev.customer_id}</td>
                    <td>{ev.product_id}</td>
                    <td>${ev.price}</td>
                    <td>{ev.quantity}</td>
                    <td>${ev.amount}</td>
                    <td>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-zinc-500" />
                        {ev.billing_country}
                      </span>
                    </td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${
                        ev.card_status === 'Approved' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}>
                        {ev.card_status}
                      </span>
                    </td>
                    <td className="pr-4 text-right">
                      <span className={`font-bold ${
                        ev.is_fraud ? 'text-rose-400' : ev.fraud_score > 30 ? 'text-yellow-400' : 'text-zinc-500'
                      }`}>
                        {ev.is_fraud ? `ALERT (Score: ${ev.fraud_score})` : `${ev.fraud_score}%`}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-500">
                    Awaiting live transactions. Please start the generator simulation.
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
