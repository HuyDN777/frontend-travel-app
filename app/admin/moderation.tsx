import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AdminShell } from '@/components/admin/admin-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAdminDashboard } from '@/hooks/use-admin-dashboard';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteCommunityPost } from '@/utils/api';
import { getSessionUserId } from '@/utils/session';

export default function AdminModerationScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { moderationQueue, loading, reload } = useAdminDashboard();

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

  return (
    <AdminShell title="Moderate Community Posts" subtitle="Review feed, xử lý nội dung và làm sạch bảng tin cộng đồng.">
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
            <View style={[styles.queuePill, { backgroundColor: '#FCE1E5' }]}>
              <Text style={[Typography.caption, { color: '#D95168', fontWeight: '700' }]}>Review</Text>
            </View>
          </View>

          <Text style={[Typography.body, { color: palette.textMuted }]} numberOfLines={3}>
            {post.content || 'Bài viết chưa có nội dung mô tả.'}
          </Text>

          <View style={styles.actions}>
            <Button title="Giữ lại" variant="secondary" onPress={() => {}} />
            <Button title="Xóa bài viết" onPress={() => void handleDelete(post.id)} />
          </View>
        </Card>
      ))}

      {!loading && moderationQueue.length === 0 ? (
        <Card>
          <Text style={[Typography.body, { color: palette.textMuted }]}>Không có bài viết nào trong queue moderation.</Text>
        </Card>
      ) : null}
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
});
