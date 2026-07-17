import React, { useState, useEffect } from 'react';
import { Play, Shield, RefreshCw, Server, Terminal } from 'lucide-react';
import { API_BASE } from '../config';

interface AdminPageProps {
  token: string;
  airflowDag: {
    status: string;
    progress: number;
    logs: Array<{ timestamp: string; step: string; message: string; status: string }>;
    active_step: string;
  };
  onTriggerAirflow: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ token: _token, airflowDag, onTriggerAirflow }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [dqRules, setDqRules] = useState([
    { id: "DQ01", name: "Negative Amount Filter", rule: "amount >= 0", desc: "Blocks payment failures and transaction anomalies", active: true },
    { id: "DQ02", name: "Null Customer Ingestion", rule: "customer_id IS NOT NULL", desc: "Ensures relational joins to Dim_Customer don't fail", active: true },
    { id: "DQ03", name: "Duplicate Transaction Check", rule: "unique_key (order_id)", desc: "Deduplicates Kafka retry failures inside Spark", active: true },
    { id: "DQ04", name: "Timestamp Range Verification", rule: "transaction_date < CURRENT_TIMESTAMP", desc: "Intercepts clock drift discrepancies", active: true },
    { id: "DQ05", name: "Currency Format Audit", rule: "currency IN ('USD', 'EUR', 'JPY')", desc: "Standardizes conversions in Silver stream", active: true }
  ]);

  useEffect(() => {
    fetchSystemLogs();
  }, [airflowDag]);

  const fetchSystemLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/metrics/history`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Failed to fetch administrative logs", e);
    }
  };

  const handleToggleRule = (id: string) => {
    setDqRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Administration Panel</h1>
        <p className="text-zinc-400 text-sm">Control pipelines orchestration, config data quality audits, and review audit traces.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Airflow Orchestration */}
        <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/40 glass-card space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-yellow-400" />
              <h3 className="text-base font-bold text-white">Apache Airflow</h3>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
              airflowDag.status === 'Running' 
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              {airflowDag.status}
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed font-light">
            Orchestrates weekly batch builds. Running this schedules Spark extracts, runs Snowflake COPY loads, and materializes DBT views.
          </p>

          <div className="space-y-4 pt-2">
            {/* Progress bar */}
            {airflowDag.status === 'Running' && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>Executing step: {airflowDag.active_step}</span>
                  <span>{airflowDag.progress}%</span>
                </div>
                <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-300" style={{ width: `${airflowDag.progress}%` }}></div>
                </div>
              </div>
            )}

            <button
              onClick={onTriggerAirflow}
              disabled={airflowDag.status === 'Running'}
              className="w-full py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 text-xs font-bold text-yellow-400 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <Play className="w-4 h-4 fill-yellow-400" /> Trigger Airflow DAG
            </button>
          </div>

          {/* DAG steps mini log */}
          {airflowDag.logs.length > 0 && (
            <div className="pt-4 border-t border-white/5 space-y-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Airflow Execution Trace</span>
              <div className="max-h-40 overflow-y-auto bg-black/40 border border-white/5 rounded p-2.5 space-y-2 custom-scrollbar text-[9px] font-mono text-zinc-400">
                {airflowDag.logs.map((l, i) => (
                  <div key={i} className="flex justify-between items-start gap-2">
                    <span className="text-zinc-600">{l.timestamp.slice(11, 19)}</span>
                    <span className="flex-1 text-zinc-300">{l.message}</span>
                    <span className="text-emerald-400">[{l.status}]</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Data Quality Audits */}
        <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/40 glass-card space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Data Quality Assurance Rules (dbt Assertions)</h3>
          </div>

          <div className="space-y-3">
            {dqRules.map((rule) => (
              <div key={rule.id} className="p-3 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{rule.name}</span>
                    <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/5 px-1.5 py-0.5 rounded border border-cyan-500/10">{rule.rule}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-light">{rule.desc}</p>
                </div>
                
                <button
                  onClick={() => handleToggleRule(rule.id)}
                  className={`px-3 py-1 rounded text-[10px] font-bold font-mono border transition-all cursor-pointer ${
                    rule.active
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-zinc-900/40 border-white/5 text-zinc-600'
                  }`}
                >
                  {rule.active ? "ENABLED" : "MUTED"}
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* System Audit logs */}
      <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/40 glass-card">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Platform System Logs</h3>
          </div>
          <button 
            onClick={fetchSystemLogs}
            className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono hover:text-white transition-colors cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5" /> Refresh logs
          </button>
        </div>

        <div className="bg-black/60 border border-white/5 rounded-lg p-4 font-mono text-[10px] text-zinc-400 space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-4 items-start">
              <span className="text-zinc-600 shrink-0">{log.timestamp ? log.timestamp.slice(0, 19).replace('T', ' ') : ''}</span>
              <span className={`font-bold shrink-0 ${
                log.log_level === 'ERROR' ? 'text-rose-400' : log.log_level === 'WARNING' ? 'text-yellow-400' : 'text-cyan-400'
              }`}>
                [{log.log_level}]
              </span>
              <span className="text-zinc-500 shrink-0">[{log.component}]</span>
              <span className="text-zinc-300">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
