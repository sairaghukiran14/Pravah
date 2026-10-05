'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Clock,
  Zap,
  ShieldAlert,
  AlertTriangle,
  Activity,
  Terminal,
  Code2,
  Calendar,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
  AlertCircle,
  Loader2,
  Info,
  X,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  totalRequests: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiry: number | null;
}

interface ApiLogItem {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  durationMs: number | null;
  cost: number;
  ip: string | null;
  error: string | null;
  createdAt: string;
  keyName: string;
  keyPrefix: string;
}

interface AnalyticsData {
  metrics: {
    totalRequests: number;
    last24hRequests: number;
    successRate: string;
    avgLatencyMs: number;
    totalCreditsSpent: number;
  };
  timeseries: {
    date: string;
    requests: number;
    errors: number;
    avgLatency: number;
    cost: number;
  }[];
  keyUsage: {
    id: string;
    name: string;
    keyPrefix: string;
    totalRequests: number;
    lastUsedAt: string | null;
    expiresAt: string | null;
    isExpired: boolean;
  }[];
  recentLogs: ApiLogItem[];
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const EXPIRY_OPTIONS = [
  { id: '7d', label: '7 Days', desc: 'Ideal for short-term testing or hackathons' },
  { id: '30d', label: '30 Days', desc: 'Recommended standard for sprint cycles' },
  { id: '90d', label: '90 Days', desc: 'Quarterly key rotation standard' },
  { id: '1y', label: '1 Year', desc: 'Long-term server deployment' },
  { id: 'never', label: 'No Expiry', desc: 'Key stays active until manually revoked' },
] as const;

export default function ApiDashboardPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyItem | null>(null);
  const [createdKeySecret, setCreatedKeySecret] = useState<string | null>(null);
  const [hasAcknowledgedSaved, setHasAcknowledgedSaved] = useState(false);

  // Form & Validation state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState<'7d' | '30d' | '90d' | '1y' | 'never'>('30d');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSubmittingKey, setIsSubmittingKey] = useState(false);
  const [isRevokingKey, setIsRevokingKey] = useState(false);

  // General UI state
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [selectedCodeTab, setSelectedCodeTab] = useState<'curl' | 'python' | 'ts'>('curl');
  const [logFilter, setLogFilter] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const fetchDashboardData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      const [keysRes, analyticsRes] = await Promise.all([
        fetch('/api/user/api-keys'),
        fetch('/api/analytics/api'),
      ]);

