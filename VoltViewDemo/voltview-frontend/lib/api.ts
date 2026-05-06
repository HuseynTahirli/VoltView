import { getAccessToken } from './auth';

export const API_BASE = '/api';

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return token
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

export async function fetchLatest() {
  const res = await fetch(`${API_BASE}/latest`, { headers: authHeaders() });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchReadings() {
  const res = await fetch(`${API_BASE}/history`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/alerts`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function resolveAlert(id: number) {
  const res = await fetch(`${API_BASE}/alerts/${id}/resolve`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return res.ok;
}

export async function fetchThresholds() {
  const res = await fetch(`${API_BASE}/thresholds`, { headers: authHeaders() });
  if (!res.ok) return null;
  return res.json();
}

export async function saveThresholds(data: object) {
  const res = await fetch(`${API_BASE}/thresholds`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return res.ok;
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

export const LIVE_THRESHOLD_MS = 15000;

export function getDeviceState(reading: { timestamp?: string } | null): 'online' | 'offline' | 'none' {
  if (!reading?.timestamp) return 'none';
  const age = Date.now() - new Date(reading.timestamp).getTime();
  return age <= LIVE_THRESHOLD_MS ? 'online' : 'offline';
}
