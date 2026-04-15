import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccessGate } from '@/components/auth/access-gate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { login, resolveMediaUrl, resetForgotPassword, sendForgotPasswordOTP, verifyForgotPasswordOTP } from '@/utils/api';
import { moderateScale } from '@/utils/responsive';
import { setSessionUser } from '@/utils/session';

type ForgotStep = 'otp' | 'password';

export default function LoginScreen() {
  const OTP_COOLDOWN_SECONDS = 60;

  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const insets = useSafeAreaInsets();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>('otp');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [sendingForgotOtp, setSendingForgotOtp] = useState(false);
  const [verifyingForgotOtp, setVerifyingForgotOtp] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [forgotOtpCooldown, setForgotOtpCooldown] = useState(0);

  useEffect(() => {
    if (forgotOtpCooldown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setForgotOtpCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [forgotOtpCooldown]);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  function openForgotModal() {
    setShowForgotModal(true);
    setForgotStep('otp');
    setForgotOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
  }

  function closeForgotModal() {
    setShowForgotModal(false);
    setForgotStep('otp');
    setForgotOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
  }

  async function handleLogin() {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email hoặc tên đăng nhập và mật khẩu.');
      return;
    }

    try {
      setLoading(true);
      const auth = await login({ identifier: identifier.trim(), password });
      setSessionUser({
        id: auth.id,
        username: auth.username,
        email: auth.email,
        fullName: auth.fullName,
        avatarUrl: resolveMediaUrl(auth.avatarUrl),
        role: auth.role,
      });
      if ((auth.role ?? '').toUpperCase() === 'ADMIN') {
        router.replace('/admin');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      const message = String(error?.message ?? '').toLowerCase();
      const friendlyMessage =
        message.includes('internal server error') || message.includes('500')
          ? 'Sai tên đăng nhập hoặc mật khẩu.'
          : (error?.message ?? 'Sai thông tin hoặc máy chủ không phản hồi.');
      Alert.alert('Đăng nhập thất bại', friendlyMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendForgotOtp() {
    if (sendingForgotOtp || forgotOtpCooldown > 0) {
      return;
    }

    if (!forgotEmail.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email để nhận OTP.');
      return;
    }

    if (!isValidEmail(forgotEmail.trim())) {
      Alert.alert('Email không hợp lệ', 'Vui lòng nhập email đúng định dạng.');
      return;
    }

    try {
      setSendingForgotOtp(true);
      await sendForgotPasswordOTP({ email: forgotEmail.trim() });
      setForgotOtpCooldown(OTP_COOLDOWN_SECONDS);
      Alert.alert('Thành công', 'OTP đã được gửi tới email của bạn.');
    } catch (error: any) {
      Alert.alert('Gửi OTP thất bại', error?.message ?? 'Không thể gửi OTP lúc này.');
    } finally {
      setSendingForgotOtp(false);
    }
  }

  async function handleVerifyForgotOtp() {
    if (!forgotEmail.trim() || !forgotOtp.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email và OTP.');
      return;
    }

    if (forgotOtp.trim().length !== 6) {
      Alert.alert('OTP không hợp lệ', 'Mã OTP cần đủ 6 chữ số.');
      return;
    }

    try {
      setVerifyingForgotOtp(true);
      await verifyForgotPasswordOTP({
        email: forgotEmail.trim(),
        otpCode: forgotOtp.trim(),
      });
      setForgotStep('password');
      Alert.alert('Thành công', 'OTP hợp lệ. Hãy nhập mật khẩu mới.');
    } catch (error: any) {
      Alert.alert('OTP không hợp lệ', error?.message ?? 'Vui lòng kiểm tra lại OTP.');
    } finally {
      setVerifyingForgotOtp(false);
    }
  }

  async function handleResetPassword() {
    if (!newPassword.trim() || !confirmNewPassword.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập mật khẩu mới và xác nhận mật khẩu.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Mật khẩu', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Mật khẩu', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    try {
      setResettingPassword(true);
      await resetForgotPassword({
        email: forgotEmail.trim(),
        newPassword,
      });

      Alert.alert('Thành công', 'Đổi mật khẩu thành công. Bạn có thể đăng nhập lại.');
      setIdentifier(forgotEmail.trim());
      setPassword('');
      closeForgotModal();
    } catch (error: any) {
      Alert.alert('Đổi mật khẩu thất bại', error?.message ?? 'Không thể đổi mật khẩu.');
    } finally {
      setResettingPassword(false);
    }
  }

  return (
    <AccessGate required="guest">
      <ThemedView style={styles.root}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.sm }]} showsVerticalScrollIndicator={false}>
          <Card padded={false} style={styles.heroCard}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80' }}
              style={styles.heroImage}
              contentFit="cover"
            />
            <View style={styles.heroShade} />
            <View style={styles.heroOverlay}>
              <ThemedText type="title" style={styles.heroTitle}>Chào mừng trở lại</ThemedText>
              <ThemedText style={styles.heroSubtitle}>
                Lưu giữ và lên lịch những chuyến đi của bạn.
              </ThemedText>
            </View>
          </Card>

          <View style={styles.form}>
            <Input
              placeholder="Email hoặc tên đăng nhập"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
            />
            <Input
              placeholder="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              trailing={
                <Pressable onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={palette.textMuted} />
                </Pressable>
              }
            />

            <Pressable onPress={openForgotModal}>
              <ThemedText style={[styles.forgotText, { color: palette.primary }]}>Quên mật khẩu?</ThemedText>
            </Pressable>

            <Button title="Đăng nhập" size="lg" onPress={handleLogin} loading={loading} />

            <Pressable onPress={() => router.push('/sign-up')}>
              <ThemedText style={[styles.switchText, { color: palette.primary }]}>Chưa có tài khoản? Đăng ký</ThemedText>
            </Pressable>
          </View>
        </ScrollView>

        <Modal
          visible={showForgotModal}
          transparent
          animationType="fade"
          onRequestClose={closeForgotModal}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
              <ThemedText type="subtitle">Quên mật khẩu</ThemedText>

              {forgotStep === 'otp' ? (
                <>
                  <View style={styles.modalRow}>
                    <Input
                      style={styles.rowInput}
                      placeholder="Nhập email"
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      editable={!sendingForgotOtp && !verifyingForgotOtp}
                    />
                    <Button
                      title={
                        sendingForgotOtp
                          ? 'Đang gửi...'
                          : forgotOtpCooldown > 0
                            ? `Gửi lại (${forgotOtpCooldown}s)`
                            : 'Gửi OTP'
                      }
                      onPress={handleSendForgotOtp}
                      loading={sendingForgotOtp}
                      disabled={sendingForgotOtp || verifyingForgotOtp || forgotOtpCooldown > 0}
                      style={forgotOtpCooldown > 0 ? [styles.rowButton, styles.rowButtonDisabled] : styles.rowButton}
                    />
                  </View>

                  <View style={styles.modalRow}>
                    <Input
                      style={styles.rowInput}
                      placeholder="Nhập OTP"
                      value={forgotOtp}
                      onChangeText={setForgotOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!sendingForgotOtp && !verifyingForgotOtp}
                    />
                    <Button
                      title="Xác nhận"
                      onPress={handleVerifyForgotOtp}
                      loading={verifyingForgotOtp}
                      disabled={sendingForgotOtp || verifyingForgotOtp || forgotOtp.trim().length !== 6}
                      style={styles.rowButton}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Input
                    placeholder="Mật khẩu mới"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    editable={!resettingPassword}
                    trailing={
                      <Pressable onPress={() => setShowNewPassword((prev) => !prev)} hitSlop={8}>
                        <Ionicons
                          name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={palette.textMuted}
                        />
                      </Pressable>
                    }
                  />
                  <Input
                    placeholder="Xác nhận mật khẩu mới"
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    secureTextEntry={!showConfirmNewPassword}
                    editable={!resettingPassword}
                    trailing={
                      <Pressable onPress={() => setShowConfirmNewPassword((prev) => !prev)} hitSlop={8}>
                        <Ionicons
                          name={showConfirmNewPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={palette.textMuted}
                        />
                      </Pressable>
                    }
                  />
                  <Button
                    title="Đổi mật khẩu"
                    onPress={handleResetPassword}
                    loading={resettingPassword}
                    disabled={resettingPassword}
                  />
                </>
              )}

              <Pressable onPress={closeForgotModal}>
                <ThemedText style={[styles.closeText, { color: palette.primary }]}>Đóng</ThemedText>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ThemedView>
    </AccessGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  heroCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: moderateScale(240),
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  heroOverlay: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.lg,
    gap: Spacing.xs,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: moderateScale(38),
    lineHeight: moderateScale(40),
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.95)',
  },
  form: {
    gap: Spacing.md,
  },
  forgotText: {
    textAlign: 'right',
    marginTop: -4,
  },
  switchText: {
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '92%',
    maxWidth: 420,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowInput: {
    flex: 1,
  },
  rowButton: {
    minWidth: 116,
  },
  rowButtonDisabled: {
    opacity: 0.55,
  },
  closeText: {
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
