import React from 'react';
import { Play, Layers, ShieldCheck, Database, BarChart3, Cpu, Workflow } from 'lucide-react';

interface LandingPageProps {
  onLaunch: () => void;
  onViewArchitecture: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunch, onViewArchitecture }) => {
  const features = [
    {
      icon: <Cpu className="w-8 h-8 text-cyan-400" />,
      title: "Real-Time Ingestion",
      tech: "Apache Kafka",
      desc: "High-throughput, distributed event streams feeding e-commerce order events into bronze tables at millisecond latency."
    },
    {
      icon: <Layers className="w-8 h-8 text-purple-400" />,
      title: "Stream Processing",
      tech: "Apache Spark",
      desc: "Structured streaming transformations applying schema validation, currency standardization, and deduplication."
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-rose-400" />,
      title: "AI Fraud Detection",
      tech: "Spark ML / Heuristics",
      desc: "Live fraud detection rule-engine analyzing order metrics, geographical travel speeds, and card statuses in real-time."
    },
    {
      icon: <Database className="w-8 h-8 text-emerald-400" />,
      title: "Star Schema DWH",
      tech: "Snowflake & dbt",
      desc: "Dimensional modeling transforming Silver layers into Gold fact and dimension tables ready for optimized BI queries."
    },
    {
      icon: <Workflow className="w-8 h-8 text-yellow-400" />,
      title: "DAG Orchestration",
      tech: "Apache Airflow",
      desc: "Automated workflow schedules coordinating loading procedures, data quality checks, and schema backups."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-blue-400" />,
      title: "BI Analytics",
      tech: "Power BI Embedded",
      desc: "DirectQuery report canvas displaying conversion rates, customer retention matrices, and executive cohort analyses."
    }
  ];

  const stats = [
    { val: "500k+", label: "Events/Sec Ingested" },
    { val: "< 50ms", label: "Spark Processing Latency" },
    { val: "99.99%", label: "Pipeline Uptime" },
    { val: "0.0%", label: "Data Loss SLA" }
  ];

  const timelineSteps = [
    {
      stage: "Bronze Layer",
      desc: "Kafka captures raw transactional JSON events. Appended instantly to raw tables with zero transformations to maintain data lineage."
    },
    {
      stage: "Silver Layer",
      desc: "Spark cleanses records, runs schema validations, checks transaction speeds, and standardizes currency to USD values."
    },
    {
      stage: "Gold Layer",
      desc: "dbt materializes data into analytical Fact and Dimension tables in Snowflake using a Star Schema layout."
    },
    {
      stage: "BI & Analytics",
      desc: "DirectQuery models load aggregated matrices directly into Power BI, ensuring executives see live analytics."
    }
  ];

  return (
    <div className="min-h-screen bg-brand-dark cyber-grid relative text-zinc-100 selection:bg-cyan-500/30">
      <div className="absolute inset-0 radial-glow pointer-events-none"></div>
      <div className="absolute inset-0 blue-glow pointer-events-none"></div>

      {/* Navigation */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-10 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Database className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            StreamFlow
          </span>
          <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded border border-cyan-500/30 text-cyan-400 bg-cyan-500/5">
            Enterprise
          </span>
        </div>
        <button
          onClick={onLaunch}
          className="relative group px-5 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/30 text-sm font-medium transition-all duration-300"
        >
          <span className="absolute inset-0 rounded-lg bg-cyan-500/10 opacity-0 group-hover:opacity-100 blur transition-opacity"></span>
          <span className="relative text-white group-hover:text-cyan-400">Launch Platform</span>
        </button>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-cyan-400 mb-8 float-animation">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          Active Production Stream: Kafka → Spark → Snowflake
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl mx-auto leading-tight bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
          Real-Time E-Commerce Data Lakehouse Platform
        </h1>
        
        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light">
          Ingest, cleanse, enrich, and analyze thousands of order transactions per second. Seamlessly bridging streaming event loops with enterprise warehouse star schemas.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
          <button
            onClick={onLaunch}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-sm font-semibold text-white hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white group-hover:scale-110 transition-transform" />
            Launch Console
          </button>
          <button
            onClick={onViewArchitecture}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold text-white transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            View Architecture
          </button>
        </div>

        {/* Live Flow Visualization Mock */}
        <div className="max-w-5xl mx-auto rounded-2xl border border-white/5 bg-zinc-950/40 p-8 glass-card relative overflow-hidden mb-28">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none"></div>
          <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-mono text-zinc-400">PIPELINE TOPOLOGY FLOW</span>
            </div>
            <div className="text-xs font-mono text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/20">
              Active: 120 ms latency
            </div>
          </div>
          
          {/* Flow Nodes */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative items-center justify-center py-6">
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 relative z-10 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center mb-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-xs font-bold font-mono">1. KAFKA</div>
              <div className="text-[10px] text-zinc-500 font-mono">producer / orders</div>
            </div>

            <div className="text-cyan-500 text-xl font-bold flex justify-center rotate-90 md:rotate-0">
              ➔
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/5 relative z-10 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mb-2">
                <Layers className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-xs font-bold font-mono">2. SPARK</div>
              <div className="text-[10px] text-zinc-500 font-mono">structured stream</div>
            </div>

            <div className="text-purple-500 text-xl font-bold flex justify-center rotate-90 md:rotate-0">
              ➔
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/5 relative z-10 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                <Database className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-xs font-bold font-mono">3. SNOWFLAKE</div>
              <div className="text-[10px] text-zinc-500 font-mono">gold / star schema</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-28">
          {stats.map((st, i) => (
            <div key={i} className="p-6 rounded-xl border border-white/5 bg-zinc-950/20 glass-card">
              <div className="text-3xl md:text-4xl font-extrabold text-cyan-400 mb-2">{st.val}</div>
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-widest">{st.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-white/5 relative z-10">
        <h2 className="text-3xl font-extrabold text-center mb-16 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          Enterprise Stack Components
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((ft, i) => (
            <div key={i} className="p-6 rounded-2xl border border-white/5 bg-brand-card glass-card relative group flex flex-col justify-between">
              <div>
                <div className="mb-6">{ft.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{ft.title}</h3>
                <span className="inline-block text-[10px] font-mono text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10 mb-4">
                  {ft.tech}
                </span>
                <p className="text-sm text-zinc-400 leading-relaxed font-light">{ft.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Timeline */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 relative z-10">
        <h2 className="text-3xl font-extrabold text-center mb-20 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          Data Lifecycle & Lineage
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-emerald-500/40 z-0"></div>
          {timelineSteps.map((step, idx) => (
            <div key={idx} className="relative z-10 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full border border-white/10 bg-brand-card flex items-center justify-center font-bold text-cyan-400 shadow-md shadow-black/60 mb-6">
                0{idx + 1}
              </div>
              <h3 className="text-lg font-bold text-white mb-3">{step.stage}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-light px-4">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 relative z-10 bg-black/40 text-center">
        <p className="text-xs text-zinc-600 font-mono">
          StreamFlow Platform • Built with React, FastAPI, Kafka & Spark • 2026 E-Commerce Data Engineering Demonstration
        </p>
      </footer>
    </div>
  );
};
