import Constants from 'expo-constants';

const fromExtra = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
const isWeb = typeof window !== 'undefined';
const expoHost = Constants.expoConfig?.hostUri ?? Constants.linkingUri ?? '';

// Default to localhost on web and Android emulator loopback on native.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? fromExtra ?? 'http://10.0.2.2:8080';

export const DEFAULT_API_BASE_URL = isWeb ? 'http://localhost:8080' : 'http://10.0.2.2:8080';

export function resolveApiBaseUrl() {
  const candidate = process.env.EXPO_PUBLIC_API_BASE_URL ?? fromExtra;

  if (!candidate) {
    return DEFAULT_API_BASE_URL;
  }

  if (candidate.toLowerCase().includes('ip_may_ban') || candidate.toLowerCase().includes('ip may ban')) {
    return isWeb ? DEFAULT_API_BASE_URL : getSuggestedLanApiBaseUrl();
  }

  return candidate;
}

export function getSuggestedLanApiBaseUrl() {
  if (!expoHost) {
    return DEFAULT_API_BASE_URL;
  }

  const host = expoHost.replace(/^exp\+/, '').split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return DEFAULT_API_BASE_URL;
  }

  return `http://${host}:8080`;
}