      if (keysRes.ok) {
        const keysData = await keysRes.json();
        setKeys(keysData.keys || []);
      }
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData);
      }
      if (isManualRefresh) {
        addToast('success', 'Dashboard analytics refreshed');
      }
    } catch (err) {
      console.error('Failed to load API dashboard data:', err);
      addToast('error', 'Failed to fetch developer analytics');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Real-time validation for Key Name
  const validateKeyName = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'Key name is required';
    }
    if (trimmed.length < 3) {
      return 'Key name must be at least 3 characters long';
    }
    if (trimmed.length > 50) {
      return 'Key name cannot exceed 50 characters';
    }
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(trimmed)) {
      return 'Only letters, numbers, spaces, underscores, and hyphens are allowed';
    }
    const duplicate = keys.some((k) => k.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      return 'An API key with this name already exists';
    }
    return null;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewKeyName(val);
    if (nameError) {
      setNameError(validateKeyName(val));
    }
  };

  const handleOpenCreateModal = () => {
    if (keys.length >= 20) {
      addToast('error', 'Maximum limit of 20 API keys reached. Please revoke unused keys first.');
      return;
    }
    setNewKeyName('');
    setNewKeyExpiry('30d');
    setNameError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateKeyName(newKeyName);
    if (error) {
      setNameError(error);
      return;
    }

    try {
      setIsSubmittingKey(true);
      const res = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          expiry: newKeyExpiry,
        }),
      });

      const data = await res.json();
      if (res.ok && data.key) {
        setIsCreateModalOpen(false);
        setCreatedKeySecret(data.key);
        setHasAcknowledgedSaved(false);
        addToast('success', `API Key "${newKeyName.trim()}" generated successfully`);
        fetchDashboardData();
      } else {
        setNameError(data.error || 'Failed to create API key');
      }
    } catch (err) {
      console.error('Error creating key:', err);
      setNameError('An unexpected network error occurred');
    } finally {
      setIsSubmittingKey(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!keyToRevoke) return;

    try {
      setIsRevokingKey(true);
      const res = await fetch(`/api/user/api-keys/${keyToRevoke.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        addToast('success', `API key "${keyToRevoke.name}" has been revoked`);
        setKeyToRevoke(null);
        fetchDashboardData();
      } else {
        addToast('error', data.error || 'Failed to revoke API key');
      }
    } catch (err) {
      console.error('Error revoking key:', err);
      addToast('error', 'Failed to revoke API key');
    } finally {
      setIsRevokingKey(false);
    }
  };

  const filteredLogs = (analytics?.recentLogs || []).filter((log) => {
    if (!logFilter) return true;
    const filterLower = logFilter.toLowerCase();
    return (
      (log.endpoint || '').toLowerCase().includes(filterLower) ||
      (log.keyName || '').toLowerCase().includes(filterLower) ||
      String(log.statusCode).includes(logFilter)
    );
  });

  const maxDailyRequests = Math.max(...(analytics?.timeseries?.map((t) => t.requests) || [1]), 1);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold backdrop-blur-md transition-all animate-in slide-in-from-bottom-2 ${
              t.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
                : t.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-800'
                : 'bg-slate-900/90 text-slate-100 border-slate-800'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
            {t.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />}
            {t.type === 'info' && <Info className="h-4 w-4 text-blue-400 shrink-0" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">Developer & API Dashboard</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
                REST v1
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Manage API keys with custom expiry, monitor real-time execution analytics, and integrate Pravah into your external apps.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={loading || isRefreshing}
              title="Refresh Dashboard Data"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-60 text-slate-700 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <Link
              href="/templates"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Pipeline Gallery</span>
            </Link>

            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create New Key</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {loading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="h-3.5 w-24 bg-slate-200 rounded-md" />
                    <div className="h-4 w-4 bg-slate-200 rounded-full" />
                  </div>
                  <div className="mt-3.5 space-y-2">
                    <div className="h-7 w-20 bg-slate-200 rounded-lg" />
                    <div className="h-3 w-16 bg-slate-100 rounded-md" />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Total API Requests</span>
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {analytics?.metrics.totalRequests ?? 0}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({analytics?.metrics.last24hRequests ?? 0} in 24h)
                  </span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Success Rate</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {analytics?.metrics.successRate ?? '100%'}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-medium">Healthy</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Avg Execution Latency</span>
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {analytics?.metrics.avgLatencyMs ? `${analytics.metrics.avgLatencyMs}ms` : '< 1s'}
                  </span>
                  <span className="text-[11px] text-slate-400">P95</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">API Credits Billed</span>
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    ₹{analytics?.metrics.totalCreditsSpent.toFixed(2) ?? '0.00'}
                  </span>
                  <span className="text-[11px] text-slate-400">Pay-as-you-go</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Timeseries Chart Card */}
        {loading ? (
          <div className="mt-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1.5">
                <div className="h-4 w-48 bg-slate-200 rounded-md" />
                <div className="h-3 w-64 bg-slate-100 rounded-md" />
              </div>
              <div className="h-3.5 w-32 bg-slate-100 rounded-md" />
            </div>
            <div className="h-32 flex items-end gap-2 pt-4 border-b border-slate-100">
              {[30, 45, 60, 25, 75, 40, 90, 65, 50, 80, 35, 70, 55, 85].map((h, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div className="w-full bg-slate-100 rounded-t-md" style={{ height: `${h}%` }} />
                  <div className="h-2 w-6 bg-slate-100 rounded-xs mt-1" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          analytics?.timeseries && analytics.timeseries.length > 0 && (
            <div className="mt-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">API Traffic & Activity (Past 14 Days)</h3>
                  <p className="text-xs text-slate-500">Daily request volume, completions, and error spikes.</p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500" /> Requests
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> Errors
                  </span>
                </div>
              </div>

              <div className="h-32 flex items-end gap-2 pt-4 border-b border-slate-100">
                {analytics.timeseries.map((day) => {
                  const heightPercent = Math.max(8, Math.round((day.requests / maxDailyRequests) * 100));
                  const errorPercent = day.requests > 0 ? Math.round((day.errors / day.requests) * 100) : 0;

                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-slate-900 text-white text-[10px] p-2.5 rounded-xl shadow-xl pointer-events-none whitespace-nowrap z-20 border border-slate-800">
                        <p className="font-bold text-blue-300">{day.date}</p>
                        <p className="mt-1">Requests: {day.requests}</p>
                        <p className="text-rose-300">Errors: {day.errors}</p>
                        <p className="text-slate-400">Avg Latency: {day.avgLatency}ms</p>
                      </div>

                      <div className="w-full bg-slate-100 rounded-t-md overflow-hidden flex flex-col justify-end" style={{ height: `${heightPercent}%` }}>
                        {day.errors > 0 && (
                          <div className="w-full bg-rose-500" style={{ height: `${errorPercent}%` }} />
                        )}
                        <div className="w-full bg-blue-500 flex-1 group-hover:bg-blue-600 transition-colors" />
                      </div>
                      <span className="text-[9px] text-slate-400 truncate w-full text-center">
                        {day.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* API Keys Management Section */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Key className="h-4 w-4 text-blue-600" />
                  <span>Active API Keys</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                  {loading ? '...' : `${keys.length} / 20 keys`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Secret keys grant external access to trigger your workflows. Keep them secure.
              </p>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Generate API Key</span>
            </button>
          </div>

          {/* Keys Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Key Name</th>
                  <th className="px-6 py-3">Key Prefix</th>
                  <th className="px-6 py-3">Status & Expiry</th>
                  <th className="px-6 py-3">Total Requests</th>
                  <th className="px-6 py-3">Last Used</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <>
                    {[1, 2, 3].map((row) => (
                      <tr key={row} className="animate-pulse">
                        <td className="px-6 py-4">
                          <div className="h-4 w-32 bg-slate-200 rounded-md" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-28 bg-slate-100 rounded-md font-mono" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-5 w-24 bg-slate-100 rounded-full" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-12 bg-slate-100 rounded-md" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-16 bg-slate-100 rounded-md" />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="h-6 w-14 bg-slate-100 rounded-lg ml-auto" />
                        </td>
                      </tr>
                    ))}
                  </>
                ) : (
                  keys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{k.name}</td>
                      <td className="px-6 py-4 font-mono text-slate-600 text-[11px]">{k.keyPrefix}</td>
                      <td className="px-6 py-4">
                        {k.isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold">
                            <XCircle className="h-3 w-3" /> Expired
                          </span>
                        ) : k.isExpiringSoon ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                            <AlertTriangle className="h-3 w-3" /> Expiring in {k.daysUntilExpiry}d
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                            <CheckCircle2 className="h-3 w-3" /> Active {k.daysUntilExpiry ? `(${k.daysUntilExpiry}d left)` : '(No Expiry)'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{k.totalRequests}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setKeyToRevoke(k)}
                          className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 text-xs font-semibold transition-colors cursor-pointer p-1 rounded-lg hover:bg-rose-50"
                          title="Revoke API Key"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Revoke</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {keys.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <Key className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-600 text-sm">No API keys created yet</p>
                      <p className="text-xs text-slate-400 mt-1">Generate your first API key above to start triggering pipelines from outside the website.</p>
                      <button
                        onClick={handleOpenCreateModal}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Generate Key</span>
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Request Logs Table */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-blue-600" />
                <span>Live API Request Logs</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time stream of HTTP requests triggered with your API keys.
              </p>
            </div>

            {/* Filter */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter logs by endpoint / status..."
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-xs text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Method & Endpoint</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Latency</th>
                  <th className="px-6 py-3">Cost</th>
                  <th className="px-6 py-3">Key Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((row) => (
                      <tr key={row} className="animate-pulse">
                        <td className="px-6 py-3">
                          <div className="h-3.5 w-16 bg-slate-200 rounded-md" />
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-10 bg-slate-200 rounded-md" />
                            <div className="h-3.5 w-36 bg-slate-100 rounded-md" />
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="h-4 w-16 bg-slate-100 rounded-full" />
                        </td>
                        <td className="px-6 py-3">
                          <div className="h-3.5 w-12 bg-slate-100 rounded-md" />
                        </td>
                        <td className="px-6 py-3">
                          <div className="h-3.5 w-10 bg-slate-100 rounded-md" />
                        </td>
                        <td className="px-6 py-3">
                          <div className="h-3.5 w-24 bg-slate-100 rounded-md" />
                        </td>
                      </tr>
                    ))}
                  </>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-3">
                        <span className="font-mono font-bold text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded mr-1.5">
                          {log.method}
                        </span>
                        <span className="font-mono text-[11px] text-slate-700">{log.endpoint}</span>
                      </td>
                      <td className="px-6 py-3">
                        {log.statusCode >= 200 && log.statusCode < 300 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {log.statusCode} OK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            {log.statusCode} Error
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-slate-600 font-mono text-[11px]">
                        {log.durationMs ? `${log.durationMs}ms` : '-'}
                      </td>
                      <td className="px-6 py-3 text-slate-600 font-semibold">
                        ₹{log.cost.toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-slate-500">
                        <span className="font-medium text-slate-700">{log.keyName}</span>{' '}
                        <span className="font-mono text-[10px] text-slate-400">({log.keyPrefix})</span>
                      </td>
                    </tr>
                  ))
                )}
                {filteredLogs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No API request logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quickstart Integration Code Card */}
        <div className="mt-8 bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <Code2 className="h-4 w-4 text-blue-400" />
                <span>Integration Quickstart</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Trigger any pipeline externally using standard HTTP requests.
              </p>
            </div>

            {/* Language Tabs */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setSelectedCodeTab('curl')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedCodeTab === 'curl' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                cURL
              </button>
              <button
                onClick={() => setSelectedCodeTab('python')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedCodeTab === 'python' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Python
              </button>
              <button
                onClick={() => setSelectedCodeTab('ts')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedCodeTab === 'ts' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                TypeScript / Node
              </button>
            </div>
          </div>

          {/* Code block */}
          <div className="mt-4 relative">
            <pre className="p-4 bg-slate-950 rounded-xl text-xs font-mono text-slate-200 overflow-x-auto border border-slate-800 leading-relaxed">
              {selectedCodeTab === 'curl' && `curl -X POST "https://your-domain.com/api/pipelines/YOUR_PIPELINE_ID/run?stream=false" \\
  -H "Authorization: Bearer ${keys[0]?.keyPrefix ? keys[0].keyPrefix.replace('...', 'YOUR_SECRET_KEY') : 'pf_live_YOUR_SECRET_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "inputs": {
      "text": "नमस्ते! भारत की कृत्रिम बुद्धिमत्ता सर्वम एआई।"
    }
  }'`}

              {selectedCodeTab === 'python' && `import requests

PIPELINE_ID = "YOUR_PIPELINE_ID"
API_KEY = "${keys[0]?.keyPrefix ? keys[0].keyPrefix.replace('...', 'YOUR_SECRET_KEY') : 'pf_live_YOUR_SECRET_KEY'}"

response = requests.post(
    f"https://your-domain.com/api/pipelines/{PIPELINE_ID}/run?stream=false",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "inputs": {
            "text": "नमस्ते! भारत की कृत्रिम बुद्धिमत्ता सर्वम एआई।"
        }
    }
)

result = response.json()
print("Run ID:", result.get("runId"))
print("Outputs:", result.get("outputs"))`}

              {selectedCodeTab === 'ts' && `const PIPELINE_ID = "YOUR_PIPELINE_ID";
const API_KEY = "${keys[0]?.keyPrefix ? keys[0].keyPrefix.replace('...', 'YOUR_SECRET_KEY') : 'pf_live_YOUR_SECRET_KEY'}";

const res = await fetch(\`https://your-domain.com/api/pipelines/\${PIPELINE_ID}/run?stream=false\`, {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    inputs: {
      text: "नमस्ते! भारत की कृत्रिम बुद्धिमत्ता सर्वम एआई।",
    },
  }),
});

const data = await res.json();
console.log("Run Output:", data.outputs);`}
            </pre>
          </div>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. CREATE API KEY MODAL WITH VALIDATION */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Generate New API Key</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create a secret token to trigger your Indic AI pipelines.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateKeySubmit} className="mt-6 space-y-5">
              {/* Key Name Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Key Name <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[10px] ${newKeyName.length > 50 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                    {newKeyName.length} / 50
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Production Backend, Zapier Sync, Mobile App"
                  value={newKeyName}
                  onChange={handleNameChange}
                  maxLength={60}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
                    nameError
                      ? 'border-rose-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                      : 'border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                  }`}
                  autoFocus
                />
                {nameError && (
                  <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{nameError}</span>
                  </p>
                )}
              </div>

              {/* Expiration Options */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">
                  Expiration Duration
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXPIRY_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                        newKeyExpiry === opt.id
                          ? 'border-blue-500 bg-blue-50/50 shadow-2xs'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{opt.label}</span>
                        <input
                          type="radio"
                          name="expiry"
                          checked={newKeyExpiry === opt.id}
                          onChange={() => setNewKeyExpiry(opt.id)}
                          className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 leading-tight">{opt.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Security Hint */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 flex items-start gap-2">
                <Lock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Keys are hashed with SHA-256 before storage. You will only be able to view the secret value once.
                </span>
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmittingKey}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingKey || !newKeyName.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  {isSubmittingKey ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5 fill-current" />
                      <span>Generate Key</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. CONFIRM REVOKE DIALOG */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {keyToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Revoke API Key?</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Are you sure you want to revoke <strong className="text-slate-900 font-bold font-mono bg-slate-100 px-1 py-0.5 rounded">"{keyToRevoke.name}"</strong> ({keyToRevoke.keyPrefix})?
                </p>
                <div className="mt-3 p-3 rounded-xl bg-rose-50/70 border border-rose-200/80 text-[11px] text-rose-800 leading-normal">
                  ⚠️ <strong>Warning:</strong> Any external server, Python script, or webhook integration using this key will immediately fail with <code>401 Unauthorized</code>.
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setKeyToRevoke(null)}
                disabled={isRevokingKey}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={isRevokingKey}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                {isRevokingKey ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Revoking...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Yes, Revoke Key</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. SECRET KEY CREATED & REVEAL MODAL */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {createdKeySecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">API Key Generated</h3>
                <p className="text-xs text-slate-400 mt-0.5">Please save your key now — you won't be able to view it again.</p>
              </div>
            </div>

            {/* Key Container */}
            <div className="mt-5 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">Secret Token</span>
                  <span className="text-emerald-400 font-mono">Ready to use</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-slate-900 rounded-xl text-xs font-mono font-bold text-blue-300 select-all border border-slate-800 truncate">
                    {createdKeySecret}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdKeySecret);
                      setCopiedSecret(true);
                      addToast('success', 'Secret key copied to clipboard');
                      setTimeout(() => setCopiedSecret(false), 2500);
                    }}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer transition-all shrink-0"
                  >
                    {copiedSecret ? <Check className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5 text-white" />}
                    <span>{copiedSecret ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Checkbox confirmation */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAcknowledgedSaved}
                  onChange={(e) => setHasAcknowledgedSaved(e.target.checked)}
                  className="h-4 w-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-700 bg-slate-900 cursor-pointer"
                />
                <span className="text-xs text-slate-300 select-none leading-relaxed">
                  I have copied and safely stored this secret key in my environment variables or key vault.
                </span>
              </label>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end">
              <button
                onClick={() => setCreatedKeySecret(null)}
                disabled={!hasAcknowledgedSaved && !copiedSecret}
                className={`px-6 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  hasAcknowledgedSaved || copiedSecret
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
