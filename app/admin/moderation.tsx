import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdminShell } from '@/components/admin/admin-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAdminDashboard } from '@/hooks/use-admin-dashboard';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteCommunityPost, type CommunityPost } from '@/utils/api';
import { getSessionUserId } from '@/utils/session';

export default function AdminModerationScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { moderationQueue, loading, reload } = useAdminDashboard();
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);

  async function handleDelete(postId: number) {
    const userId = getSessionUserId();
    if (!userId) return;

    try {
      await deleteCommunityPost(postId, userId);
      await reload();
    } catch (error) {
      Alert.alert('Không xóa được bài viết', error instanceof Error ? error.message : 'Lỗi không xác định.');
    }
  }

  function confirmDelete(postId: number) {
    Alert.alert(
      'Xóa bài viết',
      'Bạn có chắc chắn muốn xóa bài viết này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đồng ý', style: 'destructive', onPress: () => void handleDelete(postId) },
      ]
    );
  }

  function handleReview(post: CommunityPost) {
    setSelectedPost(post);
  }

  return (
    <AdminShell title="Quản lý Bài viết Cộng đồng" subtitle="Kiểm duyệt bảng tin, xử lý nội dung báo cáo và bảo vệ cộng đồng.">
      {moderationQueue.map((post) => (
        <Card key={post.id} style={styles.postCard}>
          <View style={styles.postHead}>
            <View style={[styles.postIcon, { backgroundColor: '#FCE1E5' }]}>
              <Ionicons name="flag-outline" size={18} color="#D95168" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.bodySemi, { color: palette.text }]} numberOfLines={1}>
                {post.title}
              </Text>
              <Text style={[Typography.caption, { color: palette.textMuted }]}>
                {post.authorFullName || post.authorUsername || `User ${post.userId}`} · {post.location || 'Không có vị trí'}
              </Text>
            </View>
            <Pressable onPress={() => handleReview(post)}>
              <View style={[styles.queuePill, { backgroundColor: '#FCE1E5' }]}>
                <Text style={[Typography.caption, { color: '#D95168', fontWeight: '700' }]}>Review</Text>
              </View>
            </Pressable>
          </View>

          <Text style={[Typography.body, { color: palette.textMuted }]} numberOfLines={3}>
            {post.content || 'Bài viết chưa có nội dung mô tả.'}
          </Text>

          <View style={styles.actions}>
            <Button title="Xóa bài viết" onPress={() => confirmDelete(post.id)} />
          </View>
        </Card>
      ))}

      {!loading && moderationQueue.length === 0 ? (
        <Card>
          <Text style={[Typography.body, { color: palette.textMuted }]}>Không có bài viết nào trong hàng đợi cần xem xét.</Text>
        </Card>
      ) : null}

      <Modal visible={!!selectedPost} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[Typography.title, { color: palette.text }]}>Chi tiết bài viết</Text>
              <Pressable onPress={() => setSelectedPost(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={palette.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {selectedPost && (
                <>
                  <Text style={[Typography.titleLG, { color: palette.text }]}>{selectedPost.title}</Text>
                  <Text style={[Typography.caption, { color: palette.textMuted, marginBottom: Spacing.md }]}>
                    Bởi {selectedPost.authorFullName || selectedPost.authorUsername} · {selectedPost.location || 'Không có vị trí'}
                  </Text>
                  
                  {(selectedPost.imageUrls && selectedPost.imageUrls.length > 0) ? (
                    selectedPost.imageUrls.map((url, i) => (
                      <Image key={i} source={{ uri: url }} style={styles.modalImage} resizeMode="cover" />
                    ))
                  ) : selectedPost.imageUrl ? (
                    <Image source={{ uri: selectedPost.imageUrl }} style={styles.modalImage} resizeMode="cover" />
                  ) : null}

                  <Text style={[Typography.body, { color: palette.text, marginVertical: Spacing.md }]}>
                    {selectedPost.content || 'Không có nội dung mô tả.'}
                  </Text>

                  {selectedPost.budget ? (
                    <Text style={[Typography.bodySemi, { color: palette.text }]}>Ngân sách: {selectedPost.budget.toLocaleString('vi-VN')} VND</Text>
                  ) : null}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  postCard: {
    gap: Spacing.md,
  },
  postHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  postIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queuePill: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  modalScroll: {
    flex: 1,
  },
  modalImage: {
    width: '100%',
    height: 250,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
});
