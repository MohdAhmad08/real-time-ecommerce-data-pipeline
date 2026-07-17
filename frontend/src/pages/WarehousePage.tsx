import React, { useState, useEffect } from 'react';
import { Database, Play, Code, AlertTriangle, FileCode2, Info, ShoppingCart, CreditCard, RotateCcw, RefreshCw, Layers, Zap, Star, ChevronRight, Eye } from 'lucide-react';
import { API_BASE } from '../config';

interface TableMetadata {
  name: string;
  layer: 'Bronze' | 'Silver' | 'Gold';
  columns: Array<{ name: string; type: string }>;
  rows: number;
}

interface FactPreview {
  columns: string[];
  rows: any[][];
}

interface WarehousePageProps {
  token: string;
}

export const WarehousePage: React.FC<WarehousePageProps> = ({ token }) => {
  const [tables, setTables] = useState<TableMetadata[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [sqlText, setSqlText] = useState('SELECT * FROM Fact_Orders LIMIT 5;');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState('');
  const [queryResult, setQueryResult] = useState<{ columns: string[]; rows: any[][] } | null>(null);

  // ── Medallion layer preview ──
  const [layerPreview, setLayerPreview] = useState<{ table: string; columns: string[]; rows: any[][] } | null>(null);
  const [layerPreviewLoading, setLayerPreviewLoading] = useState(false);

  const loadLayerPreview = async (tableName: string) => {
    setLayerPreviewLoading(true);
    setLayerPreview(null);
    try {
      const res = await fetch(`${API_BASE}/api/warehouse/query`, {
      });
      const data = await res.json();
      if (data.success) setLayerPreview({ table: tableName, columns: data.columns, rows: data.rows });
    } catch { /* silent */ }
    finally { setLayerPreviewLoading(false); }
  };

  // ── Gold Fact Table previews ──
  const [activeFactTab, setActiveFactTab] = useState<'orders' | 'payments' | 'returns'>('orders');
  const [factPreviews, setFactPreviews] = useState<Record<string, FactPreview | null>>({
    orders: null, payments: null, returns: null
  });
  const [factLoading, setFactLoading] = useState(false);

  const FACT_QUERIES: Record<string, string> = {
    orders:   'SELECT order_key, order_id, customer_id, product_id, quantity, price, net_amount, tax_amount, discount_amount, shipping_amount, fraud_flag FROM Fact_Orders ORDER BY order_key DESC LIMIT 10;',
    payments: 'SELECT payment_key, payment_id, order_id, customer_id, amount, payment_method, status FROM Fact_Payments ORDER BY payment_key DESC LIMIT 10;',
    returns:  'SELECT return_key, return_id, order_id, product_id, refund_amount, reason FROM Fact_Returns ORDER BY return_key DESC LIMIT 10;',
  };

  const fetchFactPreview = async (tab: 'orders' | 'payments' | 'returns') => {
    if (factPreviews[tab]) return; // already loaded
    setFactLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/warehouse/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query: FACT_QUERIES[tab] })
      });
      const data = await res.json();
      if (data.success) {
        setFactPreviews(prev => ({ ...prev, [tab]: { columns: data.columns, rows: data.rows } }));
      }
    } catch { /* silent */ }
    finally { setFactLoading(false); }
  };

  const refreshFactPreview = async (tab: 'orders' | 'payments' | 'returns') => {
    setFactPreviews(prev => ({ ...prev, [tab]: null }));
    setFactLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/warehouse/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query: FACT_QUERIES[tab] })
      });
      const data = await res.json();
      if (data.success) {
        setFactPreviews(prev => ({ ...prev, [tab]: { columns: data.columns, rows: data.rows } }));
      }
    } catch { /* silent */ }
    finally { setFactLoading(false); }
  };

  // Fetch schema tables
  useEffect(() => {
    fetchSchema();
    fetchFactPreview('orders'); // preload first tab
  }, []);

  // When tab changes, lazy-load that table
  useEffect(() => {
    fetchFactPreview(activeFactTab);
  }, [activeFactTab]);

  const fetchSchema = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/warehouse/tables`);
      if (res.ok) {
        const data = await res.json();
        setTables(data);
        if (data.length > 0) {
          setSelectedTable(data[0].name);
        }
      }
    } catch (e) {
      console.error("Failed to fetch database schema details", e);
    }
  };

  const handleRunQuery = async () => {
    setQueryLoading(true);
    setQueryError('');
    setQueryResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/warehouse/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: sqlText })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to execute query');
      }

      if (data.success) {
        setQueryResult({
          columns: data.columns,
          rows: data.rows
        });
      } else {
        setQueryError(data.error);
      }
    } catch (err: any) {
      setQueryError(err.message || 'An error occurred during query compilation.');
    } finally {
      setQueryLoading(false);
    }
  };

  // Quick Query templates
  const templates = [
    {
      label: "Bronze Raw Orders",
      sql: "SELECT * FROM Bronze_Orders ORDER BY id DESC LIMIT 5;"
    },
    {
      label: "Silver Clean Transactions",
      sql: "SELECT order_id, customer_id, usd_amount, fraud_score, is_fraud FROM Silver_Orders LIMIT 5;"
    },
    {
      label: "Gold Fact Orders",
      sql: "SELECT order_id, customer_id, net_amount, tax_amount, discount_amount FROM Fact_Orders LIMIT 5;"
    },
    {
      label: "Gold Aggregate Revenue",
      sql: "SELECT p.category, SUM(o.net_amount) as total_net, COUNT(o.order_key) as orders_count\nFROM Fact_Orders o\nJOIN Dim_Product p ON o.product_id = p.product_id\nGROUP BY p.category\nORDER BY total_net DESC;"
    }
  ];

  const factTabConfig = [
    { id: 'orders'   as const, label: 'Fact_Orders',   icon: <ShoppingCart className="w-4 h-4" />, color: 'emerald', desc: 'Completed orders · quantities · net amounts · fraud flags' },
    { id: 'payments' as const, label: 'Fact_Payments', icon: <CreditCard   className="w-4 h-4" />, color: 'blue',    desc: 'Payment modes · timestamps · status metrics · billing' },
    { id: 'returns'  as const, label: 'Fact_Returns',  icon: <RotateCcw    className="w-4 h-4" />, color: 'violet',  desc: 'Return reasons · refund amounts · reference order keys' },
  ];

  const colorMap: Record<string, { tab: string; badge: string; header: string }> = {
    emerald: { tab: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', header: 'text-emerald-400' },
    blue:    { tab: 'bg-blue-500/10 border-blue-500/30 text-blue-400',         badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',         header: 'text-blue-400'    },
    violet:  { tab: 'bg-violet-500/10 border-violet-500/30 text-violet-400',   badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',   header: 'text-violet-400'  },
  };

  const activeCfg = factTabConfig.find(t => t.id === activeFactTab)!;
  const activeColors = colorMap[activeCfg.color];
  const activeData = factPreviews[activeFactTab];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Warehouse Explorer</h1>
        <p className="text-zinc-400 text-sm">Explore relational schemas and execute SQL queries across the Bronze → Silver → Gold medallion architecture.</p>
      </div>

      {/* ══ MEDALLION ARCHITECTURE OVERVIEW ══ */}
      {(() => {
        const bronzeTables = tables.filter(t => t.layer === 'Bronze');
        const silverTables = tables.filter(t => t.layer === 'Silver');
        const goldTables   = tables.filter(t => t.layer === 'Gold');

        const layers = [
          {
            id: 'Bronze', label: 'Bronze Layer', icon: <Layers className="w-5 h-5" />,
            border: 'border-amber-500/20', bg: 'bg-amber-500/5', badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
            dot: 'bg-amber-400', header: 'text-amber-400', arrow: 'text-amber-500/40',
            tableBg: 'hover:bg-amber-500/5 hover:border-amber-500/20',
            desc: 'Raw, immutable event data ingested directly from Kafka. No transformations applied.',
            what: ['Raw JSON events', 'Immutable append-only', 'Kafka topic mirror'],
            tableList: bronzeTables,
            totalRows: bronzeTables.reduce((s, t) => s + t.rows, 0),
          },
          {
            id: 'Silver', label: 'Silver Layer', icon: <Zap className="w-5 h-5" />,
            border: 'border-purple-500/20', bg: 'bg-purple-500/5', badge: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
            dot: 'bg-purple-400', header: 'text-purple-400', arrow: 'text-purple-500/40',
            tableBg: 'hover:bg-purple-500/5 hover:border-purple-500/20',
            desc: 'Cleaned, deduped, fraud-scored, and USD-normalised. Fraud rows quarantined here.',
            what: ['Deduplication', 'Fraud scoring & flagging', 'Currency normalisation', 'Schema validation'],
            tableList: silverTables,
            totalRows: silverTables.reduce((s, t) => s + t.rows, 0),
          },
          {
            id: 'Gold', label: 'Gold Layer', icon: <Star className="w-5 h-5" />,
            border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
            dot: 'bg-emerald-400', header: 'text-emerald-400', arrow: 'text-emerald-500/40',
            tableBg: 'hover:bg-emerald-500/5 hover:border-emerald-500/20',
            desc: 'Star-schema star facts and dimensions. Clean, analytics-ready. Powers BI dashboards.',
            what: ['Star schema facts', 'Dimension tables', 'Aggregated KPIs', 'BI-ready partitions'],
            tableList: goldTables,
            totalRows: goldTables.reduce((s, t) => s + t.rows, 0),
          },
        ];

        return (
          <div className="space-y-4">
            {/* Flow header */}
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-zinc-500" />
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Medallion Architecture — Data Lakehouse</span>
            </div>

            {/* Three layer cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {layers.map((layer, li) => (
                <div key={layer.id} className={`rounded-xl border ${layer.border} ${layer.bg} overflow-hidden`}>
                  {/* Card header */}
                  <div className="px-5 pt-5 pb-4 border-b border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${layer.badge}`}>
                        {layer.icon} {layer.label.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">{layer.totalRows.toLocaleString()} rows total</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{layer.desc}</p>
                    <ul className="mt-3 space-y-1">
                      {layer.what.map(w => (
                        <li key={w} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${layer.dot}`} />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tables list */}
                  <div className="p-3 space-y-1.5">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 px-1 block">Tables</span>
                    {layer.tableList.length === 0 ? (
                      <div className="text-[10px] text-zinc-600 px-2 py-2 italic">Loading...</div>
                    ) : (
                      layer.tableList.map(t => (
                        <button
                          key={t.name}
                          onClick={() => loadLayerPreview(t.name)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border border-transparent text-left text-[11px] font-mono transition-all cursor-pointer group ${
                            layerPreview?.table === t.name
                              ? `${layer.badge} border-current`
                              : `text-zinc-400 ${layer.tableBg} border-white/5`
                          }`}
                        >
                          <span className="font-semibold truncate">{t.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] text-zinc-600">{t.rows} rows</span>
                            <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Flow arrows between cards */}
            <div className="hidden lg:flex justify-center gap-0 -mt-2 pointer-events-none select-none">
              <div className="w-1/3 text-center text-zinc-700 text-xs font-mono">Kafka Ingest ▶</div>
              <div className="w-1/3 text-center text-zinc-700 text-xs font-mono">Spark Structured Streaming ▶</div>
              <div className="w-1/3 text-center text-zinc-700 text-xs font-mono">dbt + Airflow ▶ BI</div>
            </div>

            {/* Layer Preview Panel */}
            {(layerPreview || layerPreviewLoading) && (
              <div className="rounded-xl border border-white/10 bg-zinc-900/60 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm font-bold text-white font-mono">
                      {layerPreview?.table ?? 'Loading...'}
                    </span>
                    {layerPreview && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border font-mono ${
                        layerPreview.table.startsWith('Bronze') ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : layerPreview.table.startsWith('Silver') ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      }`}>
                        {layerPreview.table.startsWith('Bronze') ? 'BRONZE'
                          : layerPreview.table.startsWith('Silver') ? 'SILVER'
                          : 'GOLD'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {layerPreview && (
                      <button
                        onClick={() => setSqlText(`SELECT * FROM ${layerPreview.table} ORDER BY rowid DESC LIMIT 20;`)}
                        className="text-[10px] font-mono text-cyan-500 hover:text-cyan-300 transition-colors cursor-pointer"
                      >
                        Open in SQL Console ↗
                      </button>
                    )}
                    <button
                      onClick={() => setLayerPreview(null)}
                      className="text-zinc-500 hover:text-zinc-300 text-[10px] font-mono cursor-pointer"
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead>
                      <tr className="border-b border-white/5 bg-zinc-950/40">
                        {layerPreviewLoading ? (
                          <th className="py-3 px-4 text-zinc-600">Loading rows...</th>
                        ) : layerPreview?.columns.map((col, i) => (
                          <th key={i} className="py-2.5 px-3 text-[9px] font-bold uppercase tracking-wider text-zinc-500">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {layerPreviewLoading ? (
                        <tr><td className="py-8 text-center text-zinc-500">
                          <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Fetching data...
                        </td></tr>
                      ) : layerPreview && layerPreview.rows.length > 0 ? (
                        layerPreview.rows.map((row, ri) => (
                          <tr key={ri} className="hover:bg-white/[0.02]">
                            {row.map((cell, ci) => (
                              <td key={ci} className="py-2 px-3 text-zinc-300 max-w-[180px] truncate">
                                {cell === null
                                  ? <span className="text-zinc-600 italic">NULL</span>
                                  : typeof cell === 'string' && cell.length > 60
                                    ? <span title={cell}>{cell.slice(0, 60)}…</span>
                                    : String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={10} className="py-8 text-center text-zinc-500">No rows found in this table.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {layerPreview && (
                  <div className="px-5 py-2 border-t border-white/5 text-[9px] text-zinc-600 font-mono">
                    {layerPreview.rows.length} rows shown · latest 8 · read-only
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── GOLD LAYER FACT TABLES ── */}
      <div className="rounded-xl border border-emerald-500/10 bg-zinc-900/40 glass-card overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/5 flex flex-col sm:flex-row justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">GOLD LAYER</span>
              <h2 className="text-base font-bold text-white">Star Schema — Fact Tables</h2>
            </div>
            <p className="text-[11px] text-zinc-500">Live data from SQLite Gold layer · last 10 rows · auto-joined from Silver after fraud filtering</p>
          </div>
          <button
            onClick={() => refreshFactPreview(activeFactTab)}
            disabled={factLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-zinc-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40 cursor-pointer self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${factLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-white/5">
          {factTabConfig.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFactTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeFactTab === tab.id
                  ? `${activeColors.tab} border-current`
                  : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="p-5">
          {/* Desc + quick-load SQL link */}
          <div className="flex justify-between items-center mb-4">
            <p className="text-[11px] text-zinc-500 font-mono">{activeCfg.desc}</p>
            <button
              onClick={() => setSqlText(FACT_QUERIES[activeFactTab])}
              className="text-[10px] font-mono text-cyan-500 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              Open in SQL Console ↗
            </button>
          </div>

          {/* Table preview */}
          <div className="overflow-x-auto rounded-lg border border-white/5">
            <table className="w-full text-left text-[11px] font-mono">
              <thead>
                <tr className="border-b border-white/5 bg-zinc-950/60">
                  {factLoading && !activeData ? (
                    <th className="py-3 px-4 text-zinc-500">Loading...</th>
                  ) : activeData ? (
                    activeData.columns.map((col, i) => (
                      <th key={i} className={`py-2.5 px-3 font-bold uppercase tracking-wider text-[9px] ${activeColors.header}`}>{col}</th>
                    ))
                  ) : (
                    <th className="py-3 px-4 text-zinc-500">No data</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {factLoading && !activeData ? (
                  <tr><td className="py-8 px-4 text-center text-zinc-500">
                    <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading rows from Gold layer...
                  </td></tr>
                ) : activeData && activeData.rows.length > 0 ? (
                  activeData.rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-white/[0.02] transition-colors">
                      {row.map((cell, ci) => (
                        <td key={ci} className="py-2.5 px-3 text-zinc-300 whitespace-nowrap">
                          {cell === null ? <span className="text-zinc-600 italic">NULL</span>
                            : ci === 0 ? <span className={`font-bold ${activeColors.header}`}>{String(cell)}</span>
                            : typeof cell === 'number' && activeData.columns[ci].toLowerCase().includes('amount')
                              ? <span className="text-emerald-400 font-semibold">${Number(cell).toFixed(2)}</span>
                            : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : activeData && activeData.rows.length === 0 ? (
                  <tr><td colSpan={10} className="py-8 text-center text-zinc-500">
                    No rows yet — run the Event Simulator to generate Gold layer data.
                  </td></tr>
                ) : (
                  <tr><td className="py-8 px-4 text-center text-zinc-500">Click a tab to load data.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {activeData && (
            <div className="mt-2 text-[9px] text-zinc-600 font-mono text-right">
              Showing {activeData.rows.length} of latest rows · SELECT from Gold SQLite · read-only
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Schema Browser Side panel */}
        <div className="p-5 rounded-xl border border-white/5 bg-zinc-900/40 glass-card space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Database className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Data Catalog</h3>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {tables.map((t) => (
              <button
                key={t.name}
                onClick={() => setSelectedTable(t.name)}
                className={`w-full p-2.5 rounded-lg text-left text-xs font-mono border transition-all cursor-pointer ${
                  selectedTable === t.name
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-bold'
                    : 'bg-zinc-950/20 border-white/5 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span>{t.name}</span>
                  <span className={`text-[8px] px-1 py-0.5 rounded ${
                    t.layer === 'Bronze' ? 'bg-cyan-500/20 text-cyan-300' : t.layer === 'Silver' ? 'bg-purple-500/20 text-purple-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {t.layer}
                  </span>
                </div>
                <div className="text-[9px] text-zinc-500">{t.rows} records • {t.columns.length} columns</div>
              </button>
            ))}
          </div>

          {/* Columns Details */}
          {selectedTable && (
            <div className="pt-4 border-t border-white/5 space-y-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">SCHEMA DETAIL: {selectedTable}</span>
              <div className="space-y-1 text-[10px] font-mono text-zinc-400 max-h-40 overflow-y-auto">
                {tables.find(t => t.name === selectedTable)?.columns.map((c) => (
                  <div key={c.name} className="flex justify-between py-1 border-b border-white/5 last:border-b-0">
                    <span className="text-zinc-300 font-semibold">{c.name}</span>
                    <span className="text-zinc-500">{c.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SQL Editor & Results Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Query Editor Box */}
          <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/40 glass-card space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">SQL Console</h3>
              </div>

              {/* Template Selectors */}
              <div className="flex flex-wrap gap-1.5">
                {templates.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => setSqlText(tpl.sql)}
                    className="px-2.5 py-1 rounded bg-zinc-950/80 border border-white/5 text-[9px] font-mono text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/20 transition-all cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sql Text area */}
            <div className="relative border border-white/10 rounded-lg bg-black/60 overflow-hidden">
              <div className="absolute top-2 left-2 flex items-center gap-1 font-mono text-[9px] text-zinc-600 select-none">
                <FileCode2 className="w-3.5 h-3.5" /> query_editor.sql
              </div>
              <textarea
                value={sqlText}
                onChange={(e) => setSqlText(e.target.value)}
                rows={6}
                className="w-full pl-4 pr-4 pt-8 pb-4 text-xs font-mono bg-transparent border-0 text-cyan-300 focus:outline-none focus:ring-0 leading-relaxed resize-y selection:bg-cyan-500/30"
                placeholder="SELECT * FROM table;"
              />
            </div>

            {/* Run triggers */}
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                <Info className="w-3.5 h-3.5" /> Read-only SELECT operations allowed
              </span>
              <button
                onClick={handleRunQuery}
                disabled={queryLoading}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-xs font-bold text-white hover:opacity-95 active:scale-98 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/10"
              >
                <Play className="w-3.5 h-3.5 fill-white" /> Run SQL Query
              </button>
            </div>
          </div>

          {/* SQL Query Results Container */}
          <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/40 glass-card min-h-60 flex flex-col">
            <h3 className="text-base font-bold text-white mb-4 border-b border-white/5 pb-3">Results Preview</h3>

            {queryLoading && (
              <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-2">
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-mono text-zinc-500">Executing relational compilation in Snowflake...</span>
              </div>
            )}

            {queryError && (
              <div className="flex-1 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-mono leading-relaxed flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">SQL Execution Failed:</div>
                  <pre className="mt-1 whitespace-pre-wrap">{queryError}</pre>
                </div>
              </div>
            )}

            {!queryLoading && !queryError && queryResult && (
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/5 text-zinc-500 uppercase pb-2 text-[9px] tracking-wider">
                      {queryResult.columns.map((col, idx) => (
                        <th key={idx} className="py-2 pl-3 first:pl-4 last:pr-4">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {queryResult.rows.length > 0 ? (
                      queryResult.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-white/5">
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="py-2.5 pl-3 first:pl-4 last:pr-4">
                              {cell === null ? 'NULL' : typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={queryResult.columns.length} className="py-6 text-center text-zinc-500">
                          Query returned empty dataset.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {!queryLoading && !queryError && !queryResult && (
              <div className="flex-1 flex items-center justify-center py-12 text-xs text-zinc-500 font-mono italic">
                Awaiting query compilation. Write or select a template above and run.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
