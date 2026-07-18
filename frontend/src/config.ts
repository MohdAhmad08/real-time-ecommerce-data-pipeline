// Central API configuration
// In production, if VITE_API_URL env var is not set in Vercel dashboard,
// it will automatically use the deployment's origin (window.location.origin).
const raw = import.meta.env.VITE_API_URL as string | undefined;

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE = raw 
  ? raw.replace(/\/$/, '') 
  : (isLocalhost ? 'http://127.0.0.1:8000' : (typeof window !== 'undefined' ? window.location.origin : ''));

// WebSocket URL (http→ws, https→wss)
export const WS_BASE = API_BASE ? API_BASE.replace(/^http/, 'ws') : '';

