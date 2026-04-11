import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const destinations = [
  {
    id: 'hanoi',
    title: 'Hà Nội',
    subtitle: 'Phố cổ & ẩm thực đường phố',
    image:
      'https://images.unsplash.com/photo-1509030450996-93f2e3d54238?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'danang',
    title: 'Đà Nẵng',
    subtitle: 'Biển xanh & Bà Nà Hills',
    image:
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=900&q=80',
  },
];

/**
 * Trang chủ: lối tắt đặt vé + banner AI (mục 4) theo code nhóm.
 */
export default function HomeScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/100?img=12' }}
              style={[styles.avatar, { borderColor: palette.border }]}
            />
            <View>
              <Text style={[Typography.caption, { color: palette.textMuted }]}>Chào mừng</Text>
              <Text style={[Typography.titleLG, { color: palette.text }]}>Bạn đồng hành</Text>
            </View>
          </View>
        </View>

        <View style={[styles.search, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="search-outline" size={18} color={palette.textMuted} />
          <Text style={[Typography.body, { color: palette.textMuted }]}>Bạn muốn đi đâu?</Text>
        </View>

        <View style={styles.quickGrid}>
          {[
            { icon: 'airplane-outline', label: 'Chuyến bay', route: '/flights', active: true },
            { icon: 'car-outline', label: 'Xe di chuyển', active: false },
            { icon: 'restaurant-outline', label: 'Nhà hàng', active: false },
            { icon: 'bed-outline', label: 'Khách sạn', active: false },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.quickItemWrap}
              activeOpacity={0.85}
              onPress={() => {
                if (item.route) {
                  router.push(item.route as '/flights');
                }
              }}>
              <Card style={styles.quickCard}>
                <View style={[styles.quickIcon, { backgroundColor: '#F6EEDA' }]}>
                  <Ionicons name={item.icon as 'airplane-outline'} size={16} color={palette.text} />
                </View>
                <Text style={[Typography.bodySemi, { color: palette.text }]}>{item.label}</Text>
                <Text style={[Typography.caption, styles.quickHint, { color: palette.textMuted }]}>
                  {item.active ? 'Mở để đặt vé' : 'Sắp ra mắt'}
                </Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHead}>
          <Text style={[Typography.titleLG, styles.sectionTitle, { color: palette.text }]}>
            Điểm đến nổi bật
          </Text>
          <View style={[styles.viewAll, { backgroundColor: '#2F3338' }]}>
            <Text style={[Typography.caption, { color: '#FFF' }]}>Xem tất cả</Text>
          </View>
        </View>

        <View style={styles.destinationRow}>
          {destinations.map((item) => (
            <View key={item.id} style={styles.destinationCard}>
              <Image source={{ uri: item.image }} style={styles.destinationImage} contentFit="cover" />
              <View style={styles.destinationOverlay}>
                <Text style={[Typography.titleLG, styles.destinationTitle]}>{item.title}</Text>
                <Text style={[Typography.body, styles.destinationSubtitle]}>{item.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => router.push('/ai-itinerary')}
          style={({ pressed }) => [
            styles.aiBanner,
            { backgroundColor: palette.surface, borderColor: palette.border, opacity: pressed ? 0.92 : 1 },
          ]}>
          <View style={[styles.aiBannerIcon, { backgroundColor: palette.primary }]}>
            <Ionicons name="sparkles" size={24} color="#0B1B18" />
          </View>
          <View style={styles.aiBannerText}>
            <Text style={[Typography.titleLG, { color: palette.text }]}>Chatbot gợi ý lịch AI</Text>
            <Text style={[Typography.body, { color: palette.textMuted }]}>
              Trò chuyện để gửi số ngày, sở thích, ngân sách; nhận lịch theo ngày rồi duyệt / sửa / áp dụng
              DayPlan nháp.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={palette.textMuted} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  quickItemWrap: {
    width: '48%',
  },
  quickCard: {
    width: '100%',
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  quickHint: {
    textAlign: 'center',
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    flex: 1,
  },
  viewAll: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  destinationRow: {
    gap: Spacing.md,
  },
  destinationCard: {
    height: 160,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Elevation.card,
  },
  destinationImage: {
    ...StyleSheet.absoluteFillObject,
  },
  destinationOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  destinationTitle: {
    color: '#FFF',
  },
  destinationSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: Spacing.xs,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: 1,
    ...Elevation.card,
  },
  aiBannerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBannerText: {
    flex: 1,
    gap: Spacing.sm,
  },
});
