import React, { useState } from 'react';
import { Cpu, Layers, Database, BarChart3, Workflow, AlertCircle, RefreshCw } from 'lucide-react';

interface PipelinePageProps {
  metrics: {
    kafka_lag: number;
    spark_throughput: number;
    spark_latency: number;
    spark_status: string;
  };
}

export const PipelinePage: React.FC<PipelinePageProps> = ({ metrics }) => {
  const [selectedNode, setSelectedNode] = useState<string | null>("spark");

  const nodes = [
    {
      id: "kafka",
      label: "1. Apache Kafka",
      subtitle: "Topic: orders",
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
      color: "border-cyan-500/30 text-cyan-400 shadow-cyan-500/5",
      metrics: [
        { label: "Offset Lag", value: `${metrics.kafka_lag} partitions` },
        { label: "Partitions", value: "3 Active" },
        { label: "Broker State", value: "Healthy" }
      ],
      details: "Distributed log queue. Acts as the durable entry buffer for all simulated e-commerce streams. Orders are ingested from REST requests and partition-balanced immediately."
    },
    {
      id: "spark",
      label: "2. Apache Spark",
      subtitle: "Structured Streaming",
      icon: <Layers className="w-5 h-5 text-purple-400" />,
      color: "border-purple-500/30 text-purple-400 shadow-purple-500/5",
      metrics: [
        { label: "Throughput", value: `${metrics.spark_throughput} eps` },
        { label: "Avg Latency", value: `${metrics.spark_latency} ms` },
        { label: "Context State", value: metrics.spark_status }
      ],
      details: "Calculates micro-batch transformations. Responsible for cleaning values, validating types, currency conversion to standard USD, and scoring fraud indices before appending layers."
    },
    {
      id: "s3",
      label: "3. AWS S3 Bucket",
      subtitle: "Bronze / Silver Layers",
      icon: <Database className="w-5 h-5 text-emerald-400" />,
      color: "border-emerald-500/30 text-emerald-400 shadow-emerald-500/5",
      metrics: [
        { label: "Format", value: "Parquet (Snappy)" },
        { label: "Compression", value: "2.4x Ratio" },
        { label: "Daily Volume", value: "4.8 GB" }
      ],
      details: "Raw transactional data lake storage. Organizes files under partitioned keys `/year=2026/month=07/`. Silver storage runs automated schema enforcement constraints."
    },
    {
      id: "snowflake",
      label: "4. Snowflake DWH",
      subtitle: "Gold Warehouse Tables",
      icon: <Database className="w-5 h-5 text-blue-400" />,
      color: "border-blue-500/30 text-blue-400 shadow-blue-500/5",
      metrics: [
        { label: "Star Schema Schema", value: "9 tables" },
        { label: "Warehouse Size", value: "X-Small (Auto)" },
        { label: "Query Cache", value: "98% hit" }
      ],
      details: "Enterprise cloud data warehouse. Houses Fact_Orders, Fact_Payments, and all dimensions (Customer, Product, Date). Supports DirectQuery structures for immediate dashboards."
    },
    {
      id: "dbt",
      label: "5. dbt Compilation",
      subtitle: "Star-Schema Modeling",
      icon: <Workflow className="w-5 h-5 text-orange-400" />,
      color: "border-orange-500/30 text-orange-400 shadow-orange-500/5",
      metrics: [
        { label: "Compile State", value: "Success" },
        { label: "Models built", value: "12 tables" },
        { label: "Last Run Duration", value: "45.2s" }
      ],
      details: "Executes SQL compilations. Builds aggregated analytical facts, runs strict primary key checks, schema constraints, and formats data into optimized dimensional entities."
    },
    {
      id: "powerbi",
      label: "6. Power BI Embedded",
      subtitle: "KPI Report Canvas",
      icon: <BarChart3 className="w-5 h-5 text-yellow-400" />,
      color: "border-yellow-500/30 text-yellow-400 shadow-yellow-500/5",
      metrics: [
        { label: "Refresh Type", value: "DirectQuery" },
        { label: "Tiles count", value: "14 charts" },
        { label: "Latency SLA", value: "Real-time" }
      ],
      details: "Direct reporting layout. Simulates direct connection queries to the Snowflake Gold star schema, providing interactive visualizations of conversions, cohorts, and operations."
    }
  ];

  const failedJobs = [
    { id: "J01", time: "11:05:22", node: "Spark Streaming", err: "Failed Schema Validation on type decimal", retries: "3/3 (Resolved)" },
    { id: "J02", time: "10:45:10", node: "dbt compilation", err: "Unique key constraint violated on Dim_Customer", retries: "2/3 (Resolved)" },
    { id: "J03", time: "09:12:05", node: "Snowflake DWH", err: "Warehouse suspended, auto-resume timed out", retries: "1/3 (Resolved)" }
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Pipeline Infrastructure</h1>
        <p className="text-zinc-400 text-sm">Visualize cluster nodes, processing pipelines, and retry queues.</p>
      </div>

      {/* Graphical Pipeline Map */}
      <div className="p-8 rounded-xl border border-white/5 bg-zinc-900/40 glass-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-yellow-500/5 pointer-events-none"></div>
        <div className="text-xs font-mono text-zinc-500 mb-8 flex justify-between items-center">
          <span>STREAMFLOW PIPELINE DIAGRAM (CLICK NODES TO VIEW SPECIFICS)</span>
          <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" /> Live update loop</span>
        </div>

        {/* Network Layout */}
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6 py-12 z-10">
          {/* Animated Connecting SVG Path (Horizontal) */}
          <div className="hidden md:block absolute top-[48px] left-[6%] right-[6%] h-[3px] pointer-events-none z-0">
            <svg className="w-full h-full" fill="none">
              <line x1="0" y1="0" x2="100%" y2="0" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              <line x1="0" y1="0" x2="100%" y2="0" stroke="#00d2ff" strokeWidth="3" strokeDasharray="15 35" className="animate-pulse" style={{ animationDuration: '2s' }} />
            </svg>
          </div>

          {nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => setSelectedNode(node.id)}
              className={`w-full md:w-36 p-4 rounded-xl border bg-zinc-950/80 text-left transition-all z-10 cursor-pointer ${node.color} ${
                selectedNode === node.id 
                  ? 'ring-2 ring-cyan-400/50 scale-[1.03] bg-zinc-900/90' 
                  : 'hover:scale-[1.01] hover:bg-zinc-900/40'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-3">
                {node.icon}
              </div>
              <div className="text-xs font-bold truncate text-white">{node.label}</div>
              <div className="text-[9px] text-zinc-500 font-mono truncate mt-0.5">{node.subtitle}</div>
              
              {/* Pulsing indicator */}
              <div className="flex items-center gap-1 mt-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[8px] font-mono text-zinc-400">ONLINE</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Details Panel & Log Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selected Node Specs */}
        {selectedNode && (
          <div className="lg:col-span-2 p-6 rounded-xl border border-white/5 bg-zinc-900/40 glass-card flex flex-col justify-between">
            {(() => {
              const nd = nodes.find(n => n.id === selectedNode);
              if (!nd) return null;
              return (
                <>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-white">{nd.label}</h3>
                        <p className="text-xs text-zinc-500 font-mono">{nd.subtitle}</p>
                      </div>
                      <div className="px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono text-cyan-400 font-bold uppercase">
                        Active Node
                      </div>
                    </div>
                    
                    <p className="text-sm text-zinc-400 leading-relaxed font-light">
                      {nd.details}
                    </p>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                      {nd.metrics.map((m, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-black/40 border border-white/5 text-center">
                          <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">{m.label}</div>
                          <div className="text-sm font-bold text-white font-mono">{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-4 italic">
                    * Metrics are queried from system diagnostic APIs in real time.
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Retry Queue / Failed logs */}
        <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/40 glass-card">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">Retry Logs Queue</h3>
          </div>

          <div className="space-y-3 font-mono text-[10px]">
            {failedJobs.map((f) => (
              <div key={f.id} className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1 text-zinc-400">
                <div className="flex justify-between font-bold text-white">
                  <span>Job: {f.id} ({f.node})</span>
                  <span className="text-rose-400">{f.time}</span>
                </div>
                <div className="text-zinc-500 leading-normal">
                  Error: <span className="text-rose-300/80">{f.err}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-white/5 mt-1">
                  <span>Retries: {f.retries}</span>
                  <span className="text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-1 rounded">RECOVERED</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
