import { useState, useEffect, useCallback } from 'react';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { GeneratorPage } from './pages/GeneratorPage';
import { PipelinePage } from './pages/PipelinePage';
import { FraudPage } from './pages/FraudPage';
import { WarehousePage } from './pages/WarehousePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { PowerBiPage } from './pages/PowerBiPage';
import { AdminPage } from './pages/AdminPage';

import { 
  LayoutDashboard, Sliders, Network, ShieldCheck, 
  Database, BarChart3, Settings, LogOut, LogIn, 
  Menu, X, Bell, User, Cpu, CheckCircle2, XCircle, AlertTriangle, Info
} from 'lucide-react';

interface SnackToast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface AlertNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'landing' | 'auth' | 'dashboard' | 'generator' | 'pipeline' | 'fraud' | 'warehouse' | 'analytics' | 'powerbi' | 'admin'>('landing');
  const [user, setUser] = useState<{ username: string; role: string; token: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [showAlertMenu, setShowAlertMenu] = useState(false);
  const [snackToasts, setSnackToasts] = useState<SnackToast[]>([]);

  const showSnack = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error') => {
    const id = Math.random().toString(36).slice(2);
    setSnackToasts(prev => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => setSnackToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Simulation metrics from WebSockets
  const [simConfig, setSimConfig] = useState({
    is_running: false,
    is_paused: false,
    events_per_second: 5,
    fraud_rate: 5
  });

  const [metrics, setMetrics] = useState({
    kafka_lag: 0,
    spark_throughput: 0.0,
    spark_latency: 0.0,
    spark_status: "Offline"
  });

  const [kpis, setKpis] = useState({
    revenue: 0.0,
    orders: 0,
    fraud_alerts: 0,
    fraud_ratio: 0.0,
    conversion_rate: 3.2,
    category_sales: {},
    top_products: [],
    geo_sales: [],
    returns_count: 0
  });

  const [events, setEvents] = useState<any[]>([]);

  const [airflowDag, setAirflowDag] = useState({
    status: "Idle",
    progress: 0,
    logs: [] as any[],
    active_step: ""
  });

  // WebSocket Connection Effect
  useEffect(() => {
    let socket: WebSocket;
    let reconnectTimeout: any;

    const connectWS = () => {
      socket = new WebSocket('ws://127.0.0.1:8000/ws');

      socket.onopen = () => {
        setMetrics(prev => ({ ...prev, spark_status: "Active" }));
        addToast("Connected to StreamFlow real-time pipeline server", "success");
      };

      socket.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          
          if (data.type === 'init') {
            setSimConfig(prev => ({
              ...prev,
              is_running: data.config.is_running,
              is_paused: data.config.is_paused,
              events_per_second: data.config.events_per_second,
              fraud_rate: data.config.fraud_rate
            }));
            setMetrics(prev => ({
              ...prev,
              kafka_lag: data.config.kafka_lag,
              spark_throughput: data.config.spark_throughput,
              spark_latency: data.config.spark_latency
            }));
            setKpis(data.kpis);
            setAirflowDag(prev => ({
              ...prev,
              status: data.config.airflow_status,
              progress: data.config.airflow_progress
            }));
          } 
          
          else if (data.type === 'event') {
            // Add new event
            setEvents(prev => [data.event, ...prev.slice(0, 29)]);
            
            // Update live metrics & KPIs
            setMetrics(data.metrics);
            setKpis(data.kpis);

            // If fraud order, push a high priority alert
            if (data.event.is_fraud) {
              addToast(`Security Alert: High-risk order ${data.event.order_id} flagged! Reason: ${data.event.fraud_reasons.join(', ')}`, "error");
            }
          } 
          
          else if (data.type === 'config_update') {
            setSimConfig(prev => ({
              ...prev,
              is_running: data.config.is_running,
              is_paused: data.config.is_paused,
              events_per_second: data.config.events_per_second,
              fraud_rate: data.config.fraud_rate
            }));
          }
          
          else if (data.type === 'airflow') {
            setAirflowDag(data.dag);
            if (data.dag.status === 'Success') {
              addToast("Airflow DAG Run Completed: snowflake load and dbt compilation succeeded.", "success");
            }
          }
        } catch (e) {
          console.error("Failed to parse websocket frame", e);
        }
      };

      socket.onclose = () => {
        setMetrics(prev => ({ ...prev, spark_status: "Offline", spark_throughput: 0.0 }));
        reconnectTimeout = setTimeout(connectWS, 3000);
      };

      socket.onerror = (err) => {
        console.error("Websocket error:", err);
      };
    };

    connectWS();

    return () => {
      if (socket) socket.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const addToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error') => {
    const newAlert: AlertNotification = {
      id: Math.random().toString(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setAlerts(prev => [newAlert, ...prev.slice(0, 9)]);
    // Also show a visible floating snack
    showSnack(message, type);
  }, [showSnack]);

  const handleConfigChange = async (eps: number, rate: number): Promise<boolean> => {
    if (!user) {
      addToast("Authentication required to configure simulator.", "warning");
      return false;
    }
    try {
      const res = await fetch('http://127.0.0.1:8000/api/simulation/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ events_per_second: eps, fraud_rate: rate })
      });
      if (res.ok) {
        setSimConfig(prev => ({ ...prev, events_per_second: eps, fraud_rate: rate }));
        addToast(`Configuration applied: ${eps} eps, ${rate}% fraud rate`, "success");
        return true;
      } else {
        const d = await res.json();
        addToast(d.detail || "Failed to update configs", "error");
        return false;
      }
    } catch (e) {
      addToast("Failed to connect to backend", "error");
      return false;
    }
  };

  const handleControlAction = async (action: 'start' | 'stop' | 'pause' | 'resume') => {
    if (!user) {
      addToast("Authentication required to control streaming engines.", "warning");
      return;
    }
    try {
      const endpoint = `http://127.0.0.1:8000/api/simulation/${action}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        if (action === 'start' || action === 'resume') {
          setSimConfig(prev => ({ ...prev, is_running: true, is_paused: false }));
          addToast("Streaming engines triggered", "success");
        } else if (action === 'pause') {
          setSimConfig(prev => ({ ...prev, is_paused: true }));
          addToast("Streaming engines paused", "warning");
        } else if (action === 'stop') {
          setSimConfig(prev => ({ ...prev, is_running: false, is_paused: false }));
          addToast("Streaming engines shutdown complete", "info");
        }
      } else {
        const d = await res.json();
        addToast(d.detail || "Failed to trigger control state", "error");
      }
    } catch (e) {
      addToast("Server connection error", "error");
    }
  };

  const handleTriggerAirflow = async () => {
    if (!user) {
      addToast("Authentication required to trigger Airflow.", "warning");
      return;
    }
    try {
      const res = await fetch('http://127.0.0.1:8000/api/airflow/trigger', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        addToast("Airflow DAG Run 'streamflow_data_lakehouse' triggered successfully", "info");
      } else {
        const d = await res.json();
        addToast(d.detail || "Failed to trigger DAG", "error");
      }
    } catch (e) {
      addToast("Server connection error", "error");
    }
  };

  const handleLoginSuccess = (usrData: { username: string; role: string; token: string }) => {
    setUser(usrData);
    setActiveTab('dashboard');
    addToast(`Successfully authenticated as ${usrData.role}`, "success");
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('landing');
    addToast("Logged out of the secure workspace", "info");
  };

  // If on Landing Page
  if (activeTab === 'landing') {
    return (
      <LandingPage 
        onLaunch={() => user ? setActiveTab('dashboard') : setActiveTab('auth')} 
        onViewArchitecture={() => {
          if (!user) {
            addToast("Please login first to view architecture details.", "info");
            setActiveTab('auth');
          } else {
            setActiveTab('pipeline');
          }
        }} 
      />
    );
  }

  // If on Auth Page
  if (activeTab === 'auth') {
    return (
      <AuthPage 
        onBack={() => setActiveTab('landing')} 
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'generator', label: 'Event Simulator', icon: <Sliders className="w-4 h-4" /> },
    { id: 'pipeline', label: 'Pipeline Nodes', icon: <Network className="w-4 h-4" /> },
    { id: 'fraud', label: 'Fraud Detection', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'warehouse', label: 'Warehouse SQL', icon: <Database className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics DWH', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'powerbi', label: 'BI Report', icon: <BarChart3 className="w-4 h-4 text-yellow-400" /> },
    { id: 'admin', label: 'Admin Settings', icon: <Settings className="w-4 h-4" /> }
  ];

  return (
    <>
      <div className="min-h-screen bg-brand-dark flex text-zinc-100 relative">
      
      {/* Sidebar Navigation */}
      <aside 
        className={`bg-[#0b0b0d] border-r border-white/5 flex flex-col justify-between shrink-0 transition-all duration-300 z-20 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="space-y-6 pt-6">
          {/* Brand Logo */}
          <div className="px-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-white" />
              </div>
              {sidebarOpen && (
                <span className="font-extrabold text-white text-base tracking-tight">StreamFlow</span>
              )}
            </div>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-zinc-500 hover:text-white p-1 hover:bg-white/5 rounded cursor-pointer"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

          {/* Links */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer ${
                  activeTab === item.id 
                    ? 'bg-cyan-500/10 border-l-2 border-cyan-400 text-cyan-400 font-bold' 
                    : 'hover:bg-white/5 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {item.icon}
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-cyan-500/25 flex items-center justify-center font-bold text-[10px] text-cyan-400 shrink-0">
                {user ? user.username[0].toUpperCase() : 'A'}
              </div>
              {sidebarOpen && (
                <div className="text-[10px] leading-tight overflow-hidden">
                  <div className="font-bold text-white truncate">{user ? user.username : 'Guest'}</div>
                  <div className="text-zinc-500 font-mono truncate">{user ? user.role : 'Guest Role'}</div>
                </div>
              )}
            </div>
            
            {user ? (
              <button 
                onClick={handleLogout}
                className="text-zinc-500 hover:text-rose-400 p-1.5 hover:bg-white/5 rounded cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={() => setActiveTab('auth')}
                className="text-zinc-500 hover:text-cyan-400 p-1.5 hover:bg-white/5 rounded cursor-pointer"
                title="Log in"
              >
                <LogIn className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Panel Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-screen">
        {/* Header toolbar */}
        <header className="bg-[#0b0b0d]/70 backdrop-blur border-b border-white/5 py-4 px-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-500">ENVIRONMENT: PRODUCTION</span>
            <span className="h-4 w-[1px] bg-white/10"></span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${metrics.spark_status === 'Active' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Server: {metrics.spark_status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification triggers */}
            <div className="relative">
              <button 
                onClick={() => setShowAlertMenu(!showAlertMenu)}
                className="text-zinc-400 hover:text-white p-2 rounded-full bg-white/5 border border-white/5 relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                )}
              </button>

              {/* Alert list overlays */}
              {showAlertMenu && (
                <div className="absolute right-0 mt-3 w-80 p-4 rounded-xl border border-white/10 bg-zinc-950/95 glass-card shadow-2xl space-y-3 z-30">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-xs font-bold text-white font-mono">Shield Security Logs</span>
                    <button 
                      onClick={() => setAlerts([])}
                      className="text-[9px] font-mono text-rose-400 hover:text-rose-300"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 font-mono text-[9px] leading-normal text-zinc-400 custom-scrollbar">
                    {alerts.length > 0 ? (
                      alerts.map((a) => (
                        <div key={a.id} className="p-2 border-b border-white/5 last:border-b-0 space-y-1">
                          <div className="flex justify-between font-bold">
                            <span className={a.type === 'error' ? 'text-rose-400' : a.type === 'success' ? 'text-emerald-400' : 'text-cyan-400'}>
                              {a.type.toUpperCase()}
                            </span>
                            <span className="text-zinc-600">{a.timestamp}</span>
                          </div>
                          <p className="text-zinc-300 leading-normal">{a.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center text-zinc-600 italic">No alerts logged in the current session.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center">
                <User className="w-4.5 h-4.5 text-zinc-400" />
              </div>
              <span className="text-xs font-semibold text-zinc-200">
                {user ? user.username : 'Anonymous'}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Work canvas */}
        <main className="flex-1 p-6 overflow-y-auto cyber-grid relative">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'dashboard' && (
              <DashboardPage metrics={metrics} kpis={kpis} events={events} />
            )}
            {activeTab === 'generator' && (
              <GeneratorPage 
                config={simConfig} 
                onConfigChange={handleConfigChange} 
                onControlAction={handleControlAction} 
                events={events}
                token={user?.token || ''}
              />
            )}
            {activeTab === 'pipeline' && (
              <PipelinePage metrics={metrics} />
            )}
            {activeTab === 'fraud' && (
              <FraudPage events={events} kpis={kpis} />
            )}
            {activeTab === 'warehouse' && (
              <WarehousePage token={user?.token || ''} />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsPage kpis={kpis} />
            )}
            {activeTab === 'powerbi' && (
              <PowerBiPage kpis={kpis} onTriggerAirflow={handleTriggerAirflow} airflowDagStatus={airflowDag.status} />
            )}
            {activeTab === 'admin' && (
              <AdminPage 
                token={user?.token || ''} 
                airflowDag={airflowDag} 
                onTriggerAirflow={handleTriggerAirflow} 
              />
            )}
          </div>
        </main>
      </div>

    </div>

    {/* ── Floating Snackbar Toast Stack ── */}
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {snackToasts.map((t) => {
        const styles = {
          success: { bar: 'bg-emerald-500', icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />, text: 'text-emerald-300' },
          error:   { bar: 'bg-rose-500',    icon: <XCircle      className="w-4 h-4 text-rose-400 shrink-0"    />, text: 'text-rose-300'    },
          warning: { bar: 'bg-yellow-500',  icon: <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />, text: 'text-yellow-300'  },
          info:    { bar: 'bg-cyan-500',    icon: <Info          className="w-4 h-4 text-cyan-400 shrink-0"   />, text: 'text-cyan-300'    },
        }[t.type];
        return (
          <div
            key={t.id}
            className="animate-slide-in-right pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur shadow-2xl shadow-black/40 w-80"
          >
            <div className={`w-1 self-stretch rounded-full ${styles.bar} shrink-0`} />
            {styles.icon}
            <p className={`text-xs font-mono leading-snug ${styles.text}`}>{t.message}</p>
          </div>
        );
      })}
    </div>
    </>
  );
}

export default App;
