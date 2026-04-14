import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { CommunityPostCard } from '@/components/ui/community-post-card';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getMyProfile,
  getMyTrips,
  getSavedCommunityPosts,
  toggleSave,
  type CommunityPost,
  type TripItem,
  type UserProfile,
} from '@/utils/api';
import { moderateScale } from '@/utils/responsive';
import { getSessionUser, getSessionUserId } from '@/utils/session';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'trips' | 'saved'>('trips');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [savedPosts, setSavedPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const isAdmin = (getSessionUser()?.role ?? '').toUpperCase() === 'ADMIN';

  const displayName = useMemo(() => profile?.fullName || profile?.username || 'Hello Traveler', [profile]);
  const displayHandle = useMemo(() => profile?.email || 'user@example.com', [profile]);

  async function loadProfileAndTrips() {
    const userId = getSessionUserId();
    if (!userId) {
      router.replace('/login');
      return;
    }

    try {
      setLoading(true);
      const [me, myTrips] = await Promise.all([getMyProfile(userId), getMyTrips(userId)]);
      setProfile(me);
      setTrips(myTrips);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message ?? 'Không tải được hồ sơ');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfileAndTrips();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadProfileAndTrips();
      return undefined;
    }, [])
  );

  useEffect(() => {
    if (activeTab !== 'saved') return;

    (async () => {
      const userId = getSessionUserId();
      if (!userId) {
        router.replace('/login');
        return;
      }

      try {
        setLoading(true);
        const data = await getSavedCommunityPosts(userId);
        setSavedPosts(data);
      } catch (error: any) {
        Alert.alert('Lỗi', error?.message ?? 'Không tải được bài viết đã lưu');
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTab]);

  const TRIP_IMAGES = [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1504150558240-0b4fd8946624?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=900&q=80'
  ];

  async function handleUnsave(postId: number) {
    const userId = getSessionUserId();
    if (!userId) {
      router.replace('/login');
      return;
    }

    try {
      await toggleSave(postId, userId);
      const data = await getSavedCommunityPosts(userId);
      setSavedPosts(data);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message ?? 'Không thể bỏ lưu bài viết');
    }
  }

  async function handleShare(post: CommunityPost) {
    try {
      const message = [post.title, post.content, post.location].filter(Boolean).join('\n');
      await Share.share({ message: message || 'Xem bai viet du lich nay nhe!' });
    } catch {
      Alert.alert('Lỗi', 'Không thể chia sẻ bài viết');
    }
  }

  return (
    <ThemedView style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xl }]} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={[styles.profileInfo, { flex: 1 }]}>
            <Image
              source={{ uri: profile?.avatarUrl || 'https://i.pravatar.cc/100?img=12' }}
              style={styles.avatar}
            />
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={1}>{displayName}</ThemedText>
              <ThemedText style={[styles.handle, { color: palette.textMuted }]} numberOfLines={1}>{displayHandle}</ThemedText>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <TouchableOpacity onPress={() => router.push('/notifications')} style={{ padding: Spacing.xs }}>
              <Ionicons name="notifications-outline" size={24} color={palette.text} />
            </TouchableOpacity>
            <View style={{ alignItems: 'flex-end', gap: Spacing.xs }}>
              <Button title="Hồ sơ" variant="secondary" style={{ minWidth: 100, borderRadius: 24, paddingHorizontal: 12, height: 36 }} onPress={() => router.push('/edit-profile')} />
              {isAdmin ? <Button title="Bảng quản trị" variant="ghost" onPress={() => router.push('/admin' as any)} /> : null}
            </View>
          </View>
        </View>

        <View style={[styles.tabRow, { borderBottomColor: palette.border }]}>
          {(['trips', 'saved'] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <Pressable key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
                <ThemedText type="defaultSemiBold" style={{ color: active ? palette.text : palette.textMuted }}>
                  {tab === 'trips' ? 'Chuyến đi' : 'Đã lưu'}
                </ThemedText>
                {active ? <View style={[styles.tabUnderline, { backgroundColor: palette.primary }]} /> : null}
              </Pressable>
            );
          })}
        </View>

        {activeTab === 'trips' ? (
          <>
            <Pressable
              onPress={() => router.push('/name-trip')}
              style={[styles.newTripBtn, { borderColor: palette.border, backgroundColor: palette.surface }]}
            >
              <Ionicons name="add" size={moderateScale(18)} color={palette.textMuted} />
              <ThemedText style={{ color: palette.textMuted }}>Lên kế hoạch chuyến mới</ThemedText>
            </Pressable>

            {trips.map((trip) => {
              const start = new Date(trip.startDate);
              const end = new Date(trip.endDate);
              const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
              const imgUri = TRIP_IMAGES[(trip.id || 0) % TRIP_IMAGES.length];

              return (
                <TouchableOpacity key={trip.id} style={[styles.tripCardCustom, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <Image source={{ uri: imgUri }} style={styles.tripCardImage} contentFit="cover" />
                  <View style={styles.tripCardBadge}>
                    <ThemedText style={styles.tripCardBadgeText}>{days} ngày</ThemedText>
                  </View>
                  <View style={styles.tripCardContent}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>{trip.tripName}</ThemedText>
                      <Ionicons name="ellipsis-horizontal" size={20} color={palette.textMuted} />
                    </View>
                    <View style={[styles.tripMetaRow, { marginTop: Spacing.sm }]}>
                      <Ionicons name="calendar-outline" size={14} color={palette.textMuted} />
                      <ThemedText style={{ color: palette.textMuted, fontSize: 13 }}>
                        {trip.startDate} - {trip.endDate}
                      </ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>
              )
            })}

            {!loading && trips.length === 0 ? (
              <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>Chưa có chuyến đi nào.</ThemedText>
            ) : null}
          </>
        ) : (
          <>
            {savedPosts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                canEdit={false}
                onLike={() => { }}
                onSave={() => handleUnsave(post.id)}
                onShare={() => void handleShare(post)}
                onEdit={() => { }}
                onDelete={() => { }}
              />
            ))}

            {!loading && savedPosts.length === 0 ? (
              <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>Chưa có bài viết đã lưu.</ThemedText>
            ) : null}
          </>
        )}

        <View style={styles.bottomSpace} />
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
    gap: Spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerBtnGroup: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  avatar: {
    width: moderateScale(52),
    height: moderateScale(52),
    borderRadius: Radius.pill,
  },
  name: {
    fontSize: moderateScale(28),
    lineHeight: moderateScale(34),
  },
  handle: {
    fontSize: moderateScale(13),
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    gap: Spacing['2xl'],
  },
  tabItem: {
    paddingBottom: Spacing.sm,
    position: 'relative',
  },
  tabUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: moderateScale(2),
    borderRadius: Radius.pill,
  },
  newTripBtn: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  tripCard: {
    gap: Spacing.sm,
  },
  tripMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  bottomSpace: {
    height: Spacing['2xl'],
  },
  tripCardCustom: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: Spacing.md,
  },
  tripCardImage: {
    width: '100%',
    height: 140,
  },
  tripCardBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.md,
    opacity: 0.9,
  },
  tripCardBadgeText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  tripCardContent: {
    padding: Spacing.lg,
  },
});
