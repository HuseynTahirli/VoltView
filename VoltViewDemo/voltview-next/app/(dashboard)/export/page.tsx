'use client';
import { useState } from 'react';
import { fetchExport } from '@/lib/api';

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

export default function ExportPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [status, setStatus] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Reading[]>([]);

  const validate = (): string | null => {
    if (!start) return 'Start date is required.';
    if (!end) return 'End date is required.';
    if (end < start) return 'End date must be on or after start date.';
    return null;
  };

  const handleExport = async () => {
    const err = validate();
    if (err) { setStatus({ type: 'error', text: err }); return; }

    setLoading(true);
    setStatus(null);
    setPreview([]);

    try {
      const rows: Reading[] = await fetchExport(start, end);

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

  const inputStyle = {
    background: '#111',
    border: '1px solid #2a2a2a',
    borderRadius: 8,
    color: '#fff',
    padding: '10px 14px',
    fontSize: '0.9rem',
    outline: 'none',
    colorScheme: 'dark' as const,
  };

  const statusColors = {
    error:   { background: 'rgba(239,68,68,0.1)',   color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
    success: { background: 'rgba(74,222,128,0.1)',  color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
    info:    { background: 'rgba(59,130,246,0.08)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' },
  };

  return (
    <div className="py-4 sm:py-6 max-w-2xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Export Data</h1>
      <p className="text-sm text-[#555] mb-6">Download a CSV of readings for any date range.</p>

      <div className="rounded-xl border p-4 sm:p-6 mb-4" style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }}>
        <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wide">Select Date Range</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5 uppercase tracking-wide">Start Date</label>
            <input
              type="date"
              value={start}
              max={today}
              onChange={e => { setStart(e.target.value); setStatus(null); }}
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5 uppercase tracking-wide">End Date</label>
            <input
              type="date"
              value={end}
              max={today}
              onChange={e => { setEnd(e.target.value); setStatus(null); }}
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>
        </div>

        {status && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={statusColors[status.type]}>
            {status.text}
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={loading}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer transition-colors"
          style={{ background: loading ? '#222' : '#fff', color: loading ? '#555' : '#000', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Fetching data...' : 'Export as CSV'}
        </button>
      </div>

      {preview.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }}>
          <div className="px-4 sm:px-5 py-3 border-b" style={{ borderColor: '#1a1a1a' }}>
            <span className="text-sm font-semibold text-white">Preview</span>
            <span className="text-xs text-[#555] ml-2">First {preview.length} rows of exported data</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[500px]">
              <thead>
                <tr style={{ background: '#111', borderBottom: '1px solid #1a1a1a' }}>
                  {['Timestamp', 'Voltage (V)', 'Current (A)', 'Power (W)', 'Freq (Hz)', 'PF'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-[#888] font-medium uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map(r => (
                  <tr key={r.id} className="border-b" style={{ borderColor: '#111' }}>
                    <td className="px-3 py-2 text-[#ccc]">{new Date(r.timestamp).toLocaleString()}</td>
                    <td className="px-3 py-2 text-[#ccc]">{r.voltage?.toFixed(1)}</td>
                    <td className="px-3 py-2 text-[#ccc]">{r.current?.toFixed(2)}</td>
                    <td className="px-3 py-2 text-[#ccc]">{r.power?.toFixed(1)}</td>
                    <td className="px-3 py-2 text-[#555]">{r.frequency?.toFixed(1) ?? '—'}</td>
                    <td className="px-3 py-2 text-[#555]">{r.pf?.toFixed(2) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg p-4 text-xs text-[#555]"
        style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)', borderLeft: '3px solid #3b82f6' }}>
        <strong className="text-[#3b82f6]">Note:</strong> Timestamps are stored in UTC. The date range covers midnight-to-midnight UTC for each selected day.
        The file will be named <code className="text-[#888]">voltview_export_YYYY-MM-DD_to_YYYY-MM-DD.csv</code>.
      </div>
    </div>
  );
}
