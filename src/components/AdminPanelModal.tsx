import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  Users,
  Sliders,
  Key,
  Activity,
  Check,
  AlertTriangle,
  RotateCcw,
  Plus,
  Trash2,
  Lock,
  Mail,
  Zap,
  Film,
  Bot,
  FileText,
  UserCheck,
  UserX,
  Copy,
  Eye,
  EyeOff,
  Cpu,
  RefreshCw,
  Search,
  Inbox,
} from 'lucide-react';
import {
  SUPER_ADMIN_EMAIL,
  isUserSuperAdmin,
  saveAdminFeatureFlags,
  getAdminFeatureFlags,
  saveAdminToken,
  getAdminTokens,
  revokeAdminTokenInFirestore,
  getAllUsersFromFirestore,
} from '../lib/firebase';

const API_BASE = import.meta.env.VITE_MCP_API_URL || 'http://localhost:3002';
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || '__vistaro_dev_secret_do_not_use_in_prod__';

// ─── Production-Grade Admin Authentication Helper ───────────────────────────
// Supports:
// 1. Firebase Auth ID Token (if logged in)
// 2. Cryptographic WebCrypto HMAC-SHA256 timestamp signature
// 3. Fallback timestamp token for local development
async function generateBrowserHmac(secret: string, message: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const enc = new TextEncoder();
      const key = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await window.crypto.subtle.sign('HMAC', key, enc.encode(message));
      return Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch (err) {
    console.warn('[AdminAuth] WebCrypto HMAC error:', err);
  }
  return '';
}

async function generateAdminAuthHeader(currentUser?: any): Promise<Record<string, string>> {
  // 1. If Firebase ID token is available from currentUser, use it
  if (currentUser && typeof currentUser.getIdToken === 'function') {
    try {
      const idToken = await currentUser.getIdToken();
      if (idToken) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        };
      }
    } catch {
      // Continue to HMAC
    }
  }

  // 2. Cryptographic WebCrypto HMAC-SHA256 signature
  const nowMs = Date.now().toString();
  const hmacHex = await generateBrowserHmac(ADMIN_SECRET, `${nowMs}${SUPER_ADMIN_EMAIL}`);
  if (hmacHex) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${nowMs}:${hmacHex}`,
    };
  }

  // 3. Fallback timestamp signature for local development
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${nowMs}:${SUPER_ADMIN_EMAIL}`,
  };
}

// ─── Custom Toggle Switch (Tailwind only, no external lib) ──────────────────
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E05D26]/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
      checked ? 'bg-[#E05D26]' : 'bg-slate-300 dark:bg-slate-600'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-1'
      }`}
    />
  </button>
);

// ─── Status Dot with optional pulse ─────────────────────────────────────────
const StatusDot: React.FC<{ status: 'healthy' | 'degraded' | 'down' }> = ({ status }) => {
  const colors = {
    healthy: 'bg-emerald-500',
    degraded: 'bg-amber-500',
    down: 'bg-red-500',
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'healthy' && (
        <span className={`absolute inset-0 rounded-full ${colors[status]} animate-ping opacity-50`} />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colors[status]}`} />
    </span>
  );
};

// ─── Empty State placeholder ────────────────────────────────────────────────
const EmptyState: React.FC<{ icon: React.ReactNode; message: string }> = ({ icon, message }) => (
  <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
    <div className="mb-3 opacity-40">{icon}</div>
    <span className="text-xs font-medium">{message}</span>
  </div>
);

// ─── Live Uptime Formatter ──────────────────────────────────────────────────
function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onSignInEmail?: (email: string, pass: string) => Promise<any>;
  onToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

