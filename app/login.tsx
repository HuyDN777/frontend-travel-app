import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { login } from '@/utils/api';
import { moderateScale } from '@/utils/responsive';
import { setSessionUser } from '@/utils/session';

export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Validation', 'Please fill email/username and password');
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
        avatarUrl: auth.avatarUrl,
        role: auth.role,
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Login failed', error?.message ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card padded={false} style={styles.heroCard}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1480796927426-f609979314bd?auto=format&fit=crop&w=1200&q=80' }}
            style={styles.heroImage}
            contentFit="cover"
          />
          <View style={styles.heroOverlay}>
            <ThemedText type="title" style={styles.heroTitle}>Welcome back</ThemedText>
            <ThemedText style={{ color: palette.textMuted }}>Your travel memories, beautifully curated.</ThemedText>
          </View>
        </Card>

        <View style={styles.form}>
          <Input placeholder="Email or username" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" />
          <Input placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

          <Button title="Log In" size="lg" onPress={handleLogin} loading={loading} />

          <View style={styles.socialRow}>
            <Button title="Google" variant="secondary" style={styles.socialBtn} />
            <Button title="Apple" variant="secondary" style={styles.socialBtn} />
          </View>

          <Pressable onPress={() => router.push('/sign-up')}>
            <ThemedText style={styles.switchText}>Don't have an account? Sign Up</ThemedText>
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
  heroOverlay: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.lg,
    gap: Spacing.xs,
  },
  heroTitle: {
    fontSize: moderateScale(38),
    lineHeight: moderateScale(40),
  },
  form: {
    gap: Spacing.md,
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
