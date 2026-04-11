import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CommunityPostCard } from '@/components/ui/community-post-card';
import { Input } from '@/components/ui/input';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  deleteCommunityPost,
  getCommunityFeed,
  searchCommunityPosts,
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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadFeed = useCallback(async (query?: string) => {
    const userId = getSessionUserId();
    if (!userId) {
      router.replace('/login');
      return;
    }

    setLoading(true);
    try {
      const feed = query && query.trim()
        ? await searchCommunityPosts(query, userId)
        : await getCommunityFeed(userId);
      setPosts(feed);
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Khong tai duoc community feed');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadFeed(searchQuery);
  }, [loadFeed]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadFeed(searchQuery);
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchQuery, loadFeed]);

  async function handleRefresh() {
    const userId = getSessionUserId();
    if (!userId) {
      router.replace('/login');
      return;
    }

    try {
      setRefreshing(true);
      const feed = searchQuery.trim()
        ? await searchCommunityPosts(searchQuery, userId)
        : await getCommunityFeed(userId);
      setPosts(feed);
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Khong refresh duoc feed');
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
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Khong the like bai viet');
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
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Khong the save bai viet');
    }
  }

  function handleEdit(postId: number) {
    router.push({ pathname: '/community-post-editor', params: { postId: String(postId) } });
  }

  async function handleDelete(postId: number) {
    Alert.alert('Delete post', 'Ban co chac muon xoa bai viet?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
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
          } catch (error: any) {
            Alert.alert('Error', error?.message ?? 'Khong the xoa bai viet');
          }
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.root}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Community Guides</ThemedText>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/community-post-editor')}
            style={[styles.createBtn, { backgroundColor: palette.primary }]}
          >
            <Ionicons name="add" size={moderateScale(18)} color={palette.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Input
          placeholder="Search posts, places, moments"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          leading={<Ionicons name="search-outline" size={moderateScale(18)} color={palette.textMuted} />}
          trailing={searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle-outline" size={moderateScale(18)} color={palette.textMuted} />
            </Pressable>
          ) : null}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {posts.map((post) => (
          <CommunityPostCard
            key={post.id}
            post={post}
            canEdit={post.userId === getSessionUserId()}
            onLike={() => handleLike(post.id)}
            onSave={() => handleSave(post.id)}
            onEdit={() => handleEdit(post.id)}
            onDelete={() => handleDelete(post.id)}
          />
        ))}

        {!loading && posts.length === 0 ? (
          <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>No posts yet.</ThemedText>
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
    fontSize: moderateScale(28),
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  createBtn: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
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
