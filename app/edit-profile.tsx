import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AccessGate } from '@/components/auth/access-gate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getMyProfile, updateMyProfile, uploadAvatar } from '@/utils/api';
import { moderateScale } from '@/utils/responsive';
import { clearSessionUser, getSessionUser, getSessionUserId, setSessionUser } from '@/utils/session';

export default function EditProfileScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handlePickAvatarFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Quyền truy cập', 'Cần cấp quyền truy cập thư viện ảnh');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    const userId = getSessionUserId();
    if (!userId) {
      router.replace('/login');
      return;
    }

    try {
      setLoading(true);
      const uploaded = await uploadAvatar(uri, userId);
      setAvatarUrl(uploaded.avatarUrl);
      const session = getSessionUser();
      if (session) {
        setSessionUser({
          ...session,
          avatarUrl: uploaded.avatarUrl,
        });
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message ?? 'Không thể cập nhật ảnh đại diện');
    } finally {
      setLoading(false);
    }
  }

  async function handleTakeAvatarPhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Quyền truy cập', 'Cần cấp quyền truy cập camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });
    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    const userId = getSessionUserId();
    if (!userId) {
      router.replace('/login');
      return;
    }

    try {
      setLoading(true);
      const uploaded = await uploadAvatar(uri, userId);
      setAvatarUrl(uploaded.avatarUrl);
      const session = getSessionUser();
      if (session) {
        setSessionUser({
          ...session,
          avatarUrl: uploaded.avatarUrl,
        });
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message ?? 'Không thể cập nhật ảnh đại diện');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const userId = getSessionUserId();
    if (!userId) {
      router.replace('/login');
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const profile = await getMyProfile(userId);
        if (!mounted) return;
        setFullName(profile.fullName ?? '');
        setEmail(profile.email ?? '');
        setUsername(profile.username ?? '');
        setAvatarUrl(profile.avatarUrl ?? '');
      } catch (error: any) {
        Alert.alert('Lỗi', error?.message ?? 'Không tải được hồ sơ');
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSave() {
    const userId = getSessionUserId();
    if (!userId) {
      router.replace('/login');
      return;
    }

    try {
      setLoading(true);
      await updateMyProfile({
        fullName,
        email,
        username,
        avatarUrl,
        currentPassword: showPasswordForm ? currentPassword : undefined,
        password: showPasswordForm && newPassword.trim() ? newPassword : undefined,
      }, userId);
      setSessionUser({
        id: userId,
        username,
        email,
        fullName,
        avatarUrl,
        role: getSessionUser()?.role,
      });
      Alert.alert('Thành công', 'Đã cập nhật hồ sơ');
      router.back();
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message ?? 'Không thể cập nhật hồ sơ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AccessGate required="user">
      <ThemedView style={styles.root}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Button title="Trở lại" variant="ghost" onPress={() => router.back()} />
          <ThemedText type="defaultSemiBold">Chỉnh sửa hồ sơ</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.form}>
            <View style={styles.avatarBox}>
              <Image source={{ uri: avatarUrl || 'https://i.pravatar.cc/100?img=12' }} style={styles.avatar} contentFit="cover" />
              <View style={styles.avatarActions}>
                <Button title="Chọn ảnh" variant="secondary" onPress={handlePickAvatarFromLibrary} />
                <Button title="Chụp ảnh" variant="secondary" onPress={handleTakeAvatarPhoto} />
              </View>
            </View>


            <View style={{ marginBottom: 8 }}>
              <ThemedText style={{ marginBottom: 4, color: '#A6A29A', fontSize: 14 }}>Họ và tên</ThemedText>
              <Input placeholder="Nhập họ và tên" value={fullName} onChangeText={setFullName} />
            </View>
            <View style={{ marginBottom: 8 }}>
              <ThemedText style={{ marginBottom: 4, color: '#A6A29A', fontSize: 14 }}>Email</ThemedText>
              <Input placeholder="Nhập email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            </View>
            <View style={{ marginBottom: 8 }}>
              <ThemedText style={{ marginBottom: 4, color: '#A6A29A', fontSize: 14 }}>Tên đăng nhập</ThemedText>
              <Input placeholder="Nhập tên đăng nhập" value={username} onChangeText={setUsername} autoCapitalize="none" />
            </View>

            <Pressable onPress={() => setShowPasswordForm((prev) => !prev)}>
              <ThemedText type="defaultSemiBold">Đổi mật khẩu</ThemedText>
            </Pressable>

            {showPasswordForm ? (
              <>
                <Input
                  placeholder="Mật khẩu hiện tại"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                />
                <Input placeholder="Mật khẩu mới" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
              </>
            ) : null}

            <Button title="Lưu thay đổi" size="lg" onPress={handleSave} loading={loading} />
            <Button
              title="Đăng xuất"
              variant="ghost"
              onPress={() => {
                clearSessionUser();
                router.replace('/login');
              }}
            />
          </Card>
        </ScrollView>
      </ThemedView>
    </AccessGate>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    padding: Spacing.lg,
  },
  form: {
    gap: Spacing.md,
    borderRadius: Radius.xl,
  },
  avatarBox: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: moderateScale(92),
    height: moderateScale(92),
    borderRadius: Radius.pill,
  },
  avatarActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
