import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Tab phụ — mô tả use case mục 4 (không thêm tính năng ngoài phạm vi).
 */
export default function Uc04InfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const steps = [
    'Chatbot hỏi lần lượt: điểm đến, số ngày, sở thích, ngân sách, ngày bắt đầu (tuỳ chọn).',
    'Sau khi xác nhận tóm tắt, hệ thống gọi dịch vụ AI (hoặc demo cùng schema).',
    'Nhận lịch theo ngày: điểm thăm, ước tính thời gian, gợi ý nhà hàng.',
    'Duyệt, bật/tắt từng hoạt động, chỉnh sửa nội dung nếu cần, tạo lại gợi ý.',
    'Áp dụng → chuyển thành DayPlan (draft), lưu qua planDraftStore.',
  ];

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[Typography.titleXL, { color: palette.text }]}>Mục 4 — Chatbot lịch AI</Text>
        <Text style={[Typography.body, { color: palette.textMuted, marginTop: Spacing.sm }]}>
          Giao diện hội thoại: thu tham số qua chat → gọi AI → duyệt lịch → DayPlan nháp.
        </Text>

        <Card style={{ marginTop: Spacing.lg }}>
          {steps.map((s, i) => (
            <View key={i} style={[styles.stepRow, i > 0 && { marginTop: Spacing.md }]}>
              <View style={[styles.stepNum, { backgroundColor: palette.primary }]}>
                <Text style={[Typography.caption, { color: '#0B1B18', fontWeight: '800' }]}>{i + 1}</Text>
              </View>
              <Text style={[Typography.body, { color: palette.text, flex: 1 }]}>{s}</Text>
            </View>
          ))}
        </Card>

        <Button
          title="Bắt đầu thiết kế lịch trình cùng Hà"
          onPress={() => router.push('/ai-itinerary')}
          size="lg"
          style={{ marginTop: Spacing.xl }}
        />
        <View style={[styles.hint, { marginTop: Spacing.md }]}>
          <Ionicons name="document-text-outline" size={18} color={palette.textMuted} />
          <Text style={[Typography.caption, { color: palette.textMuted, flex: 1 }]}>
            Chi tiết kỹ thuật & API: README.md, BAO_CAO_PHAN_4.md
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
