import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getMyProfile, updateMyProfile } from '@/utils/api';
import { getSessionUserId } from '@/utils/session';

export default function EditProfileScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
        Alert.alert('Error', error?.message ?? 'Khong tai duoc profile');
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
        password: password.trim() ? password : undefined,
      }, userId);
      Alert.alert('Success', 'Da cap nhat profile');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Khong the cap nhat profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <ThemedText type="defaultSemiBold">Edit Profile</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.form}>
          <Input placeholder="Full Name" value={fullName} onChangeText={setFullName} />
          <Input placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Input placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
          <Input placeholder="Avatar URL" value={avatarUrl} onChangeText={setAvatarUrl} autoCapitalize="none" />
          <Input placeholder="Change Password" value={password} onChangeText={setPassword} secureTextEntry />

          <Button title="Save Changes" size="lg" onPress={handleSave} loading={loading} />
        </Card>
      </ScrollView>
    </ThemedView>
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
});
