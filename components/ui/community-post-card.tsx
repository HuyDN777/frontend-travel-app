import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
// eslint-disable-next-line import/no-unresolved -- expo-media-library is a declared dependency; resolver may not resolve Expo packages
import * as MediaLibrary from 'expo-media-library';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

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
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function CommunityPostCard({ post, canEdit, onLike, onSave, onShare, onEdit, onDelete }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { width } = useWindowDimensions();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const closingPreviewRef = useRef(false);

  const images = useMemo(() => {
    if (post.imageUrls && post.imageUrls.length) {
      return post.imageUrls;
    }
    return post.imageUrl ? [post.imageUrl] : [];
  }, [post.imageUrl, post.imageUrls]);

  const authorName = post.authorFullName || post.authorUsername || `Người dùng ${post.userId}`;
  const normalizedTitle = (post.title ?? '').trim();

  const postedTime = useMemo(() => {
    const date = new Date(post.createdAt);
    if (Number.isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  }, [post.createdAt]);

  const previewImage = previewIndex !== null ? images[previewIndex] : null;

  function handleOpenPreview(index: number) {
    if (closingPreviewRef.current) return;
    setPreviewIndex(index);
  }

  function handleClosePreview() {
    closingPreviewRef.current = true;
    setPreviewIndex(null);
    setTimeout(() => {
      closingPreviewRef.current = false;
    }, 220);
  }

  async function handleSavePreviewImage() {
    if (!previewImage) return;

    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Quyền truy cập', 'Cần quyền thư viện ảnh để lưu ảnh về máy.');
      return;
    }

    try {
      const fileName = `community-${Date.now()}.jpg`;
      const target = `${FileSystem.cacheDirectory ?? ''}${fileName}`;
      const downloaded = await FileSystem.downloadAsync(previewImage, target);
      await MediaLibrary.createAssetAsync(downloaded.uri);
      Alert.alert('Đã lưu', 'Ảnh đã được lưu vào thư viện.');
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message ?? 'Không thể lưu ảnh');
    }
  }

  return (
    <Card style={styles.card} padded={false}>
      <View style={styles.authorRow}>
        <View style={styles.authorInfo}>
          <Image
            source={{ uri: post.authorAvatarUrl || 'https://i.pravatar.cc/80?img=12' }}
            style={styles.authorAvatar}
            contentFit="cover"
          />
          <View>
            <ThemedText type="defaultSemiBold">{authorName}</ThemedText>
            <ThemedText style={[styles.timeText, { color: palette.textMuted }]}>{postedTime}</ThemedText>
          </View>
        </View>
      </View>

      {images.length === 1 ? (
        <Pressable onPress={() => handleOpenPreview(0)}>
          <Image source={{ uri: images[0] }} style={[styles.imageLarge, { width: width - moderateScale(48) }]} contentFit="cover" />
        </Pressable>
      ) : null}

      {images.length === 2 ? (
        <View style={styles.grid2}>
          {images.map((url, idx) => (
            <Pressable key={`${url}-${idx}`} style={styles.grid2Item} onPress={() => handleOpenPreview(idx)}>
              <Image source={{ uri: url }} style={styles.imageGrid} contentFit="cover" />
            </Pressable>
          ))}
        </View>
      ) : null}

      {images.length >= 3 ? (
        <View style={[styles.grid3Wrap, { width: width - moderateScale(48) }]}>
          <Pressable style={styles.grid3Left} onPress={() => handleOpenPreview(0)}>
            <Image source={{ uri: images[0] }} style={styles.imageGrid} contentFit="cover" />
          </Pressable>
          <View style={styles.grid3Right}>
            <Pressable style={styles.grid3RightTop} onPress={() => handleOpenPreview(1)}>
              <Image source={{ uri: images[1] }} style={styles.imageGrid} contentFit="cover" />
            </Pressable>
            <Pressable style={styles.grid3RightBottom} onPress={() => handleOpenPreview(2)}>
              <Image source={{ uri: images[2] }} style={styles.imageGrid} contentFit="cover" />
              {images.length > 3 ? (
                <View style={styles.moreOverlay}>
                  <ThemedText style={styles.moreText}>+{images.length - 3}</ThemedText>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.content}>
        {normalizedTitle ? (
          <View style={styles.metaIconRow}>
            <Ionicons name="newspaper-outline" size={moderateScale(14)} color={palette.textMuted} />
            <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.metaText}>{normalizedTitle}</ThemedText>
          </View>
        ) : null}
        {post.location ? (
          <View style={styles.metaIconRow}>
            <Ionicons name="location-outline" size={moderateScale(14)} color={palette.textMuted} />
            <ThemedText style={[styles.meta, { color: palette.textMuted }]}>{post.location}</ThemedText>
          </View>
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

          <Pressable onPress={onShare} style={styles.actionBtn}>
            <Ionicons name="share-social-outline" size={moderateScale(16)} color={palette.text} />
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

      <Modal visible={previewIndex !== null} transparent animationType="fade" onRequestClose={handleClosePreview}>
        <View style={styles.modalBackdrop}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: (previewIndex ?? 0) * width, y: 0 }}
            onMomentumScrollEnd={(event) => {
              if (previewIndex === null) return;
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              setPreviewIndex(nextIndex);
            }}
          >
            {images.map((uri, idx) => (
              <View key={`${uri}-${idx}-preview`} style={[styles.modalImageWrap, { width }]}>
                <Image source={{ uri }} style={styles.modalImage} contentFit="contain" />
              </View>
            ))}
          </ScrollView>

          <Pressable style={styles.modalSaveBtn} onPress={() => void handleSavePreviewImage()}>
            <Ionicons name="download-outline" size={moderateScale(22)} color="#FFF" />
          </Pressable>

          <Pressable style={styles.modalCloseBtn} onPress={handleClosePreview}>
            <Ionicons name="close" size={moderateScale(22)} color="#FFF" />
          </Pressable>
        </View>
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  authorRow: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  authorAvatar: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: Radius.pill,
  },
  timeText: {
    fontSize: moderateScale(12),
  },
  imageLarge: {
    height: moderateScale(300),
  },
  imageGrid: {
    width: '100%',
    height: '100%',
  },
  grid2: {
    flexDirection: 'row',
    gap: 1,
    height: moderateScale(320),
  },
  grid2Item: {
    flex: 1,
  },
  grid3Wrap: {
    flexDirection: 'row',
    gap: 1,
    height: moderateScale(420),
  },
  grid3Left: {
    flex: 2,
  },
  grid3Right: {
    flex: 1,
    gap: 1,
  },
  grid3RightTop: {
    flex: 1,
  },
  grid3RightBottom: {
    flex: 1,
    position: 'relative',
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    color: '#FFF',
    fontSize: moderateScale(22),
    fontWeight: '700',
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  metaIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    flex: 1,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  modalImageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  modalImage: {
    width: '100%',
    height: '80%',
  },
  modalSaveBtn: {
    position: 'absolute',
    right: Spacing.lg,
    top: Spacing.xl,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    left: Spacing.lg,
    top: Spacing.xl,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
