import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAllUsers, getCommunityFeed, updateUserRole, type CommunityPost, type UserSummary } from '@/utils/api';
import { moderateScale } from '@/utils/responsive';
import { getSessionUser, isAdmin } from '@/utils/session';

export default function AdminScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const sessionUser = getSessionUser();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    const adminCount = users.filter((user) => user.role?.toUpperCase() === 'ADMIN').length;
    return {
      users: users.length,
      admins: adminCount,
      posts: posts.length,
    };
  }, [posts.length, users]);

  useEffect(() => {
    if (!isAdmin()) {
      Alert.alert('Access denied', 'Ban khong co quyen truy cap admin panel');
      router.replace('/(tabs)/profile');
      return;
    }

    loadAdminData();

    return () => {
    };
  }, [router, sessionUser?.id]);

  async function loadAdminData() {
    try {
      setLoading(true);
      const [allUsers, feed] = await Promise.all([
        getAllUsers(sessionUser?.id),
        getCommunityFeed(sessionUser?.id),
      ]);
      setUsers(allUsers);
      setPosts(feed);
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Khong tai duoc du lieu admin');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleRole(user: UserSummary) {
    if (!sessionUser?.id) return;

    const nextRole = user.role?.toUpperCase() === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      setLoading(true);
      const updated = await updateUserRole(user.id, nextRole, sessionUser.id);
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Khong the cap nhat role');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <ThemedText type="title" style={styles.title}>Admin Panel</ThemedText>
            <ThemedText style={{ color: palette.textMuted }}>Quan ly nguoi dung va theo doi hoat dong.</ThemedText>
          </View>
          <View style={[styles.statusPill, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={[styles.statusDot, { backgroundColor: palette.success }]} />
            <ThemedText style={[styles.statusText, { color: palette.text }]}>ADMIN STATUS: ACTIVE</ThemedText>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="people-outline" size={moderateScale(20)} color={palette.primary} />
            <ThemedText type="title">{stats.users.toLocaleString('vi-VN')}</ThemedText>
            <ThemedText style={{ color: palette.textMuted }}>Total Users</ThemedText>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="pulse-outline" size={moderateScale(20)} color={palette.accent} />
            <ThemedText type="title">{stats.posts.toLocaleString('vi-VN')}</ThemedText>
            <ThemedText style={{ color: palette.textMuted }}>Community Posts</ThemedText>
          </Card>
        </View>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">Management</ThemedText>
            <ThemedText style={{ color: palette.textMuted }}>{stats.admins} admin accounts</ThemedText>
          </View>

          <Pressable onPress={() => router.push('/(tabs)/explore')} style={[styles.manageItem, { borderColor: palette.border }]}>
            <View style={styles.manageLeft}>
              <View style={[styles.manageIcon, { backgroundColor: palette.primary }]}>
                <Ionicons name="people-outline" size={moderateScale(18)} color="#0B1B18" />
              </View>
              <View>
                <ThemedText type="defaultSemiBold">Manage Users</ThemedText>
                <ThemedText style={{ color: palette.textMuted }}>View and edit user accounts</ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.countChip, { color: palette.textMuted, borderColor: palette.border }]}>
              {users.length} users
            </ThemedText>
          </Pressable>

          <Pressable onPress={() => router.push('/(tabs)/explore')} style={[styles.manageItem, { borderColor: palette.border }]}>
            <View style={styles.manageLeft}>
              <View style={[styles.manageIcon, { backgroundColor: palette.accent }]}>
                <Ionicons name="warning-outline" size={moderateScale(18)} color="#0B1B18" />
              </View>
              <View>
                <ThemedText type="defaultSemiBold">Moderate Community Posts</ThemedText>
                <ThemedText style={{ color: palette.textMuted }}>Review and remove reported content</ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.pendingChip, { color: palette.accent, borderColor: palette.accent }]}>Open</ThemedText>
          </Pressable>

          <Pressable onPress={() => Alert.alert('Coming soon', 'App settings screen can be connected here.')} style={[styles.manageItem, { borderColor: palette.border }]}>
            <View style={styles.manageLeft}>
              <View style={[styles.manageIcon, { backgroundColor: palette.surfaceMuted }]}>
                <Ionicons name="settings-outline" size={moderateScale(18)} color={palette.text} />
              </View>
              <View>
                <ThemedText type="defaultSemiBold">App Settings</ThemedText>
                <ThemedText style={{ color: palette.textMuted }}>General configuration</ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={moderateScale(18)} color={palette.textMuted} />
          </Pressable>
        </Card>

        <View style={styles.listHeader}>
          <ThemedText type="defaultSemiBold">Users</ThemedText>
          <Button title="Refresh" variant="secondary" onPress={loadAdminData} loading={loading} />
        </View>

        <View style={styles.userList}>
          {users.map((user) => (
            <Card key={user.id} style={styles.userCard}>
              <View style={styles.userRow}>
                <View style={[styles.userAvatar, { backgroundColor: palette.surfaceMuted }]}>
                  <ThemedText type="defaultSemiBold">{(user.username || '?').slice(0, 1).toUpperCase()}</ThemedText>
                </View>
                <View style={styles.userInfo}>
                  <ThemedText type="defaultSemiBold">{user.fullName || user.username}</ThemedText>
                  <ThemedText style={{ color: palette.textMuted }}>@{user.username}</ThemedText>
                </View>
                <Pressable
                  onPress={() => handleToggleRole(user)}
                  style={[
                    styles.roleBadge,
                    {
                      borderColor: user.role?.toUpperCase() === 'ADMIN' ? palette.accent : palette.border,
                      backgroundColor: user.role?.toUpperCase() === 'ADMIN' ? palette.surfaceMuted : palette.surface,
                    },
                  ]}
                >
                  <ThemedText style={{ color: user.role?.toUpperCase() === 'ADMIN' ? palette.accent : palette.textMuted }}>
                    {user.role || 'USER'}
                  </ThemedText>
                </Pressable>
              </View>
              <Button
                title={user.role?.toUpperCase() === 'ADMIN' ? 'Revoke admin' : 'Make admin'}
                variant="secondary"
                onPress={() => handleToggleRole(user)}
              />
            </Card>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  title: {
    fontSize: moderateScale(28),
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: moderateScale(11),
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    gap: Spacing.xs,
  },
  sectionCard: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  manageItem: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  manageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  manageIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countChip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    fontSize: moderateScale(12),
  },
  pendingChip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    fontSize: moderateScale(12),
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userList: {
    gap: Spacing.md,
  },
  userCard: {
    gap: Spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  roleBadge: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
});
