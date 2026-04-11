import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { moderateScale } from '@/utils/responsive';
import { resolveMediaUrl, type CommunityPost } from '@/utils/api';

type Props = {
  post: CommunityPost;
  canEdit: boolean;
  onLike: () => void;
  onSave: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function CommunityPostCard({ post, canEdit, onLike, onSave, onEdit, onDelete }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const timeLabel = formatPostTime(post.createdAt);
  const budgetLabel = typeof post.budget === 'number'
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(post.budget)
    : null;

  return (
    <Card style={styles.card} padded={false}>
      <View style={styles.content}>
        <View style={styles.authorRow}>
          <Image
            source={{ uri: resolveMediaUrl(post.avatarUrl) || 'https://i.pravatar.cc/100?img=12' }}
            style={[styles.avatar, { borderColor: palette.border }]}
          />
          <View style={styles.authorMeta}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>{post.username || 'traveler'}</ThemedText>
            <ThemedText style={[styles.meta, { color: palette.textMuted }]}>{timeLabel}</ThemedText>
          </View>
        </View>

        <View style={styles.titleRow}>
          <Ionicons name="bookmark-outline" size={moderateScale(16)} color={palette.primary} />
          <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.titleText}>{post.title}</ThemedText>
        </View>

        {post.location ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={moderateScale(14)} color={palette.textMuted} />
            <ThemedText style={[styles.meta, { color: palette.textMuted }]}>{post.location}</ThemedText>
          </View>
        ) : null}

        {post.content ? (
          <ThemedText numberOfLines={3} style={[styles.body, { color: palette.textMuted }]}>
            {post.content}
          </ThemedText>
        ) : null}

        {budgetLabel ? (
          <View style={[styles.budgetChip, { borderColor: palette.border, backgroundColor: palette.surfaceMuted }]}>
            <Ionicons name="wallet-outline" size={moderateScale(14)} color={palette.textMuted} />
            <ThemedText style={[styles.budgetText, { color: palette.textMuted }]}>{budgetLabel}</ThemedText>
          </View>
        ) : null}

        {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.image} contentFit="cover" /> : null}

        <View style={styles.actionRow}>
          <Pressable onPress={onLike} style={styles.actionBtn}>
            <Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={moderateScale(16)} color={palette.text} />
            <ThemedText style={styles.actionText}>{post.likeCount}</ThemedText>
          </Pressable>

          <Pressable onPress={onSave} style={styles.actionBtn}>
            <Ionicons name={post.isSaved ? 'bookmark' : 'bookmark-outline'} size={moderateScale(16)} color={palette.text} />
            <ThemedText style={styles.actionText}>{post.saveCount}</ThemedText>
          </Pressable>

          {canEdit ? (
            <>
              <Pressable onPress={onEdit} style={styles.actionBtn}>
                <Ionicons name="create-outline" size={moderateScale(16)} color={palette.text} />
              </Pressable>
              <Pressable onPress={onDelete} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={moderateScale(16)} color={palette.danger} />
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: moderateScale(190),
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    borderWidth: 1,
  },
  authorMeta: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  titleText: {
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  meta: {
    fontSize: moderateScale(13),
  },
  body: {
    fontSize: moderateScale(14),
    lineHeight: moderateScale(20),
  },
  budgetChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  budgetText: {
    fontSize: moderateScale(13),
  },
  image: {
    width: '100%',
    height: moderateScale(190),
    borderRadius: Radius.lg,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: moderateScale(13),
  },
});

function formatPostTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
