import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Radius, Spacing } from '@/constants/theme';
import { register } from '@/utils/api';
import { moderateScale } from '@/utils/responsive';
import { setSessionUser } from '@/utils/session';

export default function SignUpScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Validation', 'Please fill all required fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Validation', 'Confirm password does not match');
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
      Alert.alert('Sign up failed', error?.message ?? 'Unable to create account');
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
          <ThemedText type="title" style={styles.title}>Create an Account</ThemedText>
          <ThemedText>Start your journey today</ThemedText>

          <Input placeholder="Full Name" value={fullName} onChangeText={setFullName} />
          <Input placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
          <Input placeholder="Email Address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Input placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
          <Input placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

          <Button title="Sign Up" size="lg" onPress={handleSignUp} loading={loading} />

          <View style={styles.socialRow}>
            <Button title="Google" variant="secondary" style={styles.socialBtn} />
            <Button title="Apple" variant="secondary" style={styles.socialBtn} />
          </View>

          <Pressable onPress={() => router.replace('/login')}>
            <ThemedText style={styles.switchText}>Already have an account? Log in</ThemedText>
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
  socialBtn: {
    flex: 1,
  },
  switchText: {
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
