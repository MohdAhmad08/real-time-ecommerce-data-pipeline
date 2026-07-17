// Central API configuration
// In production set VITE_API_URL env var in Vercel dashboard
// e.g. https://your-backend.railway.app
const raw = import.meta.env.VITE_API_URL as string | undefined;

// Strip trailing slash
export const API_BASE = raw ? raw.replace(/\/$/, '') : 'http://127.0.0.1:8000';

// WebSocket URL (http→ws, https→wss)
export const WS_BASE = API_BASE.replace(/^http/, 'ws');
