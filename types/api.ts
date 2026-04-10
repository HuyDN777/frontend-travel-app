export type AuthRes = {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: string;
  message?: string;
};

export type UserProfileRes = {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: string;
};

export type UpdateUserReq = {
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  password?: string;
};

export type TripSummaryRes = {
  id: number;
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: string;
  userId: number;
};

export type PostRes = {
  id: number;
  userId: number;
  title: string;
  content: string;
  location: string;
  budget: number;
};

export type InteractionRes = {
  id: number;
  userId: number;
  postId: number;
  actionType: string;
};

export type PostCreateReq = {
  title: string;
  content: string;
  location: string;
  budget: number;
};

export type PostUpdateReq = PostCreateReq;

export type RegisterReq = {
  username: string;
  password: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
};

export type LoginReq = {
  usernameOrEmail: string;
  password: string;
};
