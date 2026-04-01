'use client';
import { useEffect, useState } from 'react';
import { fetchAlerts, resolveAlert } from '@/lib/api';
import { AlertsEmptyState } from '@/components/ui/alerts-empty-state';

type Alert = { id: number; type: string; message: string; timestamp: string; resolved: boolean; };

function getLoggedInEmail(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(^|;\s*)voltview_token=([^;]+)/);
  return match ? decodeURIComponent(match[2]) : '';
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

  const badgeStyle = (type: string) => {
    if (type === 'critical') return { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' };
    if (type === 'warning') return { background: 'rgba(250,204,21,0.12)', color: '#facc15', border: '1px solid rgba(250,204,21,0.3)' };
    return { background: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' };
  };

  return (
    <div className="py-4 sm:py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Alerts</h1>

      <div className="rounded-xl border overflow-hidden" style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }}>
        {loading ? (
          <div className="text-center text-[#555] py-10 text-sm">Loading...</div>
        ) : alerts.length === 0 ? (
          <AlertsEmptyState onRefresh={() => load(true)} refreshing={refreshing} />
        ) : (
          <>
            {/* Mobile card layout */}
            <div className="sm:hidden divide-y" style={{ borderColor: '#1a1a1a' }}>
              {alerts.map((a) => (
                <div key={a.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold" style={badgeStyle(a.type)}>{a.type}</span>
                    {!a.resolved && (
                      <button onClick={() => handleResolve(a.id)}
                        className="px-3 py-1 text-xs font-medium rounded-md cursor-pointer"
                        style={{ background: '#111', border: '1px solid #2a2a2a', color: '#888' }}>
                        Resolve
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-[#ccc]">{a.message}</p>
                  <p className="text-xs text-[#555]">{new Date(a.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>

            {/* Desktop table layout */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#111', borderBottom: '1px solid #1a1a1a' }}>
                    {['Type', 'Message', 'Time', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-[#888] text-xs font-medium uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a) => (
                    <tr key={a.id} className="border-b hover:bg-[#0d0d0d] transition-colors" style={{ borderColor: '#111' }}>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold" style={badgeStyle(a.type)}>{a.type}</span>
                      </td>
                      <td className="px-4 py-3 text-[#ccc]">{a.message}</td>
                      <td className="px-4 py-3 text-[#888]">{new Date(a.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {!a.resolved && (
                          <button onClick={() => handleResolve(a.id)}
                            className="px-3 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors"
                            style={{ background: '#111', border: '1px solid #2a2a2a', color: '#888' }}
                            onMouseEnter={e => { (e.target as HTMLElement).style.color = '#fff'; }}
                            onMouseLeave={e => { (e.target as HTMLElement).style.color = '#888'; }}>
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
