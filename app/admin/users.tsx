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
      'Xác nhận xóa',
      `Bạn có muốn xóa người dùng "${user.fullName || user.username}" không? Hành động này không thể hoàn tác!`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Xóa người dùng',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(user.id);
              await reload();
              Alert.alert('Thành công', 'Đã xóa người dùng thành công.');
            } catch (error) {
              Alert.alert('Không xóa được', error instanceof Error ? error.message : 'Lỗi không xác định.');
            }
          },
        },
      ]
    );
  }

  function handleAddUser() {
    Alert.alert('Chức năng thêm người dùng sẽ được cập nhật sau!');
  }

  return (
    <AdminShell title="Quản lý người dùng" subtitle="Quản lý tài khoản, vai trò và trạng thái truy cập.">
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
              </View>
              <View style={[styles.rolePill, { backgroundColor: isAdmin ? '#D8F2EC' : palette.surfaceMuted }]}> 
                <Text style={[Typography.caption, { color: palette.text }]}>{user.role || 'USER'}</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <Button
                title="Xóa"
                variant="danger"
                onPress={() => handleDeleteUser(user)}
              />
            </View>
          </Card>
        );
      })}

      {!loading && users.length === 0 ? (
        <Card>
          <Text style={[Typography.body, { color: palette.textMuted }]}>Chưa có người dùng nào.</Text>
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
