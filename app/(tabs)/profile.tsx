import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { CommunityPostCard } from '@/components/ui/community-post-card';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  deleteTrip,
  getMyProfile,
  getMyTrips,
  getSavedCommunityPosts,
  getTripJournal,
  resolveMediaUrl,
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
  const [tripCoverById, setTripCoverById] = useState<Record<number, string>>({});
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

      // Lấy ảnh bìa từ dữ liệu ảnh đã chọn khi tạo lịch trình (activeDays/stops).
      const coversFromTripList: Record<number, string> = {};
      const missingTripIds: number[] = [];

      for (const trip of myTrips) {
        const firstImage = getFirstSelectedTripImage(trip);
        if (firstImage) {
          coversFromTripList[trip.id] = firstImage;
        } else {
          missingTripIds.push(trip.id);
        }
      }

      setTripCoverById(coversFromTripList);

      // Nếu API getMyTrips chưa trả ảnh chi tiết, fallback đọc từ trip-journal.
      if (missingTripIds.length > 0) {
        const settled = await Promise.allSettled(
          missingTripIds.map(async (tripId) => {
            const journal = await getTripJournal(tripId);
            const cover = getFirstSelectedTripImage(journal);
            return { tripId, cover };
          })
        );

        const fromJournal: Record<number, string> = {};
        for (const item of settled) {
          if (item.status === 'fulfilled' && item.value.cover) {
            fromJournal[item.value.tripId] = item.value.cover;
          }
        }

        if (Object.keys(fromJournal).length > 0) {
          setTripCoverById((prev) => ({ ...prev, ...fromJournal }));
        }
      }
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

  function toValidImage(url: unknown): string {
    if (typeof url !== 'string') return '';
    const normalized = resolveMediaUrl(url).trim();
    if (!normalized || normalized === 'null' || normalized === 'undefined') return '';
    if (!/^https?:\/\//i.test(normalized) && !normalized.startsWith('data:')) return '';
    return normalized;
  }

  function getFirstSelectedTripImage(source: any): string {
    const daysRaw = source?.activeDays ?? source?.days ?? [];
    const days = Array.isArray(daysRaw) ? [...daysRaw] : [];

    days.sort((a: any, b: any) => {
      const aIdx = Number(a?.dayIndex ?? a?.dayNumber ?? 0);
      const bIdx = Number(b?.dayIndex ?? b?.dayNumber ?? 0);
      return aIdx - bIdx;
    });

    for (const day of days) {
      const places = day?.places ?? day?.stops ?? [];
      if (!Array.isArray(places)) continue;
      for (const place of places) {
        const candidates: unknown[] = [
          place?.imageUrl,
          place?.post?.imageUrl,
          place?.previewImageUrl,
          place?.thumbnail
        ];
        for (const c of candidates) {
          const valid = toValidImage(c);
          if (valid) return valid;
        }
      }
    }

    // Fallback khi chuyến đi chưa có stops/places.
    const fallbackCandidates: unknown[] = [
      source?.imageUrl,
      source?.coverImageUrl,
      source?.thumbnail,
      source?.trip?.imageUrl,
      source?.trip?.coverImageUrl
    ];
    for (const c of fallbackCandidates) {
      const valid = toValidImage(c);
      if (valid) return valid;
    }

    return '';
  }

  function handleTripOptions(trip: TripItem) {
    const isOwner = trip.userId === profile?.id;

    const options: any[] = [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xem chi tiết', onPress: () => router.push({ pathname: '/trip-details', params: { tripId: trip.id } }) },
    ];

    if (isOwner) {
      options.push({ text: 'Xóa chuyến đi', style: 'destructive', onPress: () => confirmDeleteTrip(trip) });
    }

    Alert.alert('Tùy chọn', `Chuyến đi: ${trip.tripName}`, options);
  }

  function confirmDeleteTrip(trip: TripItem) {
    Alert.alert('Xác nhận xóa', `Bạn có chắc muốn xóa chuyến đi "${trip.tripName}"? Lịch trình và thành viên sẽ bị xóa vĩnh viễn.`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            setLoading(true);
            await deleteTrip(trip.id);
            setTrips(prev => prev.filter(t => t.id !== trip.id));
            Alert.alert('Thành công', 'Đã xóa chuyến đi.');
          } catch (error: any) {
            Alert.alert('Lỗi', error?.message ?? 'Không thể xóa chuyến đi.');
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  }

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
              source={{
                uri: (() => {
                  const url = profile?.avatarUrl;
                  if (!url || typeof url !== 'string') return 'https://i.pravatar.cc/100?img=12';
                  const t = url.trim();
                  if (t === '' || t === 'null' || t === 'undefined' || !t.startsWith('http')) return 'https://i.pravatar.cc/100?img=12';
                  return t;
                })()
              }}
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
              const imgUri = tripCoverById[trip.id] ?? '';

              return (
                <TouchableOpacity key={trip.id} style={[styles.tripCardCustom, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  {imgUri ? (
                    <Image source={{ uri: imgUri }} style={styles.tripCardImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.tripCardImage, { backgroundColor: palette.border }]} />
                  )}
                  <View style={styles.tripCardBadge}>
                    <ThemedText style={styles.tripCardBadgeText}>{days} ngày</ThemedText>
                  </View>
                  <View style={styles.tripCardContent}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <ThemedText type="defaultSemiBold" style={{ fontSize: 18, flex: 1 }} numberOfLines={1}>{trip.tripName}</ThemedText>
                      <TouchableOpacity onPress={() => handleTripOptions(trip)} style={{ paddingLeft: Spacing.sm, paddingVertical: 4 }}>
                        <Ionicons name="ellipsis-horizontal" size={20} color={palette.textMuted} />
                      </TouchableOpacity>
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
