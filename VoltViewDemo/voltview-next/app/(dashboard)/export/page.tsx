'use client';
import { useState, useEffect } from 'react';
import { fetchExport, fetchDevices } from '@/lib/api';

type Device = { id: string; device_name: string; device_key: string; location?: string; data_mode?: string };

type Reading = {
  id: number;
  timestamp: string;
  voltage: number;
  current: number;
  power: number;
  energy?: number;
  frequency?: number;
  pf?: number;
};

function toCSV(rows: Reading[]): string {
  const headers = ['ID', 'Timestamp', 'Voltage (V)', 'Current (A)', 'Power (W)', 'Energy (kWh)', 'Frequency (Hz)', 'Power Factor'];
  const lines = rows.map(r => [
    r.id,
    r.timestamp,
    r.voltage?.toFixed(3) ?? '',
    r.current?.toFixed(4) ?? '',
    r.power?.toFixed(3) ?? '',
    r.energy != null ? r.energy.toFixed(5) : '',
    r.frequency != null ? r.frequency.toFixed(3) : '',
    r.pf != null ? r.pf.toFixed(4) : '',
  ].join(','));
  return [headers.join(','), ...lines].join('\r\n');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const cardStyle = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 60%), #09090f',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 16,
};

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  color: '#fff',
  padding: '10px 14px',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
  colorScheme: 'dark' as const,
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-0.5 h-3.5 rounded-full" style={{ background: '#3b82f6' }} />
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#4a4a5a' }}>{children}</span>
    </div>
  );
}

