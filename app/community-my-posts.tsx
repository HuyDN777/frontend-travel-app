import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CommunityPostCard } from '@/components/ui/community-post-card';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  deleteCommunityPost,
  getCommunityFeed,
  toggleLike,
  toggleSave,
  type CommunityPost,
} from '@/utils/api';
import { moderateScale } from '@/utils/responsive';
import { getSessionUserId } from '@/utils/session';

export default function CommunityMyPostsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = getSessionUserId();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const myPosts = useMemo(
    () => (userId ? posts.filter((p) => p.userId === userId) : []),
    [posts, userId]
  );

  const loadFeed = useCallback(async () => {
    if (!userId) {
      router.replace('/login');
      return;
    }
    setLoading(true);
    try {
      const feed = await getCommunityFeed(userId);
      setPosts(feed);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Không tải được bài viết';
      Alert.alert('Lỗi', msg);
    } finally {
      setLoading(false);
    }
  }, [router, userId]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  async function handleRefresh() {
    if (!userId) return;
    try {
      setRefreshing(true);
      const feed = await getCommunityFeed(userId);
      setPosts(feed);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Không làm mới được';
      Alert.alert('Lỗi', msg);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleLike(postId: number) {
    if (!userId) return;
    try {
      await toggleLike(postId, userId);
      await loadFeed();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Không thực hiện được';
      Alert.alert('Lỗi', msg);
    }
  }

  async function handleSave(postId: number) {
    if (!userId) return;
    try {
      await toggleSave(postId, userId);
      await loadFeed();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Không thực hiện được';
      Alert.alert('Lỗi', msg);
    }
  }

  async function handleShare(post: CommunityPost) {
    try {
      const message = [post.title, post.content, post.location].filter(Boolean).join('\n');
      await Share.share({ message: message || 'Xem bài viết du lịch này nhé!' });
    } catch {
      Alert.alert('Lỗi', 'Không thể chia sẻ lúc này');
    }
  }

  function handleEdit(postId: number) {
    router.push({ pathname: '/community-post-editor', params: { postId: String(postId) } });
  }

  async function handleDelete(postId: number) {
    Alert.alert('Xóa bài', 'Bạn có chắc muốn xóa bài viết?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          if (!userId) return;
          try {
            await deleteCommunityPost(postId, userId);
            await loadFeed();
          } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Không xóa được';
            Alert.alert('Lỗi', msg);
          }
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm, borderBottomColor: palette.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </Pressable>
        <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
          Bài viết của tôi
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />}
        showsVerticalScrollIndicator={false}>
        <ThemedText style={[styles.hint, { color: palette.textMuted }]}>
          Chỉ hiển thị bài bạn đã đăng. Bảng tin chung nằm ở tab Cộng đồng.
        </ThemedText>

        {myPosts.map((post) => (
          <CommunityPostCard
            key={post.id}
            post={post}
            canEdit
            onLike={() => void handleLike(post.id)}
            onSave={() => void handleSave(post.id)}
            onShare={() => void handleShare(post)}
            onEdit={() => handleEdit(post.id)}
            onDelete={() => void handleDelete(post.id)}
          />
        ))}

        {!loading && myPosts.length === 0 ? (
          <ThemedText style={[styles.empty, { color: palette.textMuted }]}>Bạn chưa có bài viết nào.</ThemedText>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: moderateScale(18) },
  headerSpacer: { width: moderateScale(40) },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  hint: { fontSize: moderateScale(13), marginBottom: Spacing.sm },
  empty: { textAlign: 'center', marginTop: Spacing.xl },
});
