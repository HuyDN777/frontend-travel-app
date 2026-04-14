import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AdminShell } from '@/components/admin/admin-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAdminDashboard } from '@/hooks/use-admin-dashboard';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { updateAdminUserRole, deleteUser, type UserProfile } from '@/utils/api';
import { getSessionUserId } from '@/utils/session';

export default function AdminUsersScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { users, loading, reload } = useAdminDashboard();


  async function handleDeleteUser(user: UserProfile) {
    Alert.alert(
      'Xoá người dùng',
      `Bạn có chắc muốn xoá tài khoản ${user.fullName || user.username}?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(user.id);
              await reload();
            } catch (error) {
              Alert.alert('Không xoá được', error instanceof Error ? error.message : 'Lỗi không xác định.');
            }
          },
        },
      ]
    );
  }

  return (
    <AdminShell title="Manage Users" subtitle="Quản trị tài khoản, role và trạng thái truy cập của hệ thống.">

      {users.map((user) => {
        const isAdmin = (user.role ?? '').toUpperCase() === 'ADMIN';
        const daysRegistered = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        return (
          <Card key={user.id} style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={[styles.avatarStub, { backgroundColor: isAdmin ? '#D8F2EC' : '#F4E9D6' }]}> 
                <Ionicons name={isAdmin ? 'shield-checkmark-outline' : 'person-outline'} size={18} color={palette.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.bodySemi, { color: palette.text }]}> 
                  {user.fullName || user.username}
                </Text>
                <Text style={[Typography.caption, { color: palette.textMuted }]}>{user.email}</Text>
                <Text style={[Typography.caption, { color: palette.textMuted }]}>Đăng ký {daysRegistered} ngày</Text>
              </View>
              <View style={[styles.rolePill, { backgroundColor: isAdmin ? '#D8F2EC' : palette.surfaceMuted }]}> 
                <Text style={[Typography.caption, { color: palette.text }]}>{user.role || 'USER'}</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <Button
                title="Xoá"
                variant="danger"
                onPress={() => handleDeleteUser(user)}
              />
            </View>
          </Card>
        );
      })}

      {!loading && users.length === 0 ? (
        <Card>
          <Text style={[Typography.body, { color: palette.textMuted }]}>Chưa có dữ liệu người dùng.</Text>
        </Card>
      ) : null}
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  userCard: {
    gap: Spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarStub: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rolePill: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
