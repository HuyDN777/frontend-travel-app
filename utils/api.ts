import Constants from 'expo-constants';

import { getSessionUserId } from '@/utils/session';

/**
 * Chỉ gốc server (không có /api/v1) vì các path trong file này đã bắt đầu bằng /api/...
 */
function resolveApiOrigin(): string {
  const envValue = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envValue) {
    try {
      const stripped = envValue.replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '');
      const withProtocol = stripped.includes('://') ? stripped : `http://${stripped}`;
      return new URL(withProtocol).origin;
    } catch {
      // fallback below
    }
  }

  const hostUri =
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ??
    (Constants.manifest2 as { extra?: { expoClient?: { hostUri?: string } } } | null)?.extra?.expoClient
      ?.hostUri;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) return `http://${host}:8080`;
  }

  return 'http://10.0.2.2:8080';
}

export const API_BASE_URL = resolveApiOrigin();

type RequestOptions = RequestInit & {
  userId?: number | null;
};

function resolveUserId(explicitUserId?: number | null) {
  if (typeof explicitUserId === 'number') {
    return explicitUserId;
  }
  return getSessionUserId();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { userId, headers, ...rest } = options;
  const resolvedUserId = resolveUserId(userId);
  const isFormDataBody = typeof FormData !== 'undefined' && rest.body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        ...(isFormDataBody ? {} : { 'Content-Type': 'application/json' }),
        ...(typeof resolvedUserId === 'number' ? { 'X-User-Id': String(resolvedUserId) } : {}),
        ...(headers ?? {}),
      },
    });
  } catch {
    throw new Error(
      `Không kết nối được máy chủ (${API_BASE_URL}). Bật backend, dùng cùng Wi-Fi với điện thoại, hoặc set EXPO_PUBLIC_API_URL=http://<IP-LAN>:8080 rồi chạy lại Expo.`
    );
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export type AuthRes = {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  role: string;
};

export type RegisterPayload = {
  username: string;
  password: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
};

export type LoginPayload = {
  identifier: string;
  password: string;
};

export type UserProfile = {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  role: string;
};

export type TripItem = {
  id: number;
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
};

export type CreateTripPayload = {
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
  status?: string;
};

export type CommunityPost = {
  id: number;
  userId: number;
  tripId: number | null;
  isTripLinked: number;
  title: string;
  content: string;
  imageUrl: string | null;
  location: string | null;
  budget: number | null;
  createdAt: string;
  likeCount: number;
  saveCount: number;
  isLiked: number;
  isSaved: number;
};

export type CommunityPostPayload = {
  tripId?: number | null;
  title: string;
  content?: string;
  imageUrl?: string;
  location?: string;
  budget?: number | null;
};

export type UploadImageRes = {
  imageUrl: string;
};

export async function register(payload: RegisterPayload) {
  return request<AuthRes>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginPayload) {
  return request<AuthRes>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMyProfile(userId?: number) {
  return request<UserProfile>('/api/v1/users/me', { userId, method: 'GET' });
}

export async function updateMyProfile(payload: Partial<UserProfile> & { password?: string }, userId?: number) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') {
    throw new Error('Not logged in');
  }

  return request<UserProfile>(`/api/v1/users/${resolvedUserId}`, {
    userId: resolvedUserId,
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getMyTrips(userId?: number) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') {
    throw new Error('Not logged in');
  }

  return request<TripItem[]>(`/api/v1/users/${resolvedUserId}/trips`, { userId: resolvedUserId, method: 'GET' });
}

export async function createTrip(payload: CreateTripPayload, userId?: number) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') {
    throw new Error('Not logged in');
  }

  return request(`/api/v1/create-trip/${resolvedUserId}`, {
    userId: resolvedUserId,
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCommunityFeed(userId?: number) {
  return request<CommunityPost[]>('/api/v2/community/posts', { userId, method: 'GET' });
}

export async function getCommunityPost(postId: number, userId?: number) {
  return request<CommunityPost>(`/api/v2/community/posts/${postId}`, { userId, method: 'GET' });
}

export async function getSavedCommunityPosts(userId?: number) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') {
    throw new Error('Not logged in');
  }

  return request<CommunityPost[]>(`/api/v2/community/users/${resolvedUserId}/saved`, { userId: resolvedUserId, method: 'GET' });
}

export async function createCommunityPost(payload: CommunityPostPayload, userId?: number) {
  return request<CommunityPost>('/api/v2/community/posts', {
    userId,
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function uploadCommunityImage(fileUri: string, userId?: number) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') {
    throw new Error('Not logged in');
  }

  const fileName = fileUri.split('/').pop() ?? `image-${Date.now()}.jpg`;
  const lowerName = fileName.toLowerCase();
  const mimeType = lowerName.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const formData = new FormData();
  formData.append('image', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  return request<UploadImageRes>('/api/v2/community/uploads/image', {
    userId: resolvedUserId,
    method: 'POST',
    body: formData,
  });
}

export async function updateCommunityPost(postId: number, payload: CommunityPostPayload, userId?: number) {
  return request<CommunityPost>(`/api/v2/community/posts/${postId}`, {
    userId,
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteCommunityPost(postId: number, userId?: number) {
  return request<void>(`/api/v2/community/posts/${postId}`, {
    userId,
    method: 'DELETE',
  });
}

export async function toggleLike(postId: number, userId?: number) {
  return request('/api/v2/community/posts/' + postId + '/likes/toggle', {
    userId,
    method: 'POST',
  });
}

export async function toggleSave(postId: number, userId?: number) {
  return request('/api/v2/community/posts/' + postId + '/saves/toggle', {
    userId,
    method: 'POST',
  });
}
