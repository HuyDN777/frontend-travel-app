import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CommunityPostCard } from '@/components/ui/community-post-card';
import { Input } from '@/components/ui/input';
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

export default function CommunityScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const filteredPosts = posts.filter((post) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [post.title, post.content, post.location, post.authorFullName, post.authorUsername]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });

  const loadFeed = useCallback(async () => {
    const userId = getSessionUserId();
    if (!userId) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    try {
      const feed = await getCommunityFeed(userId);
      setPosts(feed);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Không tải được bảng tin cộng đồng';
      Alert.alert('Lỗi', msg);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  async function handleRefresh() {
    const userId = getSessionUserId();
    if (!userId) {
      router.replace('/login');
      return;
    }

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
    const userId = getSessionUserId();
    if (!userId) {
      router.replace('/login');
      return;
    }

    try {
      await toggleLike(postId, userId);
      await loadFeed();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Không thực hiện được';
      Alert.alert('Lỗi', msg);
    }
  }

  async function handleSave(postId: number) {
    const userId = getSessionUserId();
    if (!userId) {
      router.replace('/login');
      return;
    }

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
      await Share.share({ message: message || 'Xem bai viet du lich nay nhe!' });
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
          try {
            const userId = getSessionUserId();
            if (!userId) {
              router.replace('/login');
              return;
            }
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
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Cộng đồng
        </ThemedText>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/community-post-editor')}
            style={[styles.iconBtn, { backgroundColor: palette.primary }]}
            accessibilityLabel="Viết bài">
            <Ionicons name="add" size={moderateScale(18)} color="#0B1B18" />
          </Pressable>
          <Pressable
            onPress={() => router.push('/ai-itinerary')}
            style={[styles.iconBtnOutline, { borderColor: palette.border, backgroundColor: palette.surface }]}
            accessibilityLabel="Trợ lý lịch AI">
            <Ionicons name="sparkles-outline" size={moderateScale(18)} color={palette.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />}
      >
        <Input
          placeholder="Tim bai viet, dia diem, tac gia..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />

        {filteredPosts.map((post) => (
          <CommunityPostCard
            key={post.id}
            post={post}
            canEdit={post.userId === getSessionUserId()}
            onLike={() => void handleLike(post.id)}
            onSave={() => void handleSave(post.id)}
            onShare={() => void handleShare(post)}
            onEdit={() => handleEdit(post.id)}
            onDelete={() => void handleDelete(post.id)}
          />
        ))}

        {!loading && filteredPosts.length === 0 ? (
          <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>Chưa có bài viết nào.</ThemedText>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: moderateScale(26),
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnOutline: {
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
