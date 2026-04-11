import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { moderateScale } from '@/utils/responsive';
import type { CommunityPost } from '@/utils/api';

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

  return (
    <Card style={styles.card} padded={false}>
      {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.image} contentFit="cover" /> : null}

      <View style={styles.content}>
        <ThemedText type="defaultSemiBold" numberOfLines={2}>{post.title}</ThemedText>
        {post.location ? (
          <ThemedText style={[styles.meta, { color: palette.textMuted }]}>{post.location}</ThemedText>
        ) : null}
        {post.content ? (
          <ThemedText numberOfLines={3} style={[styles.body, { color: palette.textMuted }]}>
            {post.content}
          </ThemedText>
        ) : null}

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
  meta: {
    fontSize: moderateScale(13),
  },
  body: {
    fontSize: moderateScale(14),
    lineHeight: moderateScale(20),
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
