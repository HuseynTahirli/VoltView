'use client';
import { useEffect, useState, useCallback } from 'react';
import { fetchLatest, fetchReadings, fetchWeekReadings, getDeviceState, unlockDevice, lockDevice } from '@/lib/api';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

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
type DeviceState = 'online' | 'offline' | 'none';

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtFull(ts: string) {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', color: '#ccc' }}>
      <p className="mb-1 text-[#555]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

// Flat zero-line shown when device is offline / no data
const ZERO_DATA = Array.from({ length: 12 }, (_, i) => ({
  t: '', voltage: 0, current: 0, power: 0, pf: 0,
}));

function MiniChart({
  data, dataKey, color, unit, name, offline,
}: {
  data: any[]; dataKey: string; color: string; unit: string; name: string; offline?: boolean;
}) {
  const chartData = offline || data.length < 2 ? ZERO_DATA : data;
  const lineColor = offline || data.length < 2 ? '#2a2a2a' : color;

  return (
    <div className="rounded-xl border p-4 sm:p-5" style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-[#888] uppercase tracking-wide">{name}</span>
        <span className="text-xs text-[#555]">{unit}</span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
          <XAxis
            dataKey="t"
            tick={{ fontSize: 9, fill: '#444' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#555' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          {!offline && data.length >= 2 && <Tooltip content={<ChartTooltip />} />}
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            name={name}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Dashboard() {
  const [latest, setLatest] = useState<Reading | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [chartReadings, setChartReadings] = useState<Reading[]>([]);
  const [weekReadings, setWeekReadings] = useState<Reading[]>([]);
  const [deviceState, setDeviceState] = useState<DeviceState>('none');
  const [initialLoad, setInitialLoad] = useState(true);
  const [deviceLocked, setDeviceLocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const refresh = useCallback(async () => {
    const [data, hist] = await Promise.all([
      fetchLatest(),
      fetchReadings(20),
    ]);

    // If backend says device is locked, show locked state
    if (data && data.deviceLocked === true) {
      setDeviceLocked(true);
      setDeviceState('offline');
      setLatest(null);
      setReadings([]);
      setChartReadings([]);
      setInitialLoad(false);
      return;
    }

    setDeviceLocked(false);
    const state = getDeviceState(data);
    setDeviceState(state);

    const arr = Array.isArray(hist) ? hist : [];

    if (state === 'online') {
      setLatest(data);
      setReadings(arr);
      setChartReadings(arr);
    } else {
      setLatest(null);
      setReadings([]);
      setChartReadings([]);
    }

    setInitialLoad(false);
  }, []);

  const handleUnlock = async () => {
    setPinLoading(true);
    setPinError('');
    const res = await unlockDevice(pin);
    setPinLoading(false);
    if (res.ok) {
      setShowPinModal(false);
      setPin('');
      refresh();
    } else {
      setPinError(res.message || 'Invalid PIN');
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    fetchWeekReadings().then(d => setWeekReadings(Array.isArray(d) ? d : []));
  }, []);

  // Metric calculations
  const voltage = latest?.voltage ?? 0;
  const current = latest?.current ?? 0;
  const power = latest?.power ?? 0;

  const peakPower = readings.length ? Math.max(...readings.map(r => r.power ?? 0)) : 0;
  const avgVoltage = readings.length
    ? readings.reduce((s, r) => s + (r.voltage ?? 0), 0) / readings.length
    : 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayReadings = weekReadings.filter(r => r.timestamp?.slice(0, 10) === todayStr);
  const todayUsage = todayReadings.length
    ? todayReadings.reduce((s, r) => s + (r.energy ?? 0), 0)
    : 0;

  const indicatorColor = deviceLocked ? '#ef4444' : deviceState === 'online' ? '#4ade80' : deviceState === 'offline' ? '#facc15' : '#555';
  const indicatorBorder = deviceLocked ? 'rgba(239,68,68,0.4)' : deviceState === 'online' ? 'rgba(74,222,128,0.4)' : deviceState === 'offline' ? 'rgba(250,204,21,0.4)' : '#2a2a2a';
  const indicatorLabel = deviceLocked ? 'Device Locked' : deviceState === 'online' ? 'Device Online' : deviceState === 'offline' ? 'Device Offline' : 'No Device Connected';

  const tiles = [
    { label: "Today's Usage", value: `${todayUsage.toFixed(3)} kWh`, tip: "Total energy consumed today" },
    { label: 'Peak Power', value: `${peakPower.toFixed(1)} W`, tip: "Highest power reading in last 20 samples" },
    { label: 'Avg Voltage', value: `${avgVoltage.toFixed(1)} V`, tip: "Average voltage across last 20 readings" },
    { label: 'Current', value: `${current.toFixed(2)} A`, tip: "Latest current reading" },
  ];

  // Chart data: sorted oldest→newest so line always flows left to right
  const chartData = chartReadings
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(r => ({
      t: fmtTime(r.timestamp),
      voltage: parseFloat((r.voltage ?? 0).toFixed(1)),
      current: parseFloat((r.current ?? 0).toFixed(2)),
      power: parseFloat((r.power ?? 0).toFixed(1)),
      pf: parseFloat((r.pf ?? 0).toFixed(2)),
    }));

  const deviceOffline = deviceState !== 'online';

  // Last week grouped by day
  const weekByDay = weekReadings.reduce<Record<string, Reading[]>>((acc, r) => {
    const day = r.timestamp?.slice(0, 10) ?? 'unknown';
    if (!acc[day]) acc[day] = [];
    acc[day].push(r);
    return acc;
  }, {});

  return (
    <>
      <div className="py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: '#111', border: `1px solid ${indicatorBorder}` }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: indicatorColor }} />
            <span className="text-[#aaa]">{indicatorLabel}</span>
          </div>
          {deviceLocked ? (
            <button
              onClick={() => { setShowPinModal(true); setPinError(''); setPin(''); }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }}>
              🔒 Unlock
            </button>
          ) : (
            <button
              onClick={async () => { await lockDevice(); refresh(); }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{ background: '#111', border: '1px solid #222', color: '#555' }}>
              🔓 Lock
            </button>
          )}
        </div>
      </div>

      {/* Device Locked Banner */}
      {deviceLocked && (
        <div className="rounded-xl border p-6 mb-6 text-center" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
          <div className="text-4xl mb-3">🔒</div>
          <div className="text-white font-semibold mb-1">Live Data Locked</div>
          <div className="text-sm text-[#888] mb-4">Live readings are only available on the authorized device. Enter the device PIN to unlock.</div>
          <button
            onClick={() => { setShowPinModal(true); setPinError(''); setPin(''); }}
            className="px-6 py-2.5 rounded-lg font-semibold text-sm"
            style={{ background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Enter Device PIN
          </button>
        </div>
      )}

      {/* Metric tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {tiles.map(({ label, value, tip }) => (
          <div key={label} className="rounded-xl p-4 sm:p-5 border relative group"
            style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }}>
            <div className="flex items-center gap-1 mb-1.5">
              <span className="text-xs text-[#888] font-medium leading-tight">{label}</span>
              <span className="relative cursor-default">
                <span className="text-[10px] text-[#444] hover:text-[#888] transition-colors select-none">ⓘ</span>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-36 text-center text-[10px] text-[#ccc] bg-[#111] border border-[#2a2a2a] rounded px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-normal">
                  {tip}
                </span>
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Live charts — always rendered, always fed from real Supabase history */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wide">Live Trends</h2>
          {deviceState === 'online' && (
            <span className="text-[10px] text-[#4ade80] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse inline-block" />
              Live · updates every 5s
            </span>
          )}
        </div>

        {initialLoad ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {['Power', 'Voltage', 'Current'].map(n => (
              <div key={n} className="rounded-xl border p-4 animate-pulse"
                style={{ background: '#0a0a0a', borderColor: '#1a1a1a', height: 220 }}>
                <div className="h-3 w-16 rounded mb-3" style={{ background: '#1a1a1a' }} />
                <div className="h-40 rounded" style={{ background: '#111' }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <MiniChart data={chartData} dataKey="power" color="#3b82f6" unit="W" name="Power" offline={deviceOffline} />
            <MiniChart data={chartData} dataKey="voltage" color="#facc15" unit="V" name="Voltage" offline={deviceOffline} />
            <MiniChart data={chartData} dataKey="current" color="#4ade80" unit="A" name="Current" offline={deviceOffline} />
          </div>
        )}
      </div>

      {/* Live readings table */}
      <div className="rounded-xl border overflow-hidden mb-6" style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }}>
        <div className="px-4 sm:px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: '#1a1a1a' }}>
          <span className="text-sm font-semibold text-white">Live Readings</span>
          {deviceState === 'online' && (
            <span className="text-[10px] text-[#4ade80] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse inline-block" />
              Updating every 5s
            </span>
          )}
        </div>
        {readings.length === 0 ? (
          <div className="text-center text-[#555] py-10 text-sm">No device connected</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr style={{ background: '#111', borderBottom: '1px solid #1a1a1a' }}>
                  {['Date & Time', 'Voltage (V)', 'Current (A)', 'Power (W)', 'Freq (Hz)', 'PF'].map(h => (
                    <th key={h} className="text-left px-3 sm:px-4 py-2 text-[#888] text-xs font-medium uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...readings].reverse().map(r => (
                  <tr key={r.id} className="border-b hover:bg-[#0d0d0d] transition-colors" style={{ borderColor: '#111' }}>
                    <td className="px-3 sm:px-4 py-2.5 text-[#ccc]">{fmtFull(r.timestamp)}</td>
                    <td className="px-3 sm:px-4 py-2.5 text-[#ccc]">{r.voltage?.toFixed(1)}</td>
                    <td className="px-3 sm:px-4 py-2.5 text-[#ccc]">{r.current?.toFixed(2)}</td>
                    <td className="px-3 sm:px-4 py-2.5 text-[#ccc]">{r.power?.toFixed(1)}</td>
                    <td className="px-3 sm:px-4 py-2.5 text-[#555]">{r.frequency?.toFixed(1) ?? '—'}</td>
                    <td className="px-3 sm:px-4 py-2.5 text-[#555]">{r.pf?.toFixed(2) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Last week section */}
      <div className="rounded-xl border overflow-hidden" style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }}>
        <div className="px-4 sm:px-5 py-3 border-b" style={{ borderColor: '#1a1a1a' }}>
          <span className="text-sm font-semibold text-white">Last 7 Days</span>
          <span className="text-xs text-[#555] ml-2">Daily averages</span>
        </div>
        {Object.keys(weekByDay).length === 0 ? (
          <div className="text-center text-[#555] py-8 text-sm">No data for the past week</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr style={{ background: '#111', borderBottom: '1px solid #1a1a1a' }}>
                  {['Date', 'Readings', 'Avg Voltage (V)', 'Avg Power (W)', 'Total Energy (kWh)'].map(h => (
                    <th key={h} className="text-left px-3 sm:px-4 py-2 text-[#888] text-xs font-medium uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(weekByDay).sort(([a], [b]) => b.localeCompare(a)).map(([day, rows]) => {
                  const avgV = rows.reduce((s, r) => s + (r.voltage ?? 0), 0) / rows.length;
                  const avgP = rows.reduce((s, r) => s + (r.power ?? 0), 0) / rows.length;
                  const totalE = rows.reduce((s, r) => s + (r.energy ?? 0), 0);
                  return (
                    <tr key={day} className="border-b hover:bg-[#0d0d0d] transition-colors" style={{ borderColor: '#111' }}>
                      <td className="px-3 sm:px-4 py-2.5 text-[#ccc] font-medium">{day}</td>
                      <td className="px-3 sm:px-4 py-2.5 text-[#555]">{rows.length}</td>
                      <td className="px-3 sm:px-4 py-2.5 text-[#ccc]">{avgV.toFixed(1)}</td>
                      <td className="px-3 sm:px-4 py-2.5 text-[#ccc]">{avgP.toFixed(1)}</td>
                      <td className="px-3 sm:px-4 py-2.5 text-[#ccc]">{totalE.toFixed(3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

    {/* PIN Modal */}
    {showPinModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
        <div className="rounded-2xl p-8 w-full max-w-sm mx-4" style={{ background: '#0a0a0a', border: '1px solid #2a2a2a' }}>
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="text-lg font-bold text-white mb-1">Device PIN</h2>
            <p className="text-sm text-[#666]">Enter the device PIN to access live readings.</p>
          </div>
          <input
            type="password"
            placeholder="Enter PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            className="w-full rounded-lg px-4 py-3 text-sm mb-3 outline-none text-center tracking-widest text-lg font-mono"
            style={{ background: '#111', border: '1px solid #333', color: '#fff' }}
            autoFocus
          />
          {pinError && (
            <p className="text-xs text-red-400 text-center mb-3">{pinError}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setShowPinModal(false)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: '#1a1a1a', color: '#888', border: '1px solid #2a2a2a', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={handleUnlock}
              disabled={pinLoading || !pin}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: pinLoading || !pin ? '#333' : '#4ade80', color: '#000', border: 'none', cursor: pinLoading || !pin ? 'not-allowed' : 'pointer' }}>
              {pinLoading ? 'Checking...' : 'Unlock'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
