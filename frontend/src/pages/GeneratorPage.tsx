import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, Sliders, Terminal, ShieldAlert, Zap, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface GeneratorPageProps {
  config: {
    is_running: boolean;
    is_paused: boolean;
    events_per_second: number;
    fraud_rate: number;
  };
  onConfigChange: (eps: number, rate: number) => Promise<boolean>;
  onControlAction: (action: 'start' | 'stop' | 'pause' | 'resume') => void;
  events: any[];
  token: string;
}

export const GeneratorPage: React.FC<GeneratorPageProps> = ({ config, onConfigChange, onControlAction, events, token: _token }) => {
  const [eps, setEps] = useState(config.events_per_second);
  const [fraudRate, setFraudRate] = useState(config.fraud_rate);
  const [configStatus, setConfigStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEps(config.events_per_second);
    setFraudRate(config.fraud_rate);
  }, [config]);

  // Scroll terminal to bottom as logs arrive
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const handleApplySliders = async () => {
    setConfigStatus('loading');
    try {
      const ok = await onConfigChange(eps, fraudRate);
      setConfigStatus(ok ? 'success' : 'error');
    } catch {
      setConfigStatus('error');
    }
    setTimeout(() => setConfigStatus('idle'), 2500);
  };

  const handleQuickTrigger = async (type: 'attack' | 'blocked') => {
    // Injects a mock event by calling backend overrides or setting config maxes
    if (type === 'attack') {
      onConfigChange(40, 90);
      setEps(40);
      setFraudRate(90);
    } else {
      onConfigChange(10, 100);
      setEps(10);
      setFraudRate(100);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Event Simulator</h1>
        <p className="text-zinc-400 text-sm">Simulate stream velocities and trigger data flow transformations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sliders and Controls */}
        <div className="p-6 rounded-xl border border-white/5 bg-zinc-900/40 glass-card space-y-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Simulator Knobs</h3>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-500">Pipeline State</label>
            <div className="grid grid-cols-2 gap-2">
              {!config.is_running || config.is_paused ? (
                <button
                  onClick={() => onControlAction(config.is_paused ? 'resume' : 'start')}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-emerald-400 text-emerald-400" /> Start Engine
                </button>
              ) : (
                <button
                  onClick={() => onControlAction('pause')}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Pause className="w-4 h-4 fill-yellow-400 text-yellow-400" /> Pause Engine
                </button>
              )}

              <button
                onClick={() => onControlAction('stop')}
                disabled={!config.is_running}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                <Square className="w-4 h-4 fill-rose-400 text-rose-400" /> Stop Engine
              </button>
            </div>
          </div>

          {/* Slider 1: Events rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-400">ORDER EVENT RATE</span>
              <span className="text-cyan-400 font-bold">{eps} events/sec</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={eps}
              onChange={(e) => setEps(parseInt(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>

          {/* Slider 2: Fraud Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-zinc-400">INJECTED FRAUD RATE</span>
              <span className="text-rose-400 font-bold">{fraudRate}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={fraudRate}
              onChange={(e) => setFraudRate(parseInt(e.target.value))}
              className="w-full accent-rose-500"
            />
          </div>

          <button
            onClick={handleApplySliders}
            disabled={configStatus === 'loading'}
            className={`w-full py-3 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 ${
              configStatus === 'success'
                ? 'bg-emerald-600 shadow-emerald-500/20'
                : configStatus === 'error'
                ? 'bg-rose-700 shadow-rose-500/20'
                : 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-95 active:scale-98 shadow-cyan-500/10'
            } disabled:opacity-70 disabled:cursor-not-allowed`}
          >
            {configStatus === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
            {configStatus === 'success' && <CheckCircle2 className="w-4 h-4" />}
            {configStatus === 'error'   && <XCircle className="w-4 h-4" />}
            {configStatus === 'idle'    ? 'Apply Configurations'
             : configStatus === 'loading' ? 'Applying…'
             : configStatus === 'success' ? 'Configuration Applied!'
             : 'Failed — Check Login'}
          </button>

          {/* Custom Attack Scenarios */}
          <div className="pt-4 border-t border-white/5 space-y-3">
            <label className="text-xs font-mono uppercase tracking-wider text-zinc-500 block">Simulation Scenarios</label>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleQuickTrigger('attack')}
                className="flex items-center gap-2 p-3 text-left rounded-lg bg-zinc-950/40 border border-white/5 hover:border-rose-500/30 group transition-all text-xs cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-bold text-zinc-300">Trigger Bulk Credential/Card Attack</div>
                  <div className="text-[10px] text-zinc-500 font-mono">Simulates high frequency fraud (40 eps, 90% fraud rate)</div>
                </div>
              </button>

              <button
                onClick={() => handleQuickTrigger('blocked')}
                className="flex items-center gap-2 p-3 text-left rounded-lg bg-zinc-950/40 border border-white/5 hover:border-yellow-500/30 group transition-all text-xs cursor-pointer"
              >
                <Zap className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="font-bold text-zinc-300">Force Blocked Card Pipeline</div>
                  <div className="text-[10px] text-zinc-500 font-mono">Forces cards to state Blocked for Quality Rule checks</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Live Code Console */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-white/5 bg-zinc-950 glass-card flex flex-col justify-between h-[520px]">
          <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white font-mono">Raw Event Producer Log</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="text-[10px] font-mono text-zinc-400">TOPIC: orders • KAFKA_PRODUCER</span>
            </div>
          </div>

          {/* Terminal Screen */}
          <div className="flex-1 bg-black/60 border border-white/5 rounded-lg p-4 overflow-y-auto font-mono text-xs text-zinc-300 space-y-3 console-scrollbar relative">
            <div className="text-zinc-500 text-[10px] border-b border-white/5 pb-1 mb-2">
              [SYSTEM] Kafka Producer connected to cluster. Topic partitions: [orders-0, orders-1, orders-2]
            </div>

            {events.length > 0 ? (
              events.map((ev, i) => (
                <div key={i} className="pb-3 border-b border-white/5 last:border-b-0">
                  <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                    <span>PARTITION: {i % 3} • OFFSET: {10243 + i}</span>
                    <span>{ev.transaction_date ? ev.transaction_date.slice(11, 23) : ''}</span>
                  </div>
                  <pre className="overflow-x-auto text-[11px] text-cyan-300 leading-normal selection:bg-cyan-500/40">
                    {JSON.stringify(ev, null, 2)}
                  </pre>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500 text-xs italic">
                Awaiting event stream. Set state to "Start Engine" above.
              </div>
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};
