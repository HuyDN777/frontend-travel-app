import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Colors, Elevation, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Trang chủ tối giản — phạm vi đồ án: chỉ UC-04 (gợi ý lịch AI).
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
              <Text style={[Typography.caption, { color: palette.textMuted }]}>Xin chào,</Text>
              <Text style={[Typography.titleLG, { color: palette.text }]}>Hà</Text>
            </View>
          </View>
        </View>

        <Card style={styles.scopeCard}>
          <Text style={[Typography.caption, { color: palette.accent, fontWeight: '700' }]}>
            Phạm vi đồ án
          </Text>
          <Text style={[Typography.body, { color: palette.textMuted, marginTop: Spacing.xs }]}>
            Chỉ triển khai mục 4: gửi số ngày, sở thích, ngân sách tham khảo (và ngữ cảnh điểm đến, ngày) →
            nhận lịch gợi ý → duyệt / chỉnh sửa → áp dụng DayPlan nháp.
          </Text>
        </Card>

        <Pressable
          onPress={() => router.push('/ai-itinerary')}
          style={({ pressed }) => [
            styles.aiBanner,
            { backgroundColor: palette.surface, borderColor: palette.border, opacity: pressed ? 0.92 : 1 },
          ]}
        >
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
  scopeCard: {
    paddingVertical: Spacing.lg,
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
