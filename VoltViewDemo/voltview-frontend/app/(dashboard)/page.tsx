'use client';
import { useEffect, useState, useCallback } from 'react';
import { fetchLatest, fetchReadings, getDeviceState } from '@/lib/api';

type Reading = { id: number; timestamp: string; voltage: number; current: number; power: number; };
type DeviceState = 'online' | 'offline' | 'none';

export default function Dashboard() {
  const [latest, setLatest] = useState<Reading | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [deviceState, setDeviceState] = useState<DeviceState>('none');

  const refresh = useCallback(async () => {
    const data = await fetchLatest();
    const state = getDeviceState(data);
    setDeviceState(state);
    if (state === 'online') {
      setLatest(data);
      const hist = await fetchReadings();
      setReadings(Array.isArray(hist) ? hist.slice(0, 10) : []);
    } else {
      setLatest(null);
      setReadings([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const voltage = latest?.voltage ?? 0;
  const current = latest?.current ?? 0;
  const power = latest?.power ?? 0;
  const usage = readings.length
    ? (readings.reduce((s, r) => s + (r.power ?? 0), 0) / readings.length / 1000).toFixed(2)
    : '0.00';

  const indicatorColor = deviceState === 'online' ? '#4ade80' : deviceState === 'offline' ? '#facc15' : '#555';
  const indicatorBorder = deviceState === 'online' ? 'rgba(74,222,128,0.4)' : deviceState === 'offline' ? 'rgba(250,204,21,0.4)' : '#2a2a2a';
  const indicatorLabel = deviceState === 'online' ? 'Online' : deviceState === 'offline' ? 'Offline' : 'No Device';

  const tiles = [
    { label: "Today's Usage", value: `${usage} kWh` },
    { label: 'Peak Power', value: `${power.toFixed(2)} W` },
    { label: 'Avg Voltage', value: `${voltage.toFixed(1)} V` },
    { label: 'Current', value: `${current.toFixed(2)} A` },
  ];

  return (
    <div className="py-4 sm:py-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
          style={{ background: '#111', border: `1px solid ${indicatorBorder}` }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: indicatorColor }} />
          <span className="text-[#aaa]">{indicatorLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {tiles.map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4 sm:p-5 border" style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }}>
            <div className="text-xs text-[#888] mb-1.5 sm:mb-2 font-medium leading-tight">{label}</div>
            <div className="text-xl sm:text-2xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }}>
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b text-sm font-semibold text-white" style={{ borderColor: '#1a1a1a' }}>
          Live Readings
        </div>
        {readings.length === 0 ? (
          <div className="text-center text-[#555] py-10 text-sm">No device connected</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr style={{ background: '#111', borderBottom: '1px solid #1a1a1a' }}>
                  {['Time', 'Voltage (V)', 'Current (A)', 'Power (W)'].map(h => (
                    <th key={h} className="text-left px-3 sm:px-4 py-2 text-[#888] text-xs font-medium uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {readings.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-[#0d0d0d] transition-colors" style={{ borderColor: '#111' }}>
                    <td className="px-3 sm:px-4 py-2.5 text-[#ccc]">{new Date(r.timestamp).toLocaleTimeString()}</td>
                    <td className="px-3 sm:px-4 py-2.5 text-[#ccc]">{r.voltage?.toFixed(1)}</td>
                    <td className="px-3 sm:px-4 py-2.5 text-[#ccc]">{r.current?.toFixed(2)}</td>
                    <td className="px-3 sm:px-4 py-2.5 text-[#ccc]">{r.power?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
