const TOKEN_KEY = 'voltview_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(accessToken: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  // Store refresh token + access token in cookies so proxy.ts can read them
  document.cookie = `voltview_token=1; path=/; SameSite=Strict; max-age=604800`;
  document.cookie = `voltview_refresh=${refreshToken}; path=/; SameSite=Strict; max-age=604800`;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = 'voltview_token=; path=/; max-age=0';
  document.cookie = 'voltview_refresh=; path=/; max-age=0';
}

export function logout() {
  clearSession();
  window.location.href = '/login';
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() / 1000 > payload.exp;
  } catch {
    return true;
  }
}
