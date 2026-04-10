import { resolveApiBaseUrl } from '@/lib/config';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

type RequestOptions = {
  method?: Method;
  body?: unknown;
  userId?: number;
};

function buildHeaders(userId?: number, hasBody?: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (hasBody) headers['Content-Type'] = 'application/json';
  if (userId) headers['X-User-Id'] = String(userId);
  return headers;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const hasBody = options.body !== undefined;
  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    method,
    headers: buildHeaders(options.userId, hasBody),
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
