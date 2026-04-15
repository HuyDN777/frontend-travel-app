import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useState } from 'react';

import { AdminShell } from '@/components/admin/admin-shell';
import { Card } from '@/components/ui/card';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SettingItem = {
  key: string;
  title: string;
  description: string;
  defaultValue: boolean;
};

const settingItems: SettingItem[] = [
  {
    key: 'otp',
    title: 'Email OTP',
    description: 'Yêu cầu xác thực email cho các tài khoản mới.',
    defaultValue: true,
  },
  {
    key: 'moderation',
    title: 'Community Moderation',
    description: 'Bật hàng chờ moderation trước khi bài viết vào feed.',
    defaultValue: true,
  },
  {
    key: 'payments',
    title: 'Payment Webhooks',
    description: 'Theo dõi callback thanh toán và kiểm tra integrity.',
    defaultValue: true,
  },
  {
    key: 'maintenance',
    title: 'Maintenance Banner',
    description: 'Hiển thị cảnh báo bảo trì trên app người dùng.',
    defaultValue: false,
  },
];

export default function AdminSettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [values, setValues] = useState<Record<string, boolean>>(
    Object.fromEntries(settingItems.map((item) => [item.key, item.defaultValue]))
  );

  return (
    <AdminShell title="App Settings" subtitle="Các cấu hình quản trị và bảo mật áp dụng ở lớp dashboard hiện tại.">
      {settingItems.map((item) => (
        <Card key={item.key} style={styles.settingCard}>
          <View style={[styles.settingIcon, { backgroundColor: '#F4E9D6' }]}>
            <Ionicons name="settings-outline" size={18} color={palette.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[Typography.bodySemi, { color: palette.text }]}>{item.title}</Text>
            <Text style={[Typography.body, { color: palette.textMuted }]}>{item.description}</Text>
          </View>
          <Switch
            value={Boolean(values[item.key])}
            onValueChange={(next) => setValues((prev) => ({ ...prev, [item.key]: next }))}
            trackColor={{ false: palette.border, true: palette.primary }}
          />
        </Card>
      ))}

      <Card>
        <Text style={[Typography.bodySemi, { color: palette.text }]}>Ghi chú triển khai</Text>
        <Text style={[Typography.body, { color: palette.textMuted, marginTop: Spacing.sm }]}>
          Các toggle này đang là lớp cấu hình phía client cho dashboard tách biệt. Nếu cần cấu hình hệ thống thật,
          bước tiếp theo là nối thêm API backend cho settings và audit log.
        </Text>
      </Card>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
