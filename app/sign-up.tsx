import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccessGate } from '@/components/auth/access-gate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SocialOAuthButton } from '@/components/ui/social-oauth-button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { completeRegistration, sendOTP, verifyOTP } from '@/utils/api';
import { moderateScale } from '@/utils/responsive';
import { setSessionUser } from '@/utils/session';

export default function SignUpScreen() {
  const OTP_RESEND_COOLDOWN_SECONDS = 60;

  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Validate email format
  const isValidEmail = (emailStr: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  async function handleSendOtp() {
    if (sendingOtp) {
      return;
    }

    if (resendCooldown > 0) {
      return;
    }

    if (!email.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email trước khi gửi OTP.');
      return;
    }
    if (!isValidEmail(email.trim())) {
      Alert.alert('Email không hợp lệ', 'Vui lòng nhập email đúng định dạng.');
      return;
    }

    try {
      setSendingOtp(true);
      await sendOTP({ email: email.trim() });
      setOtpSent(true);
      setOtpVerified(false);
      setOtpCode('');
      setResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
      Alert.alert('Thành công', 'Mã OTP đã được gửi đến email của bạn.');
    } catch (error: any) {
      Alert.alert('Lỗi gửi OTP', error?.message ?? 'Không thể gửi mã xác thực.');
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otpSent) {
      Alert.alert('Chưa gửi OTP', 'Vui lòng bấm Xác thực email để lấy mã OTP trước.');
      return;
    }
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      Alert.alert('OTP không hợp lệ', 'Vui lòng nhập mã OTP gồm 6 chữ số.');
      return;
    }

    try {
      setVerifyingOtp(true);
      await verifyOTP({
        email: email.trim(),
        otpCode: otpCode.trim(),
      });
      setOtpVerified(true);
      Alert.alert('Thành công', 'Email đã được xác thực OTP.');
    } catch (error: any) {
      setOtpVerified(false);
      Alert.alert('Xác nhận OTP thất bại', error?.message ?? 'Mã OTP không hợp lệ hoặc đã hết hạn.');
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function handleSignUp() {
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ các ô bắt buộc.');
      return;
    }

    if (!isValidEmail(email.trim())) {
      Alert.alert('Email không hợp lệ', 'Vui lòng nhập email đúng định dạng.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Mật khẩu', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Mật khẩu', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (!otpVerified) {
      Alert.alert('Chưa xác thực email', 'Vui lòng xác thực OTP cho email trước khi đăng ký.');
      return;
    }

    try {
      setLoading(true);
      const auth = await completeRegistration({
        username: username.trim(),
        password,
        email: email.trim(),
        fullName: fullName.trim(),
      });

      setSessionUser({
        id: auth.id,
        username: auth.username,
        email: auth.email,
        fullName: auth.fullName,
        avatarUrl: auth.avatarUrl,
        role: auth.role,
      });

      Alert.alert('Đăng ký thành công', 'Tài khoản đã được tạo và email đã xác thực.');
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Đăng ký thất bại', error?.message ?? 'Không tạo được tài khoản.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AccessGate required="guest">
      <ThemedView style={styles.root}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <ScrollView
            contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.sm }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          >
            <Card padded={false} style={styles.heroCard}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1555921015-5532091f6026?auto=format&fit=crop&w=1200&q=80' }}
                style={styles.heroImage}
                contentFit="cover"
              />
            </Card>

            <View style={styles.form}>
              <ThemedText type="title" style={styles.title}>
                Tạo tài khoản
              </ThemedText>
              <ThemedText style={{ color: palette.textMuted }}>Bắt đầu hành trình của bạn hôm nay</ThemedText>

              <Input
                placeholder="Nhập họ và tên"
                value={fullName}
                onChangeText={setFullName}
                editable={!loading && !sendingOtp && !verifyingOtp}
              />
              <Input
                placeholder="Nhập tên đăng nhập"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!loading && !sendingOtp && !verifyingOtp}
              />
              <View style={styles.inlineRow}>
                <Input
                  style={styles.flexInput}
                  placeholder="Nhập email"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setOtpVerified(false);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading && !sendingOtp && !verifyingOtp}
                />
                <Button
                  title={
                    sendingOtp
                      ? 'Đang gửi...'
                      : resendCooldown > 0
                        ? `Gửi lại (${resendCooldown}s)`
                        : otpSent
                          ? 'Gửi lại'
                          : 'Xác thực email'
                  }
                  onPress={handleSendOtp}
                  loading={sendingOtp}
                  disabled={loading || verifyingOtp || sendingOtp || resendCooldown > 0}
                  style={resendCooldown > 0 ? [styles.inlineButton, styles.disabledInlineButton] : styles.inlineButton}
                  size="md"
                />
              </View>

              <View style={styles.inlineRow}>
                <Input
                  style={styles.flexInput}
                  placeholder="Nhập OTP 6 số"
                  value={otpCode}
                  onChangeText={(value) => {
                    setOtpCode(value);
                    setOtpVerified(false);
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading && !sendingOtp && !verifyingOtp}
                />
                <Button
                  title={otpVerified ? 'Đã xác nhận' : 'Xác nhận'}
                  onPress={handleVerifyOtp}
                  loading={verifyingOtp}
                  disabled={loading || sendingOtp || verifyingOtp || otpCode.trim().length !== 6}
                  style={styles.inlineButton}
                  size="md"
                  variant={otpVerified ? 'secondary' : 'primary'}
                />
              </View>

              {otpVerified ? (
                <ThemedText style={{ color: palette.success }}>Email đã xác thực thành công.</ThemedText>
              ) : otpSent ? (
                <ThemedText style={{ color: palette.textMuted }}>
                  {resendCooldown > 0
                    ? `Vui lòng nhập OTP đã gửi tới email. Có thể gửi lại sau ${resendCooldown}s.`
                    : 'Vui lòng nhập OTP đã gửi tới email để tiếp tục.'}
                </ThemedText>
              ) : null}

              <Input
                placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading && !sendingOtp && !verifyingOtp}
              />
              <Input
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                editable={!loading && !sendingOtp && !verifyingOtp}
              />

              <Button
                title="Đăng ký"
                onPress={handleSignUp}
                loading={loading}
                disabled={loading || sendingOtp || verifyingOtp}
                style={styles.button}
                size="lg"
              />

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

              <Pressable onPress={() => router.replace('/login')} disabled={loading}>
                <ThemedText style={[styles.switchText, { color: palette.primary }]}>
                  Đã có tài khoản? Đăng nhập
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ThemedView>
    </AccessGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: moderateScale(40),
  },
  heroCard: {
    marginBottom: moderateScale(24),
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    aspectRatio: 2,
  },
  form: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  flexInput: {
    flex: 1,
  },
  inlineButton: {
    minWidth: 112,
  },
  disabledInlineButton: {
    opacity: 0.55,
  },
  title: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  button: {
    marginTop: Spacing.md,
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
