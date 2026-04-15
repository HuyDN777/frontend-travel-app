export async function deleteUser(targetUserId: number, userId?: number) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') {
    throw new Error('Not logged in');
  }
  return request<void>(`/api/v1/admin/users/${targetUserId}`, {
    userId: resolvedUserId,
    method: 'DELETE',
  });
}
import Constants from 'expo-constants';
import * as ImageManipulator from 'expo-image-manipulator';

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

export function resolveMediaUrl(rawUrl?: string | null): string {
  const value = (rawUrl ?? '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) {
    return value;
  }
  if (value.startsWith('/')) {
    return `${API_BASE_URL}${value}`;
  }
  return `${API_BASE_URL}/${value}`;
}

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
    if (response.status === 413) {
      throw new Error(
        'Ảnh hoặc dữ liệu gửi lên quá lớn (413). Hãy chọn ảnh nhỏ hơn, hoặc bảo backend tăng spring.servlet.multipart.max-file-size và restart.'
      );
    }
    const raw = await response.text();
    let message = raw?.trim() || '';

    if (message) {
      try {
        const parsed = JSON.parse(message);
        if (typeof parsed === 'string') {
          message = parsed;
        } else if (parsed && typeof parsed === 'object') {
          const payload = parsed as Record<string, unknown>;
          const extracted =
            (typeof payload.message === 'string' && payload.message) ||
            (typeof payload.error === 'string' && payload.error) ||
            (typeof payload.details === 'string' && payload.details);
          message = extracted ? extracted : `Yêu cầu thất bại (${response.status}).`;
        }
      } catch {
        // Keep plain text message
      }
    }

    const normalized = message.replace(/\s+/g, ' ').trim().toLowerCase();
    if (response.status === 401 || response.status === 403) {
      throw new Error('Sai tên đăng nhập hoặc mật khẩu.');
    }
    if (response.status === 404 && normalized.includes('user')) {
      throw new Error('Tài khoản chưa tồn tại. Vui lòng đăng ký trước.');
    }
    if (!message || message.startsWith('{') || message.startsWith('[')) {
      throw new Error(`Yêu cầu thất bại (${response.status}). Vui lòng thử lại.`);
    }
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

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  email: string;
  newPassword: string;
};

export type SendOTPPayload = {
  email: string;
};

export type VerifyOTPPayload = {
  email: string;
  otpCode: string;
};

export type CompleteRegistrationPayload = {
  username: string;
  password: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
};

export type OTPRes = {
  message: string;
  email?: string;
  expiryMinutes?: number;
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
  userId?: number;
};

export type ItineraryItemCreateReq = {
  tripId: number;
  kind?: string;
  placeName: string;
  address?: string;
  lat?: number;
  lon?: number;
  phone?: string;
  website?: string;
  bookingLink?: string;
  rating?: number;
  openNow?: boolean;
  amenities?: string[];
  reviews?: string[];
};

export type ItineraryItemRes = {
  id: number;
  tripId: number;
  userId: number;
  kind?: string;
  placeName: string;
  address?: string;
  lat?: number;
  lon?: number;
  phone?: string;
  website?: string;
  bookingLink?: string;
  rating?: number;
  openNow?: boolean;
  createdAt?: string;
};

export type PlaceDraft = {
  name: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  suggestTime: string;
  imageUrl?: string;
};

export type DailyPlan = {
  dayIndex: number;
  places: PlaceDraft[];
};

export type CreateTripPayload = {
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
  status?: string;
  activeDays?: DailyPlan[];
};

export type UpdateTripStopPayload = {
  visitTime?: string | null;
  note?: string | null;
};

export type CommunityPost = {
  id: number;
  userId: number;
  tripId: number | null;
  isTripLinked: number;
  title: string;
  content: string;
  imageUrl: string | null;
  imageUrls?: string[];
  location: string | null;
  budget: number | null;
  createdAt: string;
  authorUsername?: string | null;
  authorFullName?: string | null;
  authorAvatarUrl?: string | null;
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
  imageUrls?: string[];
  location?: string;
  budget?: number | null;
};

