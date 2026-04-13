import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { completeRegistration, sendOTP } from '@/utils/api';
import { moderateScale } from '@/utils/responsive';
import { setSessionUser } from '@/utils/session';

export type OTPVerificationScreenProps = {
  email: string;
  registrationData: {
    username: string;
    password: string;
    fullName?: string;
    avatarUrl?: string;
  };
  onBack?: () => void;
};

export default function OTPVerificationScreen({
  email,
  registrationData,
  onBack,
}: OTPVerificationScreenProps) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 phút
  const [resendDisabled, setResendDisabled] = useState(false);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  async function handleVerifyOTP() {
    if (!otpCode.trim() || otpCode.length !== 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã OTP 6 chữ số');
      return;
    }

    try {
      setLoading(true);
      
      // Hoàn tất đăng ký với OTP
      const auth = await completeRegistration({
        email: email.trim(),
        username: registrationData.username,
        password: registrationData.password,
        fullName: registrationData.fullName,
        avatarUrl: registrationData.avatarUrl,
      });

      setSessionUser({
        id: auth.id,
        username: auth.username,
        email: auth.email,
        fullName: auth.fullName,
        avatarUrl: auth.avatarUrl,
        role: auth.role,
      });

      Alert.alert('Thành công', 'Xác thực email thành công! Đang chuyển hướng...');
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Xác thực thất bại', error?.message ?? 'Không thể xác thực OTP.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    try {
      setResendDisabled(true);
      setTimeLeft(600);
      await sendOTP({ email: email.trim() });
      Alert.alert('Thành công', 'Mã OTP mới đã được gửi đến email của bạn');
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message ?? 'Không thể gửi lại mã OTP.');
    } finally {
      setResendDisabled(false);
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
            Xác thực Email
          </ThemedText>
          <ThemedText style={{ color: palette.textMuted }}>
            Nhập mã xác thực đã được gửi đến {email}
          </ThemedText>

          <Input
            placeholder="Nhập 6 chữ số"
            value={otpCode}
            onChangeText={setOtpCode}
            keyboardType="number-pad"
            maxLength={6}
            editable={!loading}
          />

          <View style={styles.timerContainer}>
            <ThemedText style={[styles.timerText, timeLeft < 120 && { color: '#d32f2f' }]}>
              {timeLeft === 0 ? 'Mã OTP hết hạn' : `Còn lại: ${minutes}:${seconds.toString().padStart(2, '0')}`}
            </ThemedText>
          </View>

          <Button
            title="Xác thực"
            onPress={handleVerifyOTP}
            loading={loading}
            disabled={loading || otpCode.length !== 6}
            style={styles.button}
          />

          <Pressable
            onPress={handleResendOTP}
            disabled={resendDisabled || loading}
            style={styles.resendContainer}
          >
            <ThemedText
              style={[
                styles.resendText,
                (resendDisabled || loading) && { color: palette.textMuted },
              ]}
            >
              Gửi lại mã xác thực
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={onBack}
            disabled={loading}
            style={styles.backContainer}
          >
            <ThemedText style={[styles.backText, loading && { color: palette.textMuted }]}>
              ← Quay lại
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingBottom: moderateScale(40),
  },
  heroCard: {
    marginBottom: moderateScale(24),
    borderRadius: 0,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 2,
  },
  form: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  button: {
    marginTop: Spacing.md,
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  timerText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
  resendContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  resendText: {
    fontSize: moderateScale(14),
    color: '#007bff',
    textDecorationLine: 'underline',
  },
  backContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  backText: {
    fontSize: moderateScale(14),
    color: '#007bff',
  },
});
