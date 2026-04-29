'use client';
import { useEffect, useState } from 'react';
import { fetchThresholds, saveThresholds, fetchEmailSettings, saveEmailSettings } from '@/lib/api';

type ThresholdRow = { id: number; key: string; value: number; label?: string };

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

export default function SettingsPage() {
  const [thresholds, setThresholds] = useState<ThresholdRow[]>([]);
  const [email, setEmail] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [savedThresholds, setSavedThresholds] = useState(false);
  const [savedEmail, setSavedEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userEmail = getLoggedInEmail();
    Promise.all([fetchThresholds(), fetchEmailSettings(userEmail)]).then(([t, e]) => {
      if (Array.isArray(t) && t.length > 0) setThresholds(t);
      setEmail(e.alertEmail || '');
      setEmailEnabled(e.emailAlertsEnabled || false);
      setLoading(false);
    });
  }, []);

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

  const inputStyle = { background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', padding: '10px 14px', fontSize: '0.9rem', width: '100%', outline: 'none' };

  if (loading) return <div className="py-10 text-center text-[#555] text-sm">Loading settings...</div>;

  return (
    <div className="py-4 sm:py-6 max-w-2xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Settings</h1>

      <div className="rounded-xl border p-4 sm:p-6 mb-4" style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }}>
        <h2 className="text-base sm:text-lg font-semibold mb-1 text-white">Alert Thresholds</h2>
        <p className="text-xs text-[#555] mb-4">Alerts fire when readings exceed these limits. 5-minute cooldown between repeated alerts.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {thresholds.map((t, i) => (
            <div key={t.key} className="p-3 rounded-lg" style={{ background: '#111', border: '1px solid #1a1a1a', borderLeft: '3px solid #3b82f6' }}>
              <label className="block text-xs font-medium text-[#888] mb-1.5 uppercase tracking-wide">
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
        {thresholds.length === 0 && (
          <p className="text-sm text-[#555] mb-4">No thresholds found. Make sure the Supabase <code>thresholds</code> table has rows.</p>
        )}
        <button
          onClick={handleSaveThresholds}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer transition-colors"
          style={{ background: savedThresholds ? '#4ade80' : '#fff', color: '#000', border: 'none' }}>
          {savedThresholds ? 'Saved!' : 'Save Thresholds'}
        </button>
      </div>

      <div className="rounded-xl border p-4 sm:p-6 mb-4" style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }}>
        <h2 className="text-base sm:text-lg font-semibold mb-1 text-white">Email Notifications</h2>
        <p className="text-xs text-[#555] mb-4">Receive an email when a threshold is breached. Saved to your account.</p>
        <div className="p-3 rounded-lg mb-3" style={{ background: '#111', border: '1px solid #1a1a1a', borderLeft: '3px solid #3b82f6' }}>
          <label className="block text-xs font-medium text-[#888] mb-1.5 uppercase tracking-wide">Alert Recipient Email</label>
          <input type="email" value={email} placeholder="you@example.com" style={inputStyle}
            onChange={e => { setEmail(e.target.value); setEmailError(''); }} />
          <p className="text-[10px] text-[#555] mt-1.5">Alert emails will be sent here. Leave blank to use your login email.</p>
        </div>
        <div className="p-3 rounded-lg mb-3 flex items-center gap-3" style={{ background: '#111', border: '1px solid #1a1a1a', borderLeft: '3px solid #3b82f6' }}>
          <input type="checkbox" checked={emailEnabled} onChange={e => setEmailEnabled(e.target.checked)}
            style={{ accentColor: '#3b82f6', width: 18, height: 18, cursor: 'pointer', flexShrink: 0 }} />
          <span className="text-[#ccc] text-sm">Send email when an alert fires</span>
        </div>
        {emailError && (
          <div className="mb-3 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
            {emailError}
          </div>
        )}
        <button
          onClick={handleSaveEmail}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer transition-colors"
          style={{ background: savedEmail ? '#4ade80' : '#fff', color: '#000', border: 'none' }}>
          {savedEmail ? 'Saved!' : 'Save Email Settings'}
        </button>
      <div className="rounded-lg p-4 text-sm text-[#888]"
        style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderLeft: '3px solid #3b82f6' }}>
        <strong className="text-[#3b82f6]">Note:</strong> Thresholds apply globally to your device. Email settings are saved to your account in Supabase.
      </div>
    </div>
  );
}
