import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Elevation, Radius, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';

export default function LoginScreen() {
  const { signIn, session, isLoading } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && session) {
    return <Redirect href={'/(tabs)/explore' as never} />;
  }

  const onLogin = async () => {
    if (!usernameOrEmail || !password) {
      Alert.alert('Missing info', 'Please enter your email/username and password.');
      return;
    }

    try {
      setSubmitting(true);
      await signIn({ usernameOrEmail, password });
      router.replace('/(tabs)/explore' as never);
    } catch (error) {
      Alert.alert('Login failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1492571350019-22de08371fd3?auto=format&fit=crop&w=1200&q=80' }}
        style={styles.hero}
        imageStyle={styles.heroImage}
      >
        <View style={styles.heroOverlay} />
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroTitle}>Welcome back</Text>
          <Text style={styles.heroSubtitle}>Your travel memories, beautifully curated.</Text>
        </View>
      </ImageBackground>

      <View style={styles.formWrap}>
        <Text style={styles.label}>EMAIL</Text>
        <Input
          value={usernameOrEmail}
          onChangeText={setUsernameOrEmail}
          autoCapitalize="none"
          placeholder="hello@traveler.com"
          leading={<Ionicons name="mail-outline" size={18} color="#A0A0A0" style={styles.leadingIcon} />}
        />

        <Text style={[styles.label, styles.labelTop]}>PASSWORD</Text>
        <Input
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secure}
          autoCapitalize="none"
          placeholder="••••••••"
          leading={<Ionicons name="lock-closed-outline" size={18} color="#A0A0A0" style={styles.leadingIcon} />}
          trailing={
            <Pressable onPress={() => setSecure((v) => !v)}>
              <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={18} color="#8C8C8C" />
            </Pressable>
          }
        />

        <Text style={styles.forgot}>Forgot password?</Text>

        <Button title="Log In  ->" size="lg" onPress={onLogin} loading={submitting} style={styles.loginBtn} />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          <Pressable style={styles.socialBtn}><Text style={styles.socialText}>Google</Text></Pressable>
          <Pressable style={styles.socialBtn}><Text style={styles.socialText}>Apple</Text></Pressable>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.bottomMuted}>Do not have an account? </Text>
          <Link href={'/auth/signup' as never} asChild>
            <Pressable><Text style={styles.bottomAction}>Sign Up</Text></Pressable>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EFE7D3' },
  hero: { height: 280, justifyContent: 'flex-end' },
  heroImage: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  heroTextWrap: { padding: 20, paddingBottom: 28 },
  heroTitle: { color: '#2F2F2F', fontSize: 42, fontWeight: '700' },
  heroSubtitle: { color: '#565656', ...Typography.body },
  formWrap: { paddingHorizontal: 24, paddingTop: 20 },
  label: { fontSize: 12, letterSpacing: 1, color: '#7D7B72', fontWeight: '700' },
  labelTop: { marginTop: 16 },
  leadingIcon: { marginRight: 8 },
  forgot: { textAlign: 'right', marginTop: 8, color: '#8F8A7F', fontSize: 12 },
  loginBtn: {
    marginTop: 16,
    backgroundColor: '#A7D5D8',
    height: 54,
    borderRadius: 14,
    ...Elevation.floating,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#DFD5BE' },
  dividerText: { color: '#A39B89', fontSize: 12 },
  socialRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  socialBtn: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#D6D6D6',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialText: { color: '#353535', fontWeight: '600' },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 26 },
  bottomMuted: { color: '#8F8A7F' },
  bottomAction: { color: '#2E2E2E', fontWeight: '700' },
});
