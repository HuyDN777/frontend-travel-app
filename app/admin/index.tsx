import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { AdminShell } from '@/components/admin/admin-shell';
import { Card } from '@/components/ui/card';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useAdminDashboard } from '@/hooks/use-admin-dashboard';
import { useColorScheme } from '@/hooks/use-color-scheme';

type MenuCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  badge?: string;
  badgeTone?: 'neutral' | 'danger';
  onPress: () => void;
};

function MenuCard({ icon, title, subtitle, badge, badgeTone = 'neutral', onPress }: MenuCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.menuCard}>
        <View style={[styles.menuIconWrap, { backgroundColor: '#F4E9D6' }]}>
          <Ionicons name={icon} size={22} color={palette.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[Typography.bodySemi, { color: palette.text, fontSize: 18 }]}>{title}</Text>
          <Text style={[Typography.body, { color: palette.textMuted }]}>{subtitle}</Text>
        </View>
        {badge ? (
          <View
            style={[
              styles.menuBadge,
              { backgroundColor: badgeTone === 'danger' ? '#FFD9DF' : '#E8F1EF' },
            ]}>
            <Text
              style={[
                Typography.caption,
                { color: badgeTone === 'danger' ? '#E04C62' : '#51605D', fontWeight: '700', textAlign: 'center' },
              ]}>
              {badge}
            </Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
      </Card>
    </Pressable>
  );
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { error, loading, metrics, weeklyPosts, moderationQueue, reload } = useAdminDashboard();

  return (
    <AdminShell
      title="Admin Panel"
      subtitle="Khu vực quản trị riêng cho vận hành, kiểm soát người dùng và hệ thống."
      rightAction={
        <Pressable
          onPress={() => void reload()}
          style={[styles.refreshBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="refresh-outline" size={18} color={palette.text} />
        </Pressable>
      }>
      {error ? (
        <Card style={[styles.errorCard, { borderColor: '#F0B7C0' }]}>
          <Text style={[Typography.body, { color: palette.danger }]}>{error}</Text>
        </Card>
      ) : null}

      <View style={styles.statsGrid}>
        <Card style={styles.statCardSmall}>
          <View style={styles.metricIconSmall}>
            <Ionicons name="people-outline" size={18} color={palette.text} />
          </View>
          <Text style={styles.metricValueSmall}>{metrics.totalUsers.toLocaleString('vi-VN')}</Text>
          <Text style={styles.metricLabelSmall}>User</Text>
        </Card>
        <Card style={styles.statCardSmall}>
          <View style={styles.metricIconSmall}>
            <Ionicons name="bar-chart-outline" size={18} color={palette.text} />
          </View>
          <Text style={styles.metricValueSmall}>{metrics.activeUsers.toLocaleString('vi-VN')}</Text>
          <Text style={styles.metricLabelSmall}>Daily</Text>
        </Card>
      </View>

      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={[Typography.bodySemi, { color: palette.text }]}>Hoạt động cộng đồng 7 ngày</Text>
            <Text style={[Typography.caption, { color: palette.textMuted }]}>
              Bài viết mới dùng để theo dõi nhịp hoạt động và moderation queue.
            </Text>
          </View>
          <View style={[styles.chartChip, { backgroundColor: palette.surfaceMuted }]}>
            <Text style={[Typography.caption, { color: palette.textMuted }]}>
              {metrics.postsToday} hôm nay
            </Text>
          </View>
        </View>

        <View style={styles.chartBars}>
          {weeklyPosts.map((item) => (
            <View key={item.key} style={styles.chartColumn}>
              <View style={[styles.chartTrack, { backgroundColor: palette.surfaceMuted }]}>
                <View
                  style={[
                    styles.chartFill,
                    {
                      backgroundColor: palette.primary,
                      height: `${Math.max((item.count / item.max) * 100, item.count > 0 ? 18 : 6)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[Typography.caption, { color: palette.textMuted }]}>{item.label}</Text>
              <Text style={[Typography.caption, { color: palette.text }]}>{item.count}</Text>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.sectionHead}>
        <Text style={[styles.sectionLabel, { color: '#9E9A8F' }]}>MANAGEMENT</Text>
        {loading ? <Text style={[Typography.caption, { color: palette.textMuted }]}>Đang tải...</Text> : null}
      </View>

      <MenuCard
        icon="people-outline"
        title="Manage Users"
        subtitle="View and edit user accounts"
        badge={`${metrics.adminUsers} admin`}
        onPress={() => router.push('/admin/users')}
      />
      <MenuCard
        icon="shield-checkmark-outline"
        title="Moderate Community Posts"
        subtitle="Review content and moderate feed"
        badge={`${moderationQueue.length} queued`}
        badgeTone="danger"
        onPress={() => router.push('/admin/moderation')}
      />
      <MenuCard
        icon="settings-outline"
        title="App Settings"
        subtitle="General configuration and security preferences"
        onPress={() => router.push('/admin/settings')}
      />

      <Pressable
        onPress={() => router.push('/admin/logs')}
        style={[styles.logsButton, { borderColor: '#D8CFBF', backgroundColor: palette.background }]}>
        <Ionicons name="information-circle-outline" size={18} color={palette.textMuted} />
        <Text style={[Typography.bodySemi, { color: '#B0A897' }]}>View System Logs</Text>
      </Pressable>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
    statCardSmall: {
      flex: 1,
      minWidth: 0,
      height: 90,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
      backgroundColor: '#F8F6F2',
      borderWidth: 1,
      borderColor: '#E8E3D8',
      ...Elevation.card,
      padding: 0,
      gap: 2,
    },
    metricIconSmall: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F4E9D6',
      marginBottom: 2,
    },
    metricValueSmall: {
      fontSize: 22,
      fontWeight: '700',
      color: '#222',
      marginBottom: 0,
      marginTop: 2,
    },
    metricLabelSmall: {
      fontSize: 13,
      color: '#A6A29A',
      fontWeight: '500',
      marginTop: 2,
    },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    borderWidth: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: 230,
    ...Elevation.card,
  },
  metricHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  metricIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  chartCard: {
    gap: Spacing.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  chartChip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  chartTrack: {
    width: '100%',
    maxWidth: 36,
    height: 120,
    borderRadius: Radius.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  chartFill: {
    width: '100%',
    borderRadius: Radius.md,
  },
  sectionHead: {
    marginTop: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 112,
  },
  menuIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBadge: {
    minWidth: 76,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  logsButton: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
