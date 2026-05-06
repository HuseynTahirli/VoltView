'use client';
import { useEffect, useState } from 'react';
import { fetchAlerts, resolveAlert } from '@/lib/api';

type Alert = { id: number; type: string; message: string; timestamp: string; resolved: boolean; };

function getLoggedInEmail(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(^|;\s*)voltview_token=([^;]+)/);
  return match ? decodeURIComponent(match[2]) : '';
}

function badgeStyle(type: string) {
  if (type === 'critical') return { background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' };
  if (type === 'warning') return { background: 'rgba(250,204,21,0.1)', color: '#facc15', border: '1px solid rgba(250,204,21,0.25)' };
  return { background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' };
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    const userEmail = getLoggedInEmail();
    const data = await fetchAlerts(userEmail);
    setAlerts(Array.isArray(data) ? data : []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const handleResolve = async (id: number) => {
    await resolveAlert(id);
    load();
  };

  const cardStyle = {
    background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 60%), #09090f',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    overflow: 'hidden' as const,
  };

  return (
    <div className="py-4 sm:py-6">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#4a4a5a' }}>Monitoring</p>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Alerts</h1>
      </div>

      <div style={cardStyle}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="inline-flex items-center gap-2" style={{ color: '#4a4a5a' }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#3b82f6' }} />
              <span className="text-xs font-medium uppercase tracking-widest">Loading…</span>
            </div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full mb-5"
              style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: '#e5e5e5' }}>No Active Alerts</h3>
            <p className="text-xs max-w-xs mb-6" style={{ color: '#4a4a5a', lineHeight: 1.7 }}>
              Your device is running within normal limits. Alerts will appear here when a threshold is breached.
            </p>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: refreshing ? '#333' : '#888',
                cursor: refreshing ? 'not-allowed' : 'pointer',
              }}>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[120px_1fr_180px_100px] px-5 py-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Type', 'Message', 'Time', 'Action'].map(h => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#4a4a5a' }}>{h}</span>
              ))}
            </div>

            {/* Desktop rows */}
            <div className="hidden sm:block">
              {alerts.map((a) => (
                <div key={a.id}
                  className="grid grid-cols-[120px_1fr_180px_100px] items-center px-5 py-4 transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide" style={badgeStyle(a.type)}>
                      {a.type}
                    </span>
                  </div>
                  <span className="text-sm pr-4" style={{ color: '#ccc' }}>{a.message}</span>
                  <span className="text-xs" style={{ color: '#4a4a5a' }}>{new Date(a.timestamp).toLocaleString()}</span>
                  <div>
                    {!a.resolved && (
                      <button
                        onClick={() => handleResolve(a.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#888', cursor: 'pointer' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#888'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                        Resolve
                      </button>
                    )}
                    {a.resolved && (
                      <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: '#333' }}>Resolved</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile card layout */}
            <div className="sm:hidden divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {alerts.map((a) => (
                <div key={a.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide" style={badgeStyle(a.type)}>
                      {a.type}
                    </span>
                    {!a.resolved ? (
                      <button
                        onClick={() => handleResolve(a.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#888', cursor: 'pointer' }}>
                        Resolve
                      </button>
                    ) : (
                      <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: '#333' }}>Resolved</span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: '#ccc' }}>{a.message}</p>
                  <p className="text-xs" style={{ color: '#4a4a5a' }}>{new Date(a.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
