import { useCallback, useEffect, useMemo, useState } from 'react';

import { getAdminDashboard, type CommunityPost, type UserProfile } from '@/utils/api';
import { getSessionUserId } from '@/utils/session';

function isSameDay(date: Date, target: Date) {
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth() &&
    date.getDate() === target.getDate()
  );
}

export function useAdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    const userId = getSessionUserId();
    if (!userId) {
      setUsers([]);
      setPosts([]);
      setError('Phiên đăng nhập không hợp lệ.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await getAdminDashboard(userId);
      setUsers(data.users);
      setPosts(data.posts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu quản trị.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const metrics = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((item) => item.role !== 'BANNED').length;
    const adminUsers = users.filter((item) => (item.role ?? '').toUpperCase() === 'ADMIN').length;
    const postsToday = posts.filter((post) => {
      const created = new Date(post.createdAt);
      return !Number.isNaN(created.getTime()) && isSameDay(created, new Date());
    }).length;

    return {
      totalUsers,
      activeUsers,
      adminUsers,
      totalPosts: posts.length,
      postsToday,
    };
  }, [posts, users]);

  const weeklyPosts = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return {
        key: `${date.getMonth() + 1}-${date.getDate()}`,
        label: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
        count: 0,
        date,
      };
    });

    for (const post of posts) {
      const created = new Date(post.createdAt);
      if (Number.isNaN(created.getTime())) continue;
      const bucket = days.find((item) => isSameDay(item.date, created));
      if (bucket) bucket.count += 1;
    }

    const max = Math.max(...days.map((item) => item.count), 1);
    return days.map(({ date, ...rest }) => ({
      ...rest,
      max,
    }));
  }, [posts]);

  const moderationQueue = useMemo(
    () =>
      [...posts]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    [posts]
  );

  return {
    users,
    posts,
    loading,
    error,
    reload,
    metrics,
    weeklyPosts,
    moderationQueue,
  };
}
