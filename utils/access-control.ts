export type SessionLike = {
  role?: string | null;
} | null;

export type AccessLevel = 'guest' | 'user' | 'admin';

export function normalizeRole(role?: string | null) {
  return (role ?? '').trim().toUpperCase();
}

export function isAdminRole(role?: string | null) {
  return normalizeRole(role) === 'ADMIN';
}

export function isLoggedInSession(user: SessionLike) {
  return Boolean(user);
}

export function canAccessAdminArea(user: SessionLike) {
  return isAdminRole(user?.role);
}

export function canAccessUserArea(user: SessionLike) {
  return Boolean(user) && !isAdminRole(user?.role);
}

export function canUseContentCreation(user: SessionLike) {
  return canAccessUserArea(user);
}

export function resolvePostLoginRoute(role?: string | null) {
  return isAdminRole(role) ? '/admin' : '/(tabs)';
}

export function resolveLandingRoute(user: SessionLike) {
  if (!user) return '/login';
  return resolvePostLoginRoute(user.role);
}

export function resolveRouteAccess(required: AccessLevel, user: SessionLike) {
  if (required === 'guest') {
    return user ? resolveLandingRoute(user) : null;
  }

  if (required === 'admin') {
    if (!user) return '/login';
    return canAccessAdminArea(user) ? null : '/(tabs)';
  }

  if (!user) return '/login';
  return canAccessUserArea(user) ? null : '/admin';
}