export default function ExportPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [status, setStatus] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Reading[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  useEffect(() => {
    fetchDevices().then((list: Device[]) => {
      setDevices(Array.isArray(list) ? list : []);
      if (list?.length > 0) setSelectedDeviceId(list[0].id);
    });
  }, []);

  const validate = (): string | null => {
    if (!start) return 'Start date is required.';
    if (!end) return 'End date is required.';
    if (end < start) return 'End date must be on or after start date.';
    return null;
  };

  const handleExport = async () => {
    if (!selectedDeviceId) { setStatus({ type: 'error', text: 'No device selected.' }); return; }
    const err = validate();
    if (err) { setStatus({ type: 'error', text: err }); return; }

    setLoading(true);
    setStatus(null);
    setPreview([]);

    const selectedDevice = devices.find(d => d.id === selectedDeviceId);
    const isLegacy = selectedDevice?.device_key === 'esp32-legacy-default';
    const readingSource = (isLegacy || selectedDevice?.data_mode === 'device') ? 'hardware' : 'simulation';

    try {
      const rows: Reading[] = await fetchExport(start, end, selectedDeviceId || undefined, readingSource);

      if (!rows.length) {
        setStatus({ type: 'info', text: `No readings found between ${start} and ${end}.` });
        setLoading(false);
        return;
      }

      setPreview(rows.slice(0, 5));
      const csv = toCSV(rows);
      const filename = `voltview_export_${start}_to_${end}.csv`;
      downloadCSV(csv, filename);
      setStatus({ type: 'success', text: `Exported ${rows.length} reading${rows.length !== 1 ? 's' : ''} as ${filename}` });
    } catch (e: any) {
      setStatus({ type: 'error', text: e.message || 'Export failed. Is the backend running?' });
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    error:   { background: 'rgba(248,113,113,0.08)',  color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' },
    success: { background: 'rgba(74,222,128,0.08)',   color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' },
    info:    { background: 'rgba(59,130,246,0.08)',   color: '#93c5fd', border: '1px solid rgba(59,130,246,0.2)' },
  };

  return (
    <div className="py-4 sm:py-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#4a4a5a' }}>Data</p>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Export</h1>
      </div>

      {devices.length === 0 ? (
        <div className="p-4 sm:p-6" style={cardStyle}>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full mb-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <p className="text-sm font-medium text-white mb-1">No devices available</p>
            <p className="text-xs" style={{ color: '#4a4a5a' }}>Add a device from the dashboard first.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="p-4 sm:p-6 mb-4" style={cardStyle}>
            <SectionLabel>Configure Export</SectionLabel>

            <div className="mb-4">
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#4a4a5a' }}>Device</label>
              <select
                value={selectedDeviceId}
                onChange={e => setSelectedDeviceId(e.target.value)}
                style={inputStyle}
              >
                {devices.map(d => (
                  <option key={d.id} value={d.id}>{d.device_name}</option>
                ))}
              </select>
              {(() => {
                const sel = devices.find(d => d.id === selectedDeviceId);
                if (!sel) return null;
                const isLegacy = sel.device_key === 'esp32-legacy-default';
                const src = (isLegacy || sel.data_mode === 'device') ? 'hardware' : 'simulation';
                return (
                  <p className="text-[10px] mt-1.5 font-medium" style={{ color: src === 'hardware' ? '#60a5fa' : '#a78bfa' }}>
                    {src === 'hardware' ? 'Exporting hardware readings only' : 'Exporting simulation readings'}
                  </p>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#4a4a5a' }}>Start Date</label>
                <input
                  type="date"
                  value={start}
                  max={today}
                  onChange={e => { setStart(e.target.value); setStatus(null); }}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#4a4a5a' }}>End Date</label>
                <input
                  type="date"
                  value={end}
                  max={today}
                  onChange={e => { setEnd(e.target.value); setStatus(null); }}
                  style={inputStyle}
                />
              </div>
            </div>

            {status && (
              <div className="mb-5 px-4 py-3 rounded-lg text-sm" style={{ ...statusColors[status.type], borderRadius: 10 }}>
                {status.text}
              </div>
            )}

            <button
              onClick={handleExport}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg font-semibold text-sm transition-all"
              style={{
                background: loading ? 'rgba(255,255,255,0.06)' : '#ffffff',
                color: loading ? 'rgba(255,255,255,0.3)' : '#0a0a0f',
                border: loading ? '1px solid rgba(255,255,255,0.08)' : 'none',
                boxShadow: loading ? 'none' : '0 0 20px rgba(255,255,255,0.12)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}>
              {loading ? 'Fetching data…' : 'Export as CSV'}
            </button>
          </div>

          {preview.length > 0 && (
            <div className="mb-4" style={{ ...cardStyle, overflow: 'hidden' }}>
              <div className="px-4 sm:px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-0.5 h-3.5 rounded-full" style={{ background: '#3b82f6' }} />
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#4a4a5a' }}>Preview</span>
                <span className="text-[10px] ml-1" style={{ color: '#333' }}>First {preview.length} rows</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[500px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Timestamp', 'Voltage (V)', 'Current (A)', 'Power (W)', 'Freq (Hz)', 'PF'].map(h => (
                        <th key={h} className="text-left px-4 py-3 font-semibold uppercase tracking-widest" style={{ color: '#4a4a5a', fontSize: '10px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-4 py-2.5" style={{ color: '#888' }}>{new Date(r.timestamp).toLocaleString()}</td>
                        <td className="px-4 py-2.5 font-medium" style={{ color: '#ccc' }}>{r.voltage?.toFixed(1)}</td>
                        <td className="px-4 py-2.5 font-medium" style={{ color: '#ccc' }}>{r.current?.toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-medium" style={{ color: '#ccc' }}>{r.power?.toFixed(1)}</td>
                        <td className="px-4 py-2.5" style={{ color: '#555' }}>{r.frequency?.toFixed(1) ?? '—'}</td>
                        <td className="px-4 py-2.5" style={{ color: '#555' }}>{r.pf?.toFixed(2) ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-xl px-4 py-3.5 text-xs"
            style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)', borderLeft: '3px solid rgba(59,130,246,0.5)', color: '#4a5a7a' }}>
            <strong style={{ color: '#3b82f6' }}>Note:</strong> Timestamps are stored in UTC. The date range covers midnight-to-midnight UTC for each selected day.
            The file will be named <code style={{ color: '#5a6a8a' }}>voltview_export_YYYY-MM-DD_to_YYYY-MM-DD.csv</code>.
          </div>
        </>
      )}
    </div>
  );
}
