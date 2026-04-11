import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  deleteCommunityPost,
  getAdminDashboard,
  updateAdminUserRole,
  type CommunityPost,
  type UserProfile,
} from '@/utils/api';
import { getSessionUser, getSessionUserId } from '@/utils/session';

export default function AdminPanelScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);

  const activeUsers = useMemo(() => users.filter((item) => item.role !== 'BANNED').length, [users]);

  const loadDashboard = useCallback(async () => {
    const userId = getSessionUserId();
    if (!userId) {
      return;
    }

    try {
      setLoading(true);
      const data = await getAdminDashboard(userId);
      setUsers(data.users);
      setPosts(data.posts);
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Khong tai duoc admin panel');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if ((getSessionUser()?.role ?? '').toUpperCase() !== 'ADMIN') {
      Alert.alert('Permission', 'Ban khong co quyen truy cap admin panel');
      return;
    }
    void loadDashboard();
  }, [loadDashboard]);

  async function handleToggleRole(user: UserProfile) {
    const userId = getSessionUserId();
    if (!userId) return;

    const nextRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    try {
      await updateAdminUserRole(user.id, nextRole, userId);
      await loadDashboard();
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Khong cap nhat role duoc');
    }
  }

  async function handleDeletePost(postId: number) {
    const userId = getSessionUserId();
    if (!userId) return;

    try {
      await deleteCommunityPost(postId, userId);
      await loadDashboard();
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Khong the xoa bai viet');
    }
  }

  return (
    <ThemedView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
            Admin Panel
          </ThemedText>
          <View style={[styles.activePill, { backgroundColor: '#213628' }]}>
            <ThemedText style={styles.activePillText}>ADMIN STATUS: ACTIVE</ThemedText>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <Card style={styles.metricCard}>
            <ThemedText style={[styles.metricValue, { color: palette.text }]}>{users.length}</ThemedText>
            <ThemedText style={{ color: palette.textMuted }}>Total Users</ThemedText>
          </Card>
          <Card style={styles.metricCard}>
            <ThemedText style={[styles.metricValue, { color: palette.text }]}>{activeUsers}</ThemedText>
            <ThemedText style={{ color: palette.textMuted }}>Daily Active</ThemedText>
          </Card>
        </View>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={16} color={palette.text} />
            <ThemedText type="defaultSemiBold">Manage Users</ThemedText>
          </View>

          {users.slice(0, 8).map((user) => (
            <View key={user.id} style={[styles.itemRow, { borderBottomColor: palette.border }] }>
              <View style={styles.itemTextWrap}>
                <ThemedText>{user.fullName || user.username}</ThemedText>
                <ThemedText style={{ color: palette.textMuted }}>{user.email}</ThemedText>
              </View>
              <Pressable
                onPress={() => void handleToggleRole(user)}
                style={[styles.roleBtn, { backgroundColor: user.role === 'ADMIN' ? '#F1B3B9' : '#BFE5DF' }]}
              >
                <ThemedText style={styles.roleBtnText}>{user.role === 'ADMIN' ? 'Set USER' : 'Set ADMIN'}</ThemedText>
              </Pressable>
            </View>
          ))}
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={16} color={palette.text} />
            <ThemedText type="defaultSemiBold">Moderate Community Posts</ThemedText>
          </View>

          {posts.slice(0, 8).map((post) => (
            <View key={post.id} style={[styles.itemRow, { borderBottomColor: palette.border }] }>
              <View style={styles.itemTextWrap}>
                <ThemedText numberOfLines={1}>{post.title}</ThemedText>
                <ThemedText style={{ color: palette.textMuted }} numberOfLines={1}>
                  by {post.authorFullName || post.authorUsername || `User ${post.userId}`}
                </ThemedText>
              </View>
              <Button title="Delete" variant="ghost" onPress={() => void handleDeletePost(post.id)} />
            </View>
          ))}
        </Card>

        <Button title="Reload Dashboard" onPress={() => void loadDashboard()} loading={loading} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
  },
  activePill: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  activePillText: {
    color: '#E8F6EC',
    fontSize: 11,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metricCard: {
    flex: 1,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  sectionCard: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingBottom: Spacing.sm,
  },
  itemTextWrap: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  roleBtn: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  roleBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});