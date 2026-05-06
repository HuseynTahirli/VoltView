'use client';
import { useEffect, useState, useCallback } from 'react';
import { fetchLatest, fetchReadings, fetchWeekReadings, fetchDevices, createDevice, updateDeviceMode, generateDemoReading, getDeviceState } from '@/lib/api';
import { Toggle, GooeyFilter } from '@/components/ui/liquid-toggle';
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
type Device = { id: string; device_name: string; device_key: string; location?: string; data_mode: string };

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtFull(ts: string) {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs shadow-xl"
      style={{ background: 'rgba(8,8,14,0.97)', border: '1px solid rgba(255,255,255,0.09)', color: '#ccc' }}>
      <p className="mb-1.5 text-[10px] uppercase tracking-wide" style={{ color: '#3a3a4a' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong style={{ color: '#e8e8e8' }}>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// Flat zero-line shown when device is offline / no data
const ZERO_DATA = Array.from({ length: 12 }, () => ({
  t: '', voltage: 0, current: 0, power: 0, pf: 0,
}));

function MiniChart({
  data, dataKey, color, unit, name, offline,
}: {
  data: any[]; dataKey: string; color: string; unit: string; name: string; offline?: boolean;
}) {
  const chartData = offline || data.length < 2 ? ZERO_DATA : data;
  const lineColor = offline || data.length < 2 ? '#1e1e28' : color;
  const hasData = !offline && data.length >= 2;

  return (
    <div className="rounded-xl border p-4 sm:p-5 transition-all duration-300 hover:border-white/[0.11]"
      style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.028) 0%, rgba(255,255,255,0) 55%), #09090f',
        borderColor: 'rgba(255,255,255,0.07)',
      }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#4a4a5a' }}>{name}</span>
        <span className="text-[10px] font-mono" style={{ color: '#30303e' }}>{unit}</span>
      </div>
      <div style={{ filter: hasData ? `drop-shadow(0 0 6px ${color}33)` : 'none' }}>
        <ResponsiveContainer width="100%" height={155}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 5" stroke="rgba(255,255,255,0.035)" vertical={false} />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 8, fill: '#2e2e3a' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#36363f' }}
              tickLine={false}
              axisLine={false}
              width={38}
            />
            {hasData && <Tooltip content={<ChartTooltip />} />}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={lineColor}
              strokeWidth={2.5}
              dot={false}
              name={name}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Shared empty state component ─────────────────────────────────────────────
function EmptyState({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-8 h-8 rounded-full mb-3 flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ color: '#3a3a4a', fontSize: 14 }}>—</span>
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: '#4a4a5a' }}>{title}</p>
      <p className="text-xs max-w-xs" style={{ color: '#333340' }}>{sub}</p>
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
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [modeChanging, setModeChanging] = useState(false);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceLocation, setNewDeviceLocation] = useState('');
  const [addDeviceError, setAddDeviceError] = useState('');
  const [addDeviceLoading, setAddDeviceLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!selectedDeviceId) {
      setLatest(null);
      setReadings([]);
      setChartReadings([]);
      setWeekReadings([]);
      setDeviceState('none');
      setInitialLoad(false);
      return;
    }
    const deviceId = selectedDeviceId;
    const selectedDevice = devices.find(d => d.id === deviceId);
    const isLegacyHardware = selectedDevice?.device_key === 'esp32-legacy-default';
    const dataMode = selectedDevice?.data_mode ?? 'simulation';
    // Both real hardware (Legacy) and user devices in Device Mode use hardware readings
    // with a strict recent-data window. Simulation Mode uses generated readings with a
    // 7-day window so historical demo data always shows.
    const readingSource = (isLegacyHardware || dataMode === 'device') ? 'hardware' : 'simulation';
    const useStrictWindow = isLegacyHardware || dataMode === 'device';

    const [data, hist, week] = await Promise.all([
      fetchLatest(deviceId, readingSource),
      fetchReadings(20, deviceId, readingSource),
      fetchWeekReadings(deviceId, readingSource),
    ]);

    const arr = Array.isArray(hist) ? hist : [];
    const weekArr = Array.isArray(week) ? week : [];

    if (useStrictWindow) {
      // Strict 15 s threshold — show nothing when not actively streaming
      const state = getDeviceState(data);
      setDeviceState(state);
      if (state === 'online') {
        setLatest(data);
        setReadings(arr);
        setChartReadings(arr);
        setWeekReadings(weekArr);
      } else {
        setLatest(null);
        setReadings([]);
        setChartReadings([]);
        setWeekReadings([]);
      }
    } else {
      // Simulation Mode: 7-day window, always show historical readings
      const latestReading: Reading | null =
        data ?? (arr.length > 0 ? arr[arr.length - 1] : null);
      let state: DeviceState = 'none';
      if (latestReading?.timestamp) {
        const ageMs = Date.now() - new Date(latestReading.timestamp).getTime();
        state = ageMs <= 7 * 24 * 60 * 60 * 1000 ? 'online' : 'offline';
      }
      setDeviceState(state);
      setLatest(latestReading);
      setReadings(arr);
      setChartReadings(arr);
      setWeekReadings(weekArr);
    }

    setInitialLoad(false);
  }, [selectedDeviceId, devices]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  // For software/demo devices: insert a new reading every 5 s so the dashboard
  // visibly updates during presentation. Never runs for ESP32 (Legacy).
  useEffect(() => {
    if (!selectedDeviceId) return;
    const selectedDevice = devices.find(d => d.id === selectedDeviceId);
    if (!selectedDevice || selectedDevice.device_key === 'esp32-legacy-default' || selectedDevice.data_mode !== 'simulation') return;

    const id = setInterval(async () => {
      await generateDemoReading(selectedDeviceId);
      refresh();
    }, 5000);

    return () => clearInterval(id);
  }, [selectedDeviceId, devices, refresh]);

  useEffect(() => {
    fetchDevices().then((list: Device[]) => {
      setDevices(Array.isArray(list) ? list : []);
      if (list?.length > 0) setSelectedDeviceId(list[0].id);
    });
  }, []);

  // ── Metric calculations ── (unchanged)
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

  // ── Derived device identity — must come before status chip and empty-state logic ──
  const selectedDevice = devices.find(d => d.id === selectedDeviceId);
  const isLegacy = selectedDevice?.device_key === 'esp32-legacy-default';
  const inDeviceMode = !isLegacy && selectedDevice?.data_mode === 'device';

  // Status chip appearance — simulation devices get cyan styling and distinct label
  // so they are never confused with real hardware being online.
  const isSimMode = !isLegacy && selectedDevice?.data_mode === 'simulation';
  const isSimActive = isSimMode && deviceState === 'online';

  const indicatorColor = isSimActive ? '#22d3ee'
    : deviceState === 'online'  ? '#4ade80'
    : deviceState === 'offline' ? '#facc15'
    : '#2a2a35';
  const indicatorBg = isSimActive ? 'rgba(34,211,238,0.07)'
    : deviceState === 'online'  ? 'rgba(74,222,128,0.07)'
    : 'rgba(255,255,255,0.03)';
  const indicatorBorder = isSimActive ? 'rgba(34,211,238,0.22)'
    : deviceState === 'online'  ? 'rgba(74,222,128,0.3)'
    : deviceState === 'offline' ? 'rgba(250,204,21,0.25)'
    : 'rgba(255,255,255,0.06)';
  const indicatorGlow = isSimActive ? '0 0 14px rgba(34,211,238,0.08)'
    : deviceState === 'online'  ? '0 0 14px rgba(74,222,128,0.08)'
    : 'none';
  const indicatorTextColor = isSimActive ? '#67e8f9'
    : deviceState === 'online'  ? '#6ee7a0'
    : '#555';
  const indicatorLabel = isSimActive ? 'Simulation Active'
    : deviceState === 'online'  ? 'Device Online'
    : deviceState === 'offline' ? 'Device Offline'
    : 'No Device';

  const tiles = [
    { label: "Today's Usage", value: `${todayUsage.toFixed(3)} kWh`, tip: "Total energy consumed today" },
    { label: 'Peak Power',    value: `${peakPower.toFixed(1)} W`,   tip: "Highest power reading in last 20 samples" },
    { label: 'Avg Voltage',   value: `${avgVoltage.toFixed(1)} V`,  tip: "Average voltage across last 20 readings" },
    { label: 'Current',       value: `${current.toFixed(2)} A`,     tip: "Latest current reading" },
  ];

  // Chart data: sorted oldest→newest so line always flows left to right
  const chartData = chartReadings
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(r => ({
      t: fmtTime(r.timestamp),
      voltage: parseFloat((r.voltage ?? 0).toFixed(1)),
      current: parseFloat((r.current ?? 0).toFixed(2)),
      power:   parseFloat((r.power   ?? 0).toFixed(1)),
      pf:      parseFloat((r.pf      ?? 0).toFixed(2)),
    }));

  const deviceOffline = deviceState !== 'online';

  const handleAddDevice = async () => {
    if (!newDeviceName.trim()) { setAddDeviceError('Device name is required.'); return; }
    setAddDeviceError('');
    setAddDeviceLoading(true);
    try {
      const res = await createDevice(newDeviceName.trim(), newDeviceLocation.trim() || undefined);
      if (res.ok && res.device) {
        const list: Device[] = await fetchDevices();
        setDevices(Array.isArray(list) ? list : []);
        setSelectedDeviceId(res.device.id);
        setShowAddDevice(false);
        setNewDeviceName('');
        setNewDeviceLocation('');
      } else {
        setAddDeviceError(res.error || 'Failed to create device.');
      }
    } catch {
      setAddDeviceError('Connection error.');
    } finally {
      setAddDeviceLoading(false);
    }
  };

  const handleModeChange = async (newMode: 'simulation' | 'device') => {
    if (!selectedDeviceId || modeChanging) return;
    const selectedDevice = devices.find(d => d.id === selectedDeviceId);
    if (!selectedDevice || selectedDevice.data_mode === newMode) return;
    setModeChanging(true);
    // Immediately clear stale data so old readings don't show for the new mode
    setLatest(null);
    setReadings([]);
    setChartReadings([]);
    setWeekReadings([]);
    const res = await updateDeviceMode(selectedDeviceId, newMode);
    if (res.ok) {
      setDevices(prev => prev.map(d => d.id === selectedDeviceId ? { ...d, data_mode: newMode } : d));
    }
    setModeChanging(false);
  };

  // Last week grouped by day
  const weekByDay = weekReadings.reduce<Record<string, Reading[]>>((acc, r) => {
    const day = r.timestamp?.slice(0, 10) ?? 'unknown';
    if (!acc[day]) acc[day] = [];
    acc[day].push(r);
    return acc;
  }, {});

  // ── Context-aware empty-state messages ────────────────────────────────────
  const readingsEmpty = !selectedDeviceId
    ? { title: 'No device selected', sub: 'Choose a device from the dropdown above.' }
    : isLegacy
    ? { title: 'Hardware offline', sub: 'No data received from the ESP32 in the last 15 seconds.' }
    : inDeviceMode
    ? { title: 'No hardware signal', sub: 'Device Mode is active. Connect hardware using this device key or switch to Simulation.' }
    : { title: 'No readings yet', sub: 'Readings will appear here as data is collected.' };

  const weekEmpty = !selectedDeviceId
    ? { title: 'No device selected', sub: 'Choose a device to view weekly statistics.' }
    : isLegacy
    ? { title: 'No historical data', sub: 'Hardware must be streaming to record readings.' }
    : inDeviceMode
    ? { title: 'No hardware data', sub: 'No hardware readings found for the past 7 days.' }
    : { title: 'No weekly data', sub: 'Simulation data will accumulate here over time.' };

  // Shared control chip style
  const chipStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    color: '#999',
    fontSize: 12,
    outline: 'none',
    cursor: 'pointer',
    padding: '6px 12px',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    fontWeight: 500,
  };

  const SectionHeading = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-2">
      <div className="w-0.5 h-3 rounded-full" style={{ background: 'rgba(59,130,246,0.5)' }} />
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#4a4a5a' }}>
        {children}
      </span>
    </div>
  );

  return (
    <div className="py-4 sm:py-6 relative">
      <GooeyFilter />

      {/* Ambient background glow */}
      <div aria-hidden="true" className="pointer-events-none absolute top-0 right-0 -z-10 overflow-hidden"
        style={{ width: '55%', height: 320 }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 80% 0%, rgba(59,130,246,0.055) 0%, transparent 68%)',
        }} />
      </div>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start sm:items-center justify-between mb-6 gap-3 flex-col sm:flex-row">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: '#f0f0f0' }}>Dashboard</h1>
          {selectedDevice && (
            <p className="text-[11px] mt-0.5" style={{ color: '#3a3a4a' }}>
              {selectedDevice.device_name}{selectedDevice.location ? ` · ${selectedDevice.location}` : ''}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Device dropdown */}
          {devices.length > 0 && (
            <select
              value={selectedDeviceId}
              onChange={e => setSelectedDeviceId(e.target.value)}
              className="text-xs font-medium transition-colors"
              style={{ ...chipStyle, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
                paddingRight: 28, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23555' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              {devices.map(d => (
                <option key={d.id} value={d.id}>{d.device_name}</option>
              ))}
            </select>
          )}

          {/* Mode toggle — user-created devices only */}
          {selectedDeviceId && (() => {
            const sel = devices.find(d => d.id === selectedDeviceId);
            if (!sel) return null;
            if (sel.device_key === 'esp32-legacy-default') {
              return (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#3b82f6' }} />
                  <span className="text-[11px] font-medium" style={{ color: '#60a5fa' }}>Hardware only</span>
                </div>
              );
            }
            return (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-opacity"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  opacity: modeChanging ? 0.45 : 1,
                }}>
                <span className="text-[11px] font-medium" style={{ color: sel.data_mode === 'simulation' ? '#10b981' : '#444' }}>
                  Simulation
                </span>
                <Toggle
                  checked={sel.data_mode === 'simulation'}
                  onCheckedChange={(c) => handleModeChange(c ? 'simulation' : 'device')}
                  variant="success"
                  disabled={modeChanging}
                />
              </div>
            );
          })()}

          {/* Add Device */}
          <button
            type="button"
            onClick={() => { setShowAddDevice(true); setAddDeviceError(''); }}
            className="text-xs font-medium transition-all hover:border-white/[0.16] hover:text-white"
            style={{ ...chipStyle }}
          >
            + Add Device
          </button>

          {/* Status chip — fixed min-width prevents layout shift when text changes */}
          <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              minWidth: 152,
              background: indicatorBg,
              border: `1px solid ${indicatorBorder}`,
              boxShadow: indicatorGlow,
            }}>
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${deviceState === 'online' ? 'animate-pulse' : ''}`}
              style={{ background: indicatorColor }}
            />
            <span style={{ color: indicatorTextColor }}>{indicatorLabel}</span>
          </div>
        </div>
      </div>

      {/* ── KPI tiles ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-7">
        {tiles.map(({ label, value, tip }) => (
          <div key={label}
            className="rounded-xl p-4 sm:p-5 border relative group cursor-default transition-all duration-300 hover:border-white/[0.13]"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 60%), #09090f',
              borderColor: 'rgba(255,255,255,0.07)',
            }}>
            {/* Top accent line — does not need overflow-hidden, stays within card padding */}
            <div className="absolute top-0 left-6 right-6 h-px"
              style={{ background: 'linear-gradient(to right, transparent, rgba(59,130,246,0.18), transparent)' }} />
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#4a4a5a' }}>
                {label}
              </span>
              <span className="relative">
                <span className="text-[10px] select-none cursor-default" style={{ color: '#2e2e3a' }}>ⓘ</span>
                {/* z-50 ensures tooltip renders above sibling cards; no overflow-hidden parent clips it */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 text-center text-[10px] rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 whitespace-normal shadow-2xl"
                  style={{ background: 'rgba(8,8,14,0.98)', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa' }}>
                  {tip}
                </span>
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: '#f0f0f0', letterSpacing: '-0.02em' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Live Trends ─────────────────────────────────────────────────────── */}
      <div className="mb-7">
        <div className="flex items-center justify-between mb-3">
          <SectionHeading>Live Trends</SectionHeading>
          {deviceState === 'online' && (
            <span className="text-[10px] flex items-center gap-1.5" style={{ color: '#3a8a5a' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: '#4ade80' }} />
              Live · 5s
            </span>
          )}
        </div>

        {initialLoad ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {['Power', 'Voltage', 'Current'].map(n => (
              <div key={n} className="rounded-xl border p-4 animate-pulse"
                style={{ background: '#09090f', borderColor: 'rgba(255,255,255,0.06)', height: 220 }}>
                <div className="h-2 w-14 rounded-full mb-4" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-36 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <MiniChart data={chartData} dataKey="power"   color="#3b82f6" unit="W" name="Power"   offline={deviceOffline} />
            <MiniChart data={chartData} dataKey="voltage" color="#a78bfa" unit="V" name="Voltage" offline={deviceOffline} />
            <MiniChart data={chartData} dataKey="current" color="#34d399" unit="A" name="Current" offline={deviceOffline} />
          </div>
        )}
      </div>

      {/* ── Live Readings table ──────────────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden mb-7 transition-all duration-300 hover:border-white/[0.11]"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%), #09090f',
          borderColor: 'rgba(255,255,255,0.07)',
        }}>
        <div className="px-4 sm:px-5 py-3.5 border-b flex items-center justify-between"
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
          <SectionHeading>Live Readings</SectionHeading>
          {deviceState === 'online' && (
            <span className="text-[10px] flex items-center gap-1.5" style={{ color: '#3a8a5a' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: '#4ade80' }} />
              Updating every 5s
            </span>
          )}
        </div>
        {readings.length === 0 ? (
          <EmptyState title={readingsEmpty.title} sub={readingsEmpty.sub} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Date & Time', 'Voltage (V)', 'Current (A)', 'Power (W)', 'Freq (Hz)', 'PF'].map(h => (
                    <th key={h} className="text-left px-4 sm:px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: '#3a3a4a' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...readings].reverse().map(r => (
                  <tr key={r.id} className="transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-4 sm:px-5 py-3 text-xs" style={{ color: '#888' }}>{fmtFull(r.timestamp)}</td>
                    <td className="px-4 sm:px-5 py-3 text-xs font-mono" style={{ color: '#ccc' }}>{r.voltage?.toFixed(1)}</td>
                    <td className="px-4 sm:px-5 py-3 text-xs font-mono" style={{ color: '#ccc' }}>{r.current?.toFixed(2)}</td>
                    <td className="px-4 sm:px-5 py-3 text-xs font-mono" style={{ color: '#ccc' }}>{r.power?.toFixed(1)}</td>
                    <td className="px-4 sm:px-5 py-3 text-xs font-mono" style={{ color: '#3a3a4a' }}>{r.frequency?.toFixed(1) ?? '—'}</td>
                    <td className="px-4 sm:px-5 py-3 text-xs font-mono" style={{ color: '#3a3a4a' }}>{r.pf?.toFixed(2) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Last 7 Days ──────────────────────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden transition-all duration-300 hover:border-white/[0.11]"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%), #09090f',
          borderColor: 'rgba(255,255,255,0.07)',
        }}>
        <div className="px-4 sm:px-5 py-3.5 border-b flex items-center gap-2"
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
          <SectionHeading>Last 7 Days</SectionHeading>
          <span className="text-[10px]" style={{ color: '#2e2e3a' }}>· daily averages</span>
        </div>
        {Object.keys(weekByDay).length === 0 ? (
          <EmptyState title={weekEmpty.title} sub={weekEmpty.sub} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Date', 'Readings', 'Avg Voltage (V)', 'Avg Power (W)', 'Total Energy (kWh)'].map(h => (
                    <th key={h} className="text-left px-4 sm:px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: '#3a3a4a' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(weekByDay).sort(([a], [b]) => b.localeCompare(a)).map(([day, rows]) => {
                  const avgV  = rows.reduce((s, r) => s + (r.voltage ?? 0), 0) / rows.length;
                  const avgP  = rows.reduce((s, r) => s + (r.power   ?? 0), 0) / rows.length;
                  const totalE = rows.reduce((s, r) => s + (r.energy  ?? 0), 0);
                  return (
                    <tr key={day} className="transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="px-4 sm:px-5 py-3 text-xs font-medium" style={{ color: '#bbb' }}>{day}</td>
                      <td className="px-4 sm:px-5 py-3 text-xs" style={{ color: '#3a3a4a' }}>{rows.length}</td>
                      <td className="px-4 sm:px-5 py-3 text-xs font-mono" style={{ color: '#ccc' }}>{avgV.toFixed(1)}</td>
                      <td className="px-4 sm:px-5 py-3 text-xs font-mono" style={{ color: '#ccc' }}>{avgP.toFixed(1)}</td>
                      <td className="px-4 sm:px-5 py-3 text-xs font-mono" style={{ color: '#ccc' }}>{totalE.toFixed(3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Device Modal ─────────────────────────────────────────────────── */}
      {showAddDevice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddDevice(false); }}
        >
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 60%), #0c0c14',
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            }}>
            <div>
              <h2 className="text-sm font-semibold tracking-wide" style={{ color: '#f0f0f0' }}>Add Device</h2>
              <p className="text-[11px] mt-0.5" style={{ color: '#3a3a4a' }}>Register a new monitored device to your account.</p>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4a4a5a' }}>
                Device Name <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Kitchen ESP32"
                value={newDeviceName}
                onChange={e => { setNewDeviceName(e.target.value); setAddDeviceError(''); }}
                className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#e0e0e0' }}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#4a4a5a' }}>
                Location <span style={{ color: '#2e2e3a' }}>(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Kitchen"
                value={newDeviceLocation}
                onChange={e => setNewDeviceLocation(e.target.value)}
                className="w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#e0e0e0' }}
              />
            </div>

            {addDeviceError && (
              <div className="px-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                {addDeviceError}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowAddDevice(false); setNewDeviceName(''); setNewDeviceLocation(''); setAddDeviceError(''); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#666', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddDevice}
                disabled={addDeviceLoading}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: addDeviceLoading ? 'rgba(255,255,255,0.08)' : '#fff',
                  color: addDeviceLoading ? '#444' : '#0a0a0f',
                  border: 'none',
                  cursor: addDeviceLoading ? 'not-allowed' : 'pointer',
                  boxShadow: addDeviceLoading ? 'none' : '0 0 20px rgba(255,255,255,0.08)',
                }}>
                {addDeviceLoading ? 'Saving…' : 'Save Device'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
