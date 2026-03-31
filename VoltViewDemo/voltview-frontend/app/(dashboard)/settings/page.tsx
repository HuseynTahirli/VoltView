'use client';
import { useEffect, useState } from 'react';
import { fetchThresholds, saveThresholds } from '@/lib/api';

export default function SettingsPage() {
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchThresholds().then(data => { if (data) setThresholds(data); });
  }, []);

  const handleSave = async () => {
    await saveThresholds({ thresholds });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle = { background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, color: '#fff', padding: '10px 14px', fontSize: '0.9rem', width: '100%', outline: 'none' };

  return (
    <div className="py-4 sm:py-6 max-w-2xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Settings</h1>

      <div className="rounded-xl border p-4 sm:p-6 mb-4" style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }}>
        <h2 className="text-base sm:text-lg font-semibold mb-4 text-white">Alert Thresholds</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {thresholds.map((t, i) => (
            <div key={t.id || i} className="p-3 rounded-lg" style={{ background: '#111', border: '1px solid #1a1a1a', borderLeft: '3px solid #3b82f6' }}>
              <label className="block text-xs font-medium text-[#e0e0e0] mb-1.5 uppercase tracking-wide">
                {t.label || t.key.replace(/_/g, ' ')}
              </label>
              <input type="number" value={t.value} style={inputStyle}
                onChange={e => {
                  const newT = [...thresholds];
                  newT[i] = { ...newT[i], value: Number(e.target.value) };
                  setThresholds(newT);
                }} />
            </div>
          ))}
        </div>
        <button onClick={handleSave}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer transition-colors"
          style={{ background: saved ? '#4ade80' : '#fff', color: '#000', border: 'none' }}>
          {saved ? 'Saved!' : 'Save Thresholds'}
        </button>
      </div>

      <div className="rounded-xl border p-4 sm:p-6 mb-4" style={{ background: '#0a0a0a', borderColor: '#1a1a1a' }}>
        <h2 className="text-base sm:text-lg font-semibold mb-4 text-white">Email Notifications</h2>
        <div className="p-3 rounded-lg mb-3" style={{ background: '#111', border: '1px solid #1a1a1a', borderLeft: '3px solid #3b82f6' }}>
          <label className="block text-xs font-medium text-[#e0e0e0] mb-1.5 uppercase tracking-wide">Recipient Email</label>
          <input type="email" value={email} placeholder="you@example.com" style={inputStyle}
            onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="p-3 rounded-lg mb-4 flex items-center gap-3" style={{ background: '#111', border: '1px solid #1a1a1a', borderLeft: '3px solid #3b82f6' }}>
          <input type="checkbox" checked={emailEnabled} onChange={e => setEmailEnabled(e.target.checked)}
            style={{ accentColor: '#3b82f6', width: 18, height: 18, cursor: 'pointer', flexShrink: 0 }} />
          <span className="text-[#ccc] text-sm">Send email when an alert fires</span>
        </div>
        <button className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer"
          style={{ background: '#fff', color: '#000', border: 'none' }}>
          Save Email Settings
        </button>
      </div>

      <div className="rounded-lg p-4 text-sm text-[#d4d4d4]"
        style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderLeft: '3px solid #3b82f6' }}>
        <strong className="text-[#3b82f6]">Tip:</strong> Thresholds and Email Settings are saved on the server and apply to all users.
      </div>
    </div>
  );
}
