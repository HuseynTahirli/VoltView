'use client';
import { useEffect, useState } from 'react';
import { fetchThresholds, saveThresholds, fetchEmailSettings, saveEmailSettings, fetchDevices, deleteDevice } from '@/lib/api';

type ThresholdRow = { id: number; key: string; value: number; label?: string };
type Device = { id: string; device_name: string; device_key: string; location?: string };

const KEY_LABELS: Record<string, string> = {
  power_max: 'Max Power (W)',
  voltage_max: 'Max Voltage (V)',
  voltage_min: 'Min Voltage (V)',
  current_max: 'Max Current (A)',
};

function getLoggedInEmail(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(^|;\s*)voltview_token=([^;]+)/);
  return match ? decodeURIComponent(match[2]) : '';
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
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-0.5 h-3.5 rounded-full" style={{ background: '#3b82f6' }} />
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#4a4a5a' }}>{children}</span>
    </div>
  );
}

function PrimaryButton({ onClick, disabled, saved, label, savedLabel }: {
  onClick: () => void;
  disabled?: boolean;
  saved?: boolean;
  label: string;
  savedLabel: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-6 py-2.5 rounded-lg font-semibold text-sm transition-all"
      style={{
        background: saved ? 'rgba(74,222,128,0.15)' : disabled ? 'rgba(255,255,255,0.06)' : '#ffffff',
        color: saved ? '#4ade80' : disabled ? 'rgba(255,255,255,0.3)' : '#0a0a0f',
        border: saved ? '1px solid rgba(74,222,128,0.25)' : disabled ? '1px solid rgba(255,255,255,0.08)' : 'none',
        boxShadow: saved || disabled ? 'none' : '0 0 20px rgba(255,255,255,0.12)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}>
      {saved ? savedLabel : label}
    </button>
  );
}

export default function SettingsPage() {
  const [thresholds, setThresholds] = useState<ThresholdRow[]>([]);
  const [email, setEmail] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [savedThresholds, setSavedThresholds] = useState(false);
  const [savedEmail, setSavedEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(true);

  const [devices, setDevices] = useState<Device[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const userEmail = getLoggedInEmail();
    Promise.all([fetchThresholds(), fetchEmailSettings(userEmail), fetchDevices()]).then(([t, e, d]) => {
      if (Array.isArray(t) && t.length > 0) setThresholds(t);
      setEmail(e.alertEmail || '');
      setEmailEnabled(e.emailAlertsEnabled || false);
      setDevices(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const handleDeleteDevice = async (device: Device) => {
    const confirmed = window.confirm(
      `Delete "${device.device_name}"?\n\nThis will permanently remove the device and all its readings. This cannot be undone.`
    );
    if (!confirmed) return;
    setDeletingId(device.id);
    setDeleteError(null);
    const res = await deleteDevice(device.id);
    if (res.ok) {
      const list = await fetchDevices();
      setDevices(Array.isArray(list) ? list : []);
    } else {
      setDeleteError(res.error || 'Failed to delete device. Please try again.');
    }
    setDeletingId(null);
  };

  const handleSaveThresholds = async () => {
    const payload = thresholds.map(t => ({ key: t.key, value: t.value }));
    const ok = await saveThresholds(payload);
    if (ok) {
      setSavedThresholds(true);
      setTimeout(() => setSavedThresholds(false), 2000);
    }
  };

  const handleSaveEmail = async () => {
    setEmailError('');
    if (emailEnabled && !email.trim()) {
      setEmailError('Enter a recipient email address before enabling alerts.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Enter a valid email address.');
      return;
    }
    const userEmail = getLoggedInEmail();
    if (!userEmail) {
      setEmailError('Could not identify logged-in user. Please log out and back in.');
      return;
    }
    const ok = await saveEmailSettings({ emailAlertsEnabled: emailEnabled, alertEmail: email.trim(), userEmail });
    if (ok) {
      setSavedEmail(true);
      setTimeout(() => setSavedEmail(false), 2000);
    } else {
      setEmailError('Failed to save. Is the backend running?');
    }
  };

  return (
    <div className="py-4 sm:py-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#4a4a5a' }}>Configuration</p>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Settings</h1>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <span className="text-xs font-medium uppercase tracking-widest" style={{ color: '#4a4a5a' }}>Loading…</span>
        </div>
      ) : (<>

      {/* Alert Thresholds */}
      <div className="p-4 sm:p-6 mb-4" style={cardStyle}>
        <SectionLabel>Alert Thresholds</SectionLabel>
        <p className="text-xs mb-5" style={{ color: '#4a4a5a', lineHeight: 1.6 }}>
          Alerts fire when readings exceed these limits. 5-minute cooldown between repeated alerts.
        </p>

        {thresholds.length === 0 ? (
          <p className="text-sm mb-4" style={{ color: '#555' }}>
            No thresholds found. Make sure the Supabase <code style={{ color: '#666' }}>thresholds</code> table has rows.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {thresholds.map((t, i) => (
              <div key={t.key} className="p-3.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '2px solid rgba(59,130,246,0.4)' }}>
                <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: '#4a4a5a' }}>
                  {KEY_LABELS[t.key] || t.key.replace(/_/g, ' ')}
                </label>
                <input
                  type="number"
                  value={t.value}
                  style={inputStyle}
                  onChange={e => {
                    const updated = [...thresholds];
                    updated[i] = { ...updated[i], value: Number(e.target.value) };
                    setThresholds(updated);
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <PrimaryButton onClick={handleSaveThresholds} saved={savedThresholds} label="Save Thresholds" savedLabel="Saved!" />
      </div>

      {/* Email Notifications */}
      <div className="p-4 sm:p-6 mb-4" style={cardStyle}>
        <SectionLabel>Email Notifications</SectionLabel>
        <p className="text-xs mb-5" style={{ color: '#4a4a5a', lineHeight: 1.6 }}>
          Receive an email when a threshold is breached. Saved to your account.
        </p>

        <div className="space-y-3 mb-5">
          <div className="p-3.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '2px solid rgba(59,130,246,0.4)' }}>
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: '#4a4a5a' }}>Alert Recipient Email</label>
            <input type="email" value={email} placeholder="you@example.com" style={inputStyle}
              onChange={e => { setEmail(e.target.value); setEmailError(''); }} />
            <p className="text-[10px] mt-1.5" style={{ color: '#333' }}>Alert emails will be sent here. Leave blank to use your login email.</p>
          </div>

          <div className="p-3.5 rounded-xl flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '2px solid rgba(59,130,246,0.4)' }}>
            <div className="relative flex-shrink-0 cursor-pointer" onClick={() => setEmailEnabled(!emailEnabled)}>
              <div className="w-9 h-5 rounded-full transition-colors" style={{ background: emailEnabled ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)', border: emailEnabled ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.1)' }} />
              <div className="absolute top-0.5 transition-transform rounded-full" style={{ width: 16, height: 16, left: 2, background: emailEnabled ? '#3b82f6' : 'rgba(255,255,255,0.3)', transform: emailEnabled ? 'translateX(16px)' : 'translateX(0)' }} />
            </div>
            <span className="text-sm select-none" style={{ color: '#ccc' }}>Send email when an alert fires</span>
          </div>
        </div>

        {emailError && (
          <div className="mb-4 px-4 py-3 rounded-xl text-xs" style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
            {emailError}
          </div>
        )}

        <PrimaryButton onClick={handleSaveEmail} saved={savedEmail} label="Save Email Settings" savedLabel="Saved!" />
      </div>

      {/* Device Management */}
      <div className="p-4 sm:p-6 mb-4" style={cardStyle}>
        <SectionLabel>Device Management</SectionLabel>
        <p className="text-xs mb-5" style={{ color: '#4a4a5a', lineHeight: 1.6 }}>
          Manage your connected devices. You can review and remove demo or user-created devices here.
        </p>

        {deleteError && (
          <div className="mb-4 px-4 py-3 rounded-xl text-xs flex items-center gap-2"
            style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
            <span className="flex-shrink-0">⚠</span>
            {deleteError}
          </div>
        )}

        {devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-center w-12 h-12 rounded-full mb-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
                <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18.01" />
              </svg>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#555' }}>No devices found</p>
            <p className="text-xs" style={{ color: '#333' }}>Add a device from the dashboard to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {devices.map(device => {
              const isLegacy = device.device_key === 'esp32-legacy-default';
              const isDeleting = deletingId === device.id;
              return (
                <div
                  key={device.id}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl transition-colors"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate" style={{ color: '#e5e5e5' }}>{device.device_name}</span>
                      {isLegacy && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                          Hardware
                        </span>
                      )}
                    </div>
                    {device.location && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#4a4a5a' }}>{device.location}</p>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {isLegacy ? (
                      <span className="text-[11px] font-medium px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.04)', color: '#4a4a5a', border: '1px solid rgba(255,255,255,0.06)' }}>
                        Protected
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isDeleting || deletingId !== null}
                        onClick={() => handleDeleteDevice(device)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        style={{
                          background: 'rgba(248,113,113,0.08)',
                          color: isDeleting || deletingId !== null ? 'rgba(248,113,113,0.35)' : '#f87171',
                          border: '1px solid rgba(248,113,113,0.2)',
                          cursor: isDeleting || deletingId !== null ? 'not-allowed' : 'pointer',
                          opacity: isDeleting || deletingId !== null ? 0.6 : 1,
                        }}
                      >
                        {isDeleting ? 'Deleting…' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl px-4 py-3.5 text-xs"
        style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)', borderLeft: '3px solid rgba(59,130,246,0.5)', color: '#4a5a7a' }}>
        <strong style={{ color: '#3b82f6' }}>Note:</strong> Thresholds apply globally to your device. Email settings are saved to your account in Supabase.
      </div>
      </>)}
    </div>
  );
}
