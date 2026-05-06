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

export async function fetchDevices() {
  try {
    const res = await fetch(`${API_BASE}/devices`, { headers: getAuthHeader() });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function createDevice(device_name: string, location?: string) {
  const res = await fetch(`${API_BASE}/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ device_name, location: location || undefined }),
  });
  return res.json();
}

export async function generateDemoReading(deviceId: string) {
  try {
    const res = await fetch(`${API_BASE}/demo/devices/${deviceId}/reading`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchLatest(deviceId?: string, readingSource?: string) {
  try {
    const params = new URLSearchParams();
    if (deviceId) params.set('device_id', deviceId);
    if (readingSource) params.set('reading_source', readingSource);
    const qs = params.toString() ? `?${params}` : '';
    const res = await fetch(`${API_BASE}/latest${qs}`, { headers: getAuthHeader() });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchReadings(limit = 20, deviceId?: string, readingSource?: string) {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (deviceId) params.set('device_id', deviceId);
    if (readingSource) params.set('reading_source', readingSource);
    const res = await fetch(`${API_BASE}/history?${params}`, { headers: getAuthHeader() });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchExport(start: string, end: string, deviceId?: string, readingSource?: string) {
  try {
    const params = new URLSearchParams({ start, end });
    if (deviceId) params.set('device_id', deviceId);
    if (readingSource) params.set('reading_source', readingSource);
    const res = await fetch(`${API_BASE}/export?${params}`, { headers: getAuthHeader() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Export failed');
    }
    return res.json();
  } catch (e: any) {
    throw e;
  }
}

export async function fetchWeekReadings(deviceId?: string, readingSource?: string) {
  try {
    const params = new URLSearchParams();
    if (deviceId) params.set('device_id', deviceId);
    if (readingSource) params.set('reading_source', readingSource);
    const qs = params.toString() ? `?${params}` : '';
    const res = await fetch(`${API_BASE}/history/week${qs}`, { headers: getAuthHeader() });
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

export async function updateDeviceMode(deviceId: string, dataMode: 'simulation' | 'device') {
  try {
    const res = await fetch(`${API_BASE}/devices/${encodeURIComponent(deviceId)}/mode`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ data_mode: dataMode }),
    });
    return res.json();
  } catch {
    return { ok: false, error: 'Connection error.' };
  }
}

export async function deleteDevice(deviceId: string) {
  try {
    const res = await fetch(`${API_BASE}/devices/${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return res.json();
  } catch {
    return { ok: false, error: 'Connection error.' };
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
