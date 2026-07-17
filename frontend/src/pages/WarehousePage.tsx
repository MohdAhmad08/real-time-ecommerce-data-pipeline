import React, { useState, useEffect } from 'react';
import { Database, Play, Code, AlertTriangle, FileCode2, Info } from 'lucide-react';

interface TableMetadata {
  name: string;
  layer: 'Bronze' | 'Silver' | 'Gold';
  columns: Array<{ name: string; type: string }>;
  rows: number;
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

  // Fetch schema tables
  useEffect(() => {
    fetchSchema();
  }, []);

  const fetchSchema = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/warehouse/tables');
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
      const res = await fetch('http://127.0.0.1:8000/api/warehouse/query', {
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

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Warehouse Explorer</h1>
        <p className="text-zinc-400 text-sm">Explore relational schemas and execute SQL queries against Bronze, Silver, and Gold layers.</p>
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