export type UploadImageRes = {
  imageUrl: string;
};

export type AdminDashboardRes = {
  users: UserProfile[];
  posts: CommunityPost[];
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

export async function sendForgotPasswordOTP(payload: ForgotPasswordPayload) {
  return request<OTPRes>('/api/v1/auth/forgot-password/send-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function verifyForgotPasswordOTP(payload: VerifyOTPPayload) {
  return request<{ message: string }>('/api/v1/auth/forgot-password/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function resetForgotPassword(payload: ResetPasswordPayload) {
  return request<{ message: string }>('/api/v1/auth/forgot-password/reset', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function sendOTP(payload: SendOTPPayload) {
  return request<OTPRes>('/api/v1/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function verifyOTP(payload: VerifyOTPPayload) {
  return request<{ message: string }>('/api/v1/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function completeRegistration(payload: CompleteRegistrationPayload) {
  return request<AuthRes>('/api/v1/auth/complete-registration', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMyProfile(userId?: number) {
  return request<UserProfile>('/api/v1/users/me', { userId, method: 'GET' });
}

export async function updateMyProfile(
  payload: Partial<UserProfile> & { password?: string; currentPassword?: string },
  userId?: number
) {
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

export async function uploadAvatar(fileUri: string, userId?: number) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') {
    throw new Error('Not logged in');
  }

  const fileName = fileUri.split('/').pop() ?? `avatar-${Date.now()}.jpg`;
  const lowerName = fileName.toLowerCase();
  const mimeType = lowerName.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const formData = new FormData();
  formData.append('image', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as any);

  return request<{ avatarUrl: string }>(`/api/v1/users/${resolvedUserId}/avatar`, {
    userId: resolvedUserId,
    method: 'POST',
    body: formData,
  });
}

export async function getMyTrips(userId?: number) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') {
    throw new Error('Not logged in');
  }

  return request<TripItem[]>(`/api/v1/users/${resolvedUserId}/trips`, { userId: resolvedUserId, method: 'GET' });
}

export async function createItineraryItem(payload: ItineraryItemCreateReq, userId?: number) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') {
    throw new Error('Not logged in');
  }
  return request<ItineraryItemRes>('/api/v1/itinerary-items', {
    userId: resolvedUserId,
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getTripItineraryItems(tripId: number, userId?: number) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') {
    throw new Error('Not logged in');
  }
  return request<ItineraryItemRes[]>(`/api/v1/itinerary-items/trips/${tripId}`, {
    userId: resolvedUserId,
    method: 'GET',
  });
}

export async function createTrip(payload: CreateTripPayload, userId?: number) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') {
    throw new Error('Not logged in');
  }

  return request<number>(`/api/v1/create-trip/${resolvedUserId}`, {
    userId: resolvedUserId,
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteTrip(tripId: number, userId?: number) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') {
    throw new Error('Not logged in');
  }

  return request<void>(`/api/v1/trips/${tripId}`, {
    userId: resolvedUserId,
    method: 'DELETE',
  });
}

export type InviteCompanionRes = {
  memberId: number;
  tripId: number;
  tripName: string;
  userId: number;
  inviteeName: string;
  inviteeEmail: string;
  memberRole: number;
  status: number;
};

export async function inviteCompanion(
  tripId: number,
  payload: { inviteeEmail: string; memberRole?: number },
  userId?: number
) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') throw new Error('Not logged in');
  return request<InviteCompanionRes>(`/api/v1/trips/${tripId}/invite`, {
    userId: resolvedUserId,
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getTripMembers(tripId: number, userId?: number) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') throw new Error('Not logged in');
  return request<InviteCompanionRes[]>(`/api/v1/trips/${tripId}/members`, {
    userId: resolvedUserId,
    method: 'GET',
  });
}

export async function getPendingInvitations(userId?: number) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') throw new Error('Not logged in');
  return request<InviteCompanionRes[]>('/api/v1/trips/invitations/pending', {
    userId: resolvedUserId,
    method: 'GET',
  });
}

export async function acceptInvitation(memberId: number, userId?: number) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') throw new Error('Not logged in');
  return request<InviteCompanionRes>(`/api/v1/trips/members/${memberId}/accept`, {
    userId: resolvedUserId,
    method: 'PUT',
  });
}

export async function declineInvitation(memberId: number, userId?: number) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') throw new Error('Not logged in');
  return request<void>(`/api/v1/trips/members/${memberId}/decline`, {
    userId: resolvedUserId,
    method: 'DELETE',
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

  let uploadUri = fileUri;
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      fileUri,
      [{ resize: { width: 1440 } }],
      { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG }
    );
    uploadUri = manipulated.uri;
  } catch {
    // Keep original URI if preprocessing fails.
  }

  const fileName = uploadUri.split('/').pop() ?? `image-${Date.now()}.jpg`;
  const mimeType = 'image/jpeg';

  const formData = new FormData();
  formData.append('image', {
    uri: uploadUri,
    name: fileName,
    type: mimeType,
  } as any);

  return request<UploadImageRes>('/api/v2/community/uploads/image', {
    userId: resolvedUserId,
    method: 'POST',
    body: formData,
  });
}

export async function uploadCommunityImages(fileUris: string[], userId?: number) {
  const imageUrls: string[] = [];

  for (let i = 0; i < fileUris.length; i += 1) {
    const uri = fileUris[i];
    try {
      let uploaded: UploadImageRes | null = null;
      let lastError: unknown;

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          uploaded = await uploadCommunityImage(uri, userId);
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!uploaded) {
        throw lastError;
      }

      imageUrls.push(uploaded.imageUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload image failed';
      throw new Error(`Khong the upload anh thu ${i + 1}: ${message}`);
    }
  }

  return imageUrls;
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

export async function getAdminUsers(userId?: number) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') {
    throw new Error('Not logged in');
  }
  return request<UserProfile[]>('/api/v1/admin/users', {
    userId: resolvedUserId,
    method: 'GET',
  });
}

export async function getAdminDashboard(userId?: number): Promise<AdminDashboardRes> {
  const [users, posts] = await Promise.all([getAdminUsers(userId), getCommunityFeed(userId)]);
  return { users, posts };
}

export async function updateAdminUserRole(targetUserId: number, role: 'USER' | 'ADMIN', userId?: number) {
  const resolvedUserId = resolveUserId(userId);
  if (typeof resolvedUserId !== 'number') {
    throw new Error('Not logged in');
  }
  return request<UserProfile>(`/api/v1/admin/users/${targetUserId}/role`, {
    userId: resolvedUserId,
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function getTripJournal(tripId: number, userId?: number): Promise<any> {
  return request<any>(`/api/v1/trips/${tripId}/trip-journal`, {
    userId,
    method: 'GET',
  });
}

export async function checkInLocationApi(postItineraryDetailId: number, userId?: number): Promise<void> {
  return request<void>(`/api/v1/itinerary-details/${postItineraryDetailId}/check-in`, {
    userId,
    method: 'POST',
  });
}

export async function updateTripStopApi(itineraryDetailId: number, payload: UpdateTripStopPayload, userId?: number): Promise<void> {
  return request<void>(`/api/v1/trips/journal/stops/${itineraryDetailId}`, {
    userId,
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteTripStopApi(itineraryDetailId: number, userId?: number): Promise<void> {
  return request<void>(`/api/v1/trips/journal/stops/${itineraryDetailId}`, {
    userId,
    method: 'DELETE',
  });
}

export async function getTouristAttractions(destination: string, limit: number = 20) {
  return request<any[]>(`/api/v1/places/attractions?destination=${encodeURIComponent(destination)}&limit=${limit}`, {
    method: 'GET',
  });
}
