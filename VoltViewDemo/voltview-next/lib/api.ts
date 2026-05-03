export const API_BASE = '/api';
export const LIVE_THRESHOLD_MS = 15000;

function getAuthHeader(): Record<string, string> {
  const match = typeof document !== 'undefined' 
    ? document.cookie.match(new RegExp('(^| )voltview_token=([^;]+)'))
    : null;
  const token = match ? match[2] : null;
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export function getDeviceState(reading: { timestamp?: string } | null): 'online' | 'offline' | 'none' {
  if (!reading?.timestamp) return 'none';
  const age = Date.now() - new Date(reading.timestamp).getTime();
  return age <= LIVE_THRESHOLD_MS ? 'online' : 'offline';
}

export async function unlockDevice(pin: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/device/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ pin }),
    });
    return res.json();
  } catch {
    return { ok: false, message: 'Connection error' };
  }
}

export async function lockDevice(): Promise<void> {
  try {
    await fetch(`${API_BASE}/device/lock`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
  } catch { /* ignore */ }
}

export async function fetchDeviceStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/device/status`, { headers: getAuthHeader() });
    const data = await res.json();
    return data.unlocked === true;
  } catch {
    return false;
  }
}

export async function fetchLatest() {
  try {
    const res = await fetch(`${API_BASE}/latest`, { headers: getAuthHeader() });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchReadings(limit = 20) {
  try {
    const res = await fetch(`${API_BASE}/history?limit=${limit}`, { headers: getAuthHeader() });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchExport(start: string, end: string) {
  try {
    const res = await fetch(`${API_BASE}/export?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Export failed');
    }
    return res.json();
  } catch (e: any) {
    throw e;
  }
}

export async function fetchWeekReadings() {
  try {
    const res = await fetch(`${API_BASE}/history/week`, { headers: getAuthHeader() });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchAlerts(userEmail = '') {
  if (!userEmail) return [];
  try {
    const res = await fetch(`${API_BASE}/alerts?userEmail=${encodeURIComponent(userEmail)}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function resolveAlert(id: number) {
  try {
    const res = await fetch(`${API_BASE}/alerts/${id}/resolve`, {
      method: 'PUT',
      headers: getAuthHeader()
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchThresholds(): Promise<Array<{ id: number; key: string; value: number; label?: string }>> {
  try {
    const res = await fetch(`${API_BASE}/thresholds`, { headers: getAuthHeader() });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function saveThresholds(thresholds: Array<{ key: string; value: number }>) {
  try {
    const res = await fetch(`${API_BASE}/thresholds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ thresholds }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchEmailSettings(userEmail: string): Promise<{ emailAlertsEnabled: boolean; alertEmail: string }> {
  try {
    const res = await fetch(`${API_BASE}/settings/email?userEmail=${encodeURIComponent(userEmail)}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) return { emailAlertsEnabled: false, alertEmail: '' };
    return res.json();
  } catch {
    return { emailAlertsEnabled: false, alertEmail: '' };
  }
}

export async function saveEmailSettings(settings: { emailAlertsEnabled: boolean; alertEmail: string; userEmail: string }) {
  try {
    const res = await fetch(`${API_BASE}/settings/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(settings),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function signup(email: string, password: string) {
  const res = await fetch(`${API_BASE}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function forgotPassword(email: string) {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function resetPassword(access_token: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token, password }),
  });
  return res.json();
}
