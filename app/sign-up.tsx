import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SocialOAuthButton } from '@/components/ui/social-oauth-button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { register } from '@/utils/api';
import { moderateScale } from '@/utils/responsive';
import { setSessionUser } from '@/utils/session';

export default function SignUpScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ các ô bắt buộc.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mật khẩu', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      setLoading(true);
      const auth = await register({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      });
      setSessionUser({
        id: auth.id,
        username: auth.username,
        email: auth.email,
        fullName: auth.fullName,
        avatarUrl: auth.avatarUrl,
        role: auth.role,
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Đăng ký thất bại', error?.message ?? 'Không tạo được tài khoản.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card padded={false} style={styles.heroCard}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=1200&q=80' }}
            style={styles.heroImage}
            contentFit="cover"
          />
        </Card>

        <View style={styles.form}>
          <ThemedText type="title" style={styles.title}>
            Tạo tài khoản
          </ThemedText>
          <ThemedText style={{ color: palette.textMuted }}>Bắt đầu hành trình của bạn hôm nay</ThemedText>

          <Input placeholder="Họ và tên" value={fullName} onChangeText={setFullName} />
          <Input placeholder="Tên đăng nhập" value={username} onChangeText={setUsername} autoCapitalize="none" />
          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input placeholder="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry />
          <Input
            placeholder="Xác nhận mật khẩu"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <Button title="Đăng ký" size="lg" onPress={handleSignUp} loading={loading} />

          <View style={styles.socialRow}>
            <SocialOAuthButton
              provider="google"
              label="Google"
              onPress={() => Alert.alert('Thông báo', 'Đăng ký bằng Google sẽ được bổ sung sau.')}
            />
            <SocialOAuthButton
              provider="apple"
              label="Apple"
              onPress={() => Alert.alert('Thông báo', 'Đăng ký bằng Apple sẽ được bổ sung sau.')}
            />
          </View>

          <Pressable onPress={() => router.replace('/login')}>
            <ThemedText style={[styles.switchText, { color: palette.primary }]}>
              Đã có tài khoản? Đăng nhập
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  heroCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: moderateScale(210),
  },
  form: {
    gap: Spacing.md,
  },
  title: {
    fontSize: moderateScale(34),
    lineHeight: moderateScale(36),
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  switchText: {
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
