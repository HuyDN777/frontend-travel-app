export type SessionUser = {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role?: string;
};

let currentUser: SessionUser | null = null;

export function setSessionUser(user: SessionUser) {
  currentUser = user;
}

export function clearSessionUser() {
  currentUser = null;
}

export function getSessionUser() {
  return currentUser;
}

export function getSessionUserId() {
  return currentUser?.id ?? null;
}

export function isLoggedIn() {
  return currentUser !== null;
}

export function isAdmin() {
  return currentUser?.role?.toUpperCase() === 'ADMIN';
}
