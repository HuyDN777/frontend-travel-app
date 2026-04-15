import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { AdminShell } from '@/components/admin/admin-shell';
import { Card } from '@/components/ui/card';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAdminDashboard } from '@/hooks/use-admin-dashboard';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AdminLogsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { metrics, moderationQueue, weeklyPosts } = useAdminDashboard();

  const logLines = [
    `${metrics.totalUsers} hồ sơ người dùng đã được tải vào bảng điều khiển.`,
    `${metrics.totalPosts} bài viết cộng đồng sẵn sàng để quản lý.`,
    `${metrics.adminUsers} tài khoản quản trị viên đang hoạt động.`,
    `Đã phát hiện ${weeklyPosts.reduce((sum, item) => sum + item.count, 0)} bài viết mới trong 7 ngày qua.`
  ];

  return (
    <AdminShell title="Nhật ký hệ thống" subtitle="Tổng hợp log vận hành và tín hiệu an toàn ngay trong khu vực admin.">
      {logLines.map((line, index) => (
        <Card key={line} style={styles.logCard}>
          <View style={[styles.logIcon, { backgroundColor: index % 2 === 0 ? '#E8F1EF' : '#F4E9D6' }]}>
            <Ionicons
              name={index % 2 === 0 ? 'pulse-outline' : 'document-text-outline'}
              size={18}
              color={palette.text}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[Typography.caption, { color: palette.textMuted }]}>Nhật ký {String(index + 1).padStart(2, '0')}</Text>
            <Text style={[Typography.body, { color: palette.text }]}>{line}</Text>
          </View>
          <View style={[styles.okPill, { backgroundColor: '#E8F1EF' }]}>
            <Text style={[Typography.caption, { color: '#51605D', fontWeight: '700' }]}>OK</Text>
          </View>
        </Card>
      ))}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okPill: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
});