type AdminTab = 'overview' | 'features' | 'users' | 'tokens' | 'login';

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSignInEmail,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});

  // Admin Data State
  const [overview, setOverview] = useState<any>(null);
  const [features, setFeatures] = useState<Record<string, any>>({
    enable8KExport: true,
    enableVideoStudio: true,
    enableMcpBridge: true,
    enableBorderDetector: true,
    enablePdfExport: true,
    maxDailySlicesPerUser: 100,
    maintenanceMode: false,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);

  // User search/filter state
  const [userSearch, setUserSearch] = useState('');

  // Token Generation Form State
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenRateLimit, setNewTokenRateLimit] = useState(300);

  // Admin Quick Login Form State
  const [adminEmail, setAdminEmail] = useState(SUPER_ADMIN_EMAIL);
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Live uptime counter
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const uptimeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const openedAtRef = useRef<number>(Date.now());

  const isAdmin = isUserSuperAdmin(currentUser);

  // If already admin, force tab away from 'login' on mount
  useEffect(() => {
    if (isAdmin && activeTab === 'login') {
      setActiveTab('overview');
    }
  }, [isAdmin]);

  // Live uptime ticker
  useEffect(() => {
    if (isOpen) {
      openedAtRef.current = Date.now();
      const baseUptime = overview?.uptimeSeconds ?? 0;
      setUptimeSeconds(baseUptime);
      uptimeRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - openedAtRef.current) / 1000);
        setUptimeSeconds(baseUptime + elapsed);
      }, 1000);
      return () => {
        if (uptimeRef.current) clearInterval(uptimeRef.current);
      };
    }
    return () => {
      if (uptimeRef.current) clearInterval(uptimeRef.current);
    };
  }, [isOpen, overview?.uptimeSeconds]);

  // Load Admin Data from REST backend & Firestore persistent backup
  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = await generateAdminAuthHeader(currentUser);

      // 1. Fetch from Express / MCP Backend
      const [resOverview, resFeatures, resUsers, resTokens] = await Promise.all([
        fetch(`${API_BASE}/api/v1/admin/overview`, { headers }).catch(() => null),
        fetch(`${API_BASE}/api/v1/admin/features`, { headers }).catch(() => null),
        fetch(`${API_BASE}/api/v1/admin/users`, { headers }).catch(() => null),
        fetch(`${API_BASE}/api/v1/admin/tokens`, { headers }).catch(() => null),
      ]);

      if (resOverview && resOverview.ok) {
        const data = await resOverview.json();
        setOverview(data);
        if (data.features) setFeatures(data.features);
      }
      if (resFeatures && resFeatures.ok) {
        const data = await resFeatures.json();
        if (data.features) setFeatures(data.features);
      }
      if (resUsers && resUsers.ok) {
        const data = await resUsers.json();
        if (data.users) setUsers(data.users);
      }
      if (resTokens && resTokens.ok) {
        const data = await resTokens.json();
        if (data.tokens) setTokens(data.tokens);
      }

      // 2. Fetch persistent fallback / merged records from Firestore
      const [fsFeatures, fsTokens, fsUsers] = await Promise.all([
        getAdminFeatureFlags(),
        getAdminTokens(),
        getAllUsersFromFirestore(),
      ]);

      if (fsFeatures) {
        setFeatures((prev) => ({ ...prev, ...fsFeatures }));
      }
      if (fsTokens && fsTokens.length > 0) {
        setTokens((prev) => {
          const map = new Map();
          [...prev, ...fsTokens].forEach((t) => map.set(t.token, t));
          return Array.from(map.values());
        });
      }
      if (fsUsers && fsUsers.length > 0) {
        setUsers((prev) => {
          const map = new Map();
          [...prev, ...fsUsers].forEach((u) => map.set(u.uid, u));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.warn('[AdminPanel] Could not connect to remote backend:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isOpen) {
      fetchAdminData();
    }
  }, [isOpen, fetchAdminData]);

  // Toggle Feature Flag (with Firestore persistence)
  const handleToggleFeature = async (featureKey: string, newValue: boolean) => {
    const updated = { ...features, [featureKey]: newValue };
    setFeatures(updated);
    // Persist to Firestore
    await saveAdminFeatureFlags(updated);

    try {
      const headers = await generateAdminAuthHeader(currentUser);
      const res = await fetch(`${API_BASE}/api/v1/admin/features`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ [featureKey]: newValue }),
      });
      if (res.ok) {
        onToast('Feature Updated', `${featureKey} is now ${newValue ? 'Enabled' : 'Disabled'}`, 'success');
      }
    } catch (err) {
      onToast('Saved to Firestore', `${featureKey} updated in database.`, 'info');
    }
  };

  // Change User Role
  const handleChangeRole = async (uid: string, newRole: string) => {
    try {
      const headers = await generateAdminAuthHeader(currentUser);
      const res = await fetch(`${API_BASE}/api/v1/admin/users/${uid}/role`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
        onToast('User Role Updated', `Role changed to ${newRole}`, 'success');
      }
    } catch (err) {
      onToast('Role Error', 'Failed to update user role.', 'error');
    }
  };

  // Toggle User Status — with confirmation dialog
  const handleToggleUserStatus = async (uid: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const action = newStatus === 'suspended' ? 'suspend' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      const headers = await generateAdminAuthHeader(currentUser);
      const res = await fetch(`${API_BASE}/api/v1/admin/users/${uid}/status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, status: newStatus } : u)));
        onToast('Status Changed', `User is now ${newStatus}`, 'info');
      }
    } catch (err) {
      onToast('Status Error', 'Failed to update user status.', 'error');
    }
  };

  // Generate Agent Token (with Firestore persistence)
  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;

    try {
      const headers = await generateAdminAuthHeader(currentUser);
      const res = await fetch(`${API_BASE}/api/v1/admin/tokens/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newTokenName,
          rateLimitPerMin: newTokenRateLimit,
          userEmail: SUPER_ADMIN_EMAIL,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTokens((prev) => [data.token, ...prev]);
        setNewTokenName('');
        // Save to Firestore
        await saveAdminToken(data.token);
        onToast('Token Provisioned', 'New agent key created and persisted.', 'success');
      }
    } catch (err) {
      onToast('Token Error', 'Failed to generate token.', 'error');
    }
  };

  // Revoke Token — with confirmation dialog
  const handleRevokeToken = async (token: string) => {
    if (!window.confirm('Are you sure you want to revoke this agent token? This cannot be undone.')) return;

    // Revoke in Firestore
    await revokeAdminTokenInFirestore(token);
    try {
      const headers = await generateAdminAuthHeader(currentUser);
      const res = await fetch(`${API_BASE}/api/v1/admin/tokens/revoke`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setTokens((prev) => prev.map((t) => (t.token === token ? { ...t, status: 'revoked' } : t)));
        onToast('Token Revoked', 'The agent token has been revoked.', 'warning');
      }
    } catch (err) {
      onToast('Token Revoked', 'Updated revocation status in Firestore.', 'warning');
    }
  };

  // Quick Sign In with Admin Credentials
  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSignInEmail) return;
    setIsLoggingIn(true);
    try {
      await onSignInEmail(adminEmail, adminPassword);
      onToast('Super Admin Authenticated', `Logged in as ${adminEmail}`, 'success');
      fetchAdminData();
    } catch (err: any) {
      onToast('Login Alert', err?.message || 'Could not sign in with admin credentials.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
    onToast('Copied', 'Token copied to clipboard', 'info');
  };

  // Filtered users by search query
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  // Server health status derived from overview data
  const serverStatus: 'healthy' | 'degraded' | 'down' =
    overview?.status === 'degraded' ? 'degraded' : overview?.status === 'down' ? 'down' : 'healthy';

  // Build the tab list (hide 'login' when already admin)
  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview & Health', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'features', label: 'Feature Control', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'users', label: `User Management (${users.length})`, icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'tokens', label: `Token Management (${tokens.length})`, icon: <Key className="w-3.5 h-3.5" /> },
    ...(!isAdmin
      ? [{ id: 'login' as AdminTab, label: 'Admin Auth', icon: <Lock className="w-3.5 h-3.5" /> }]
      : []),
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white dark:bg-[#0E121A] text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#121722] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#E05D26] text-white flex items-center justify-center font-bold shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-950 dark:text-white tracking-tight">
                  Vistaro Studio Admin Console
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-800">
                  SUPER ADMIN
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Authorized Identity: {SUPER_ADMIN_EMAIL}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAdminData}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E121A] px-6 text-xs font-medium gap-1 overflow-x-auto shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#E05D26] text-[#E05D26] font-semibold'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Metric Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
                  <span className="text-[11px] font-mono text-slate-500 uppercase block">Registered Users</span>
                  <span className="text-2xl font-bold font-mono text-slate-950 dark:text-white">
                    {users.length}
                  </span>
                  <span className="text-[10px] text-emerald-600 mt-1 block">Active across platform</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
                  <span className="text-[11px] font-mono text-slate-500 uppercase block">Active Agent Keys</span>
                  <span className="text-2xl font-bold font-mono text-slate-950 dark:text-white">
                    {tokens.filter((t) => t.status === 'active').length}
                  </span>
                  <span className="text-[10px] text-blue-600 mt-1 block">MCP & REST authorized</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
                  <span className="text-[11px] font-mono text-slate-500 uppercase block">Features Active</span>
                  <span className="text-2xl font-bold font-mono text-slate-950 dark:text-white">
                    {Object.values(features).filter((v) => v === true).length}
                  </span>
                  <span className="text-[10px] text-amber-600 mt-1 block">Engineered modules live</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
                  <span className="text-[11px] font-mono text-slate-500 uppercase block">Server Status</span>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusDot status={serverStatus} />
                    <span
                      className={`text-lg font-bold font-mono ${
                        serverStatus === 'healthy'
                          ? 'text-emerald-600'
                          : serverStatus === 'degraded'
                          ? 'text-amber-500'
                          : 'text-red-500'
                      }`}
                    >
                      {serverStatus.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 block">
                    Uptime: {formatUptime(uptimeSeconds)}
                  </span>
                </div>
              </div>

              {/* Server & Bridge Specifications */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-2 text-xs">
                <h4 className="font-semibold text-slate-900 dark:text-white">Control Plane Configuration</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  <div>• Super Admin: <span className="text-[#E05D26]">{SUPER_ADMIN_EMAIL}</span></div>
                  <div>• Authenticated Status: <span className={isAdmin ? 'text-emerald-500' : 'text-amber-500'}>{isAdmin ? 'Super Admin Active' : 'Guest / Dev Mode'}</span></div>
                  <div className="flex items-center gap-1.5">
                    • Remote MCP Bridge:
                    <StatusDot status={serverStatus} />
                    <span className="text-emerald-500">http://localhost:3002</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    • WebSocket Channel:
                    <StatusDot status={serverStatus} />
                    <span className="text-emerald-500">ws://localhost:3001</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FEATURE CONTROL */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-950 dark:text-white">Platform Feature Flags</h3>
                <p className="text-xs text-slate-500">Toggle core capabilities in real-time across all user sessions.</p>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden">
                {/* Feature 1: 8K Export */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">8K Studio Upscaling & Sharpening</span>
                      <span className="text-[11px] text-slate-500">Allows progressive high-definition exports up to 7680px width</span>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={features.enable8KExport !== false}
                    onChange={(val) => handleToggleFeature('enable8KExport', val)}
                  />
                </div>

                {/* Feature 2: Video Studio */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                      <Film className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Motion Video Studio</span>
                      <span className="text-[11px] text-slate-500">Hardware WebCodecs 4K MP4 pan-and-zoom video creation</span>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={features.enableVideoStudio !== false}
                    onChange={(val) => handleToggleFeature('enableVideoStudio', val)}
                  />
                </div>

                {/* Feature 3: External MCP Bridge */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">External AI Agent & MCP Access</span>
                      <span className="text-[11px] text-slate-500">Allows Claude Desktop and ChatGPT to call tools via Port 3002</span>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={features.enableMcpBridge !== false}
                    onChange={(val) => handleToggleFeature('enableMcpBridge', val)}
                  />
                </div>

                {/* Feature 4: Border Detector — teal instead of purple */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Intelligent Panel Border Detector</span>
                      <span className="text-[11px] text-slate-500">Background Web Worker Sobel edge & gutter analysis</span>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={features.enableBorderDetector !== false}
                    onChange={(val) => handleToggleFeature('enableBorderDetector', val)}
                  />
                </div>

                {/* Feature 5: PDF Export */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center font-bold">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">Multi-Page PDF Storyboard Export</span>
                      <span className="text-[11px] text-slate-500">High-resolution client presentation document compiling</span>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={features.enablePdfExport !== false}
                    onChange={(val) => handleToggleFeature('enablePdfExport', val)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-950 dark:text-white">User Accounts & Access Control</h3>
                <p className="text-xs text-slate-500">Manage user roles, grant Pro Creator features, or suspend accounts.</p>
              </div>

              {/* Search / Filter Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filter by name or email..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-[#E05D26] transition-colors"
                />
              </div>

              {filteredUsers.length === 0 ? (
                <EmptyState
                  icon={<Users className="w-10 h-10" />}
                  message={users.length === 0 ? 'No users registered yet' : 'No users match your search'}
                />
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono uppercase text-slate-500">
                      <tr>
                        <th className="p-3">User</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Exports</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredUsers.map((u) => (
                        <tr key={u.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-3">
                            <span className="font-semibold text-slate-900 dark:text-white block">{u.displayName}</span>
                            <span className="text-[11px] font-mono text-slate-500">{u.email}</span>
                          </td>
                          <td className="p-3">
                            <select
                              value={u.role}
                              onChange={(e) => handleChangeRole(u.uid, e.target.value)}
                              className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                            >
                              <option value="super_admin">Super Admin</option>
                              <option value="admin">Admin</option>
                              <option value="pro">Pro Creator</option>
                              <option value="user">Free User</option>
                            </select>
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                u.status === 'active'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                              }`}
                            >
                              {u.status === 'active' ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="p-3 font-mono">{u.totalExports || 0}</td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u.uid, u.status)}
                              className="px-2.5 py-1 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                            >
                              {u.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TOKEN MANAGEMENT */}
          {activeTab === 'tokens' && (
            <div className="space-y-6">
              {/* Form to provision new token */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-[#E05D26]" />
                  <span>Provision Master Agent API Key</span>
                </h4>
                <form onSubmit={handleGenerateToken} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    placeholder="Token label (e.g. Claude Desktop Agent)"
                    className="px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-[#E05D26]"
                    required
                  />
                  <input
                    type="number"
                    value={newTokenRateLimit}
                    onChange={(e) => setNewTokenRateLimit(Number(e.target.value))}
                    placeholder="Rate limit / min"
                    className="px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-[#E05D26]"
                    min={10}
                    max={5000}
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#E05D26] hover:bg-[#C94E1B] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Token</span>
                  </button>
                </form>
              </div>

              {/* Tokens Table */}
              {tokens.length === 0 ? (
                <EmptyState
                  icon={<Key className="w-10 h-10" />}
                  message="No agent tokens provisioned yet"
                />
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/40">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono uppercase text-slate-500">
                      <tr>
                        <th className="p-3">Token & Name</th>
                        <th className="p-3">Owner</th>
                        <th className="p-3">Rate Limit</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {tokens.map((t) => {
                        const isRevealed = Boolean(showTokens[t.token]);
                        return (
                          <tr key={t.token} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-3">
                              <span className="font-semibold text-slate-900 dark:text-white block">{t.name}</span>
                              <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                                <span>{isRevealed ? t.token : `${t.token.slice(0, 12)}••••••••••••`}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowTokens((prev) => ({ ...prev, [t.token]: !prev[t.token] }))
                                  }
                                  className="p-0.5 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                >
                                  {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(t.token)}
                                  className="p-0.5 hover:text-[#E05D26] cursor-pointer"
                                >
                                  {copiedToken === t.token ? (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-[11px]">{t.userEmail}</td>
                            <td className="p-3 font-mono text-[11px]">{t.rateLimitPerMin}/min</td>
                            <td className="p-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  t.status === 'active'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                                }`}
                              >
                                {t.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              {t.status === 'active' ? (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeToken(t.token)}
                                  className="px-2.5 py-1 rounded text-[11px] font-medium bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 cursor-pointer transition-colors"
                                >
                                  Revoke
                                </button>
                              ) : (
                                <span className="text-[10px] font-mono text-slate-400">Revoked</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ADMIN AUTH HELPER — only visible when !isAdmin */}
          {activeTab === 'login' && !isAdmin && (
            <div className="max-w-md mx-auto space-y-5 py-4">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-xl bg-[#E05D26]/10 text-[#E05D26] mx-auto flex items-center justify-center font-bold">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-950 dark:text-white">Super Admin Authentication</h3>
                <p className="text-xs text-slate-500">Sign in with system credentials to unlock complete backend authority.</p>
              </div>

              <form onSubmit={handleAdminSignIn} className="space-y-3.5 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Super Admin Email
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-[#E05D26]"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Super Admin Password
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-[#E05D26]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold text-white bg-[#E05D26] hover:bg-[#C94E1B] transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isLoggingIn ? 'Authenticating...' : 'Sign In as Super Admin'}</span>
                </button>
              </form>

              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                <strong>Designated Super Admin Identity:</strong>
                <div className="font-mono mt-1 text-[#E05D26] font-semibold">
                  {SUPER_ADMIN_EMAIL}
                </div>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  Enter your administrative password above to authenticate. Super Admin privileges grant full feature control, user role updates, and agent token authority.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
