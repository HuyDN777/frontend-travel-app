import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CommunityPostCard } from '@/components/ui/community-post-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'trips' | 'saved'>('trips');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [savedPosts, setSavedPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const isAdmin = (getSessionUser()?.role ?? '').toUpperCase() === 'ADMIN';

  const displayName = useMemo(() => profile?.fullName || 'Hello Traveler', [profile]);
  const displayHandle = useMemo(() => profile?.username ? `@${profile.username}` : '@traveler', [profile]);

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
      Alert.alert('Error', error?.message ?? 'Khong tai duoc profile');
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
        Alert.alert('Error', error?.message ?? 'Khong tai duoc saved posts');
      } finally {
        setLoading(false);
      }
    })();
  }, [activeTab]);

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
      Alert.alert('Error', error?.message ?? 'Khong the bo save bai viet');
    }
  }

  async function handleShare(post: CommunityPost) {
    try {
      const message = [post.title, post.content, post.location].filter(Boolean).join('\n');
      await Share.share({ message: message || 'Xem bai viet du lich nay nhe!' });
    } catch {
      Alert.alert('Error', 'Khong the chia se bai viet');
    }
  }

  return (
    <ThemedView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.profileInfo}>
            <Image
              source={{ uri: profile?.avatarUrl || 'https://i.pravatar.cc/100?img=12' }}
              style={styles.avatar}
            />
            <View>
              <ThemedText type="defaultSemiBold" style={styles.name}>{displayName}</ThemedText>
              <ThemedText style={[styles.handle, { color: palette.textMuted }]}>{displayHandle}</ThemedText>
            </View>
          </View>

          <View style={styles.headerBtnGroup}>
            <Button title="Edit Profile" variant="secondary" onPress={() => router.push('/edit-profile')} />
            {isAdmin ? <Button title="Admin Panel" variant="ghost" onPress={() => router.push('/admin-panel' as any)} /> : null}
          </View>
        </View>

        <View style={[styles.tabRow, { borderBottomColor: palette.border }]}>
          {(['trips', 'saved'] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <Pressable key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
                <ThemedText type="defaultSemiBold" style={{ color: active ? palette.text : palette.textMuted }}>
                  {tab === 'trips' ? 'My Trips' : 'Saved'}
                </ThemedText>
                {active ? <View style={[styles.tabUnderline, { backgroundColor: palette.primary }]} /> : null}
              </Pressable>
            );
          })}
        </View>

        {activeTab === 'trips' ? (
          <>
            <Pressable
              onPress={() => router.push('/(tabs)/create-trip')}
              style={[styles.newTripBtn, { borderColor: palette.border, backgroundColor: palette.surface }]}
            >
              <Ionicons name="add" size={moderateScale(18)} color={palette.textMuted} />
              <ThemedText style={{ color: palette.textMuted }}>Plan a new trip</ThemedText>
            </Pressable>

            {trips.map((trip) => (
              <Card key={trip.id} style={styles.tripCard}>
                <ThemedText type="defaultSemiBold">{trip.tripName}</ThemedText>
                <View style={styles.tripMetaRow}>
                  <Ionicons name="calendar-outline" size={moderateScale(14)} color={palette.textMuted} />
                  <ThemedText style={{ color: palette.textMuted }}>
                    {trip.startDate} - {trip.endDate}
                  </ThemedText>
                </View>
                <ThemedText style={{ color: palette.textMuted }}>{trip.destination}</ThemedText>
              </Card>
            ))}

            {!loading && trips.length === 0 ? (
              <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>No trips yet.</ThemedText>
            ) : null}
          </>
        ) : (
          <>
            {savedPosts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                canEdit={false}
                onLike={() => {}}
                onSave={() => handleUnsave(post.id)}
                onShare={() => void handleShare(post)}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            ))}

            {!loading && savedPosts.length === 0 ? (
              <ThemedText style={[styles.emptyText, { color: palette.textMuted }]}>No saved community posts.</ThemedText>
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
});
