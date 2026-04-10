import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';

export default function SignupScreen() {
  const { signUp, session, isLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secure1, setSecure1] = useState(true);
  const [secure2, setSecure2] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && session) {
    return <Redirect href={'/(tabs)/explore' as never} />;
  }

  const onSignUp = async () => {
    if (!fullName || !email || !username || !password) {
      Alert.alert('Missing info', 'Please fill all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Confirm password must match password.');
      return;
    }

    try {
      setSubmitting(true);
      await signUp({
        fullName,
        email,
        username,
        password,
        avatarUrl: `https://i.pravatar.cc/200?u=${encodeURIComponent(email)}`,
      });
      router.replace('/(tabs)/explore' as never);
    } catch (error) {
      Alert.alert('Sign up failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1565019011521-b0575c06f8bb?auto=format&fit=crop&w=1200&q=80' }}
        style={styles.hero}
        imageStyle={styles.heroImage}
      />

      <View style={styles.formWrap}>
        <Text style={styles.title}>Create an Account</Text>
        <Text style={styles.subtitle}>Start your journey today</Text>

        <Input
          value={fullName}
          onChangeText={setFullName}
          placeholder="Full Name"
          leading={<Ionicons name="person-outline" size={18} color="#A0A0A0" style={styles.leadingIcon} />}
        />
        <Input
          style={styles.inputSpace}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Email Address"
          leading={<Ionicons name="mail-outline" size={18} color="#A0A0A0" style={styles.leadingIcon} />}
        />
        <Input
          style={styles.inputSpace}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="Username"
          leading={<Ionicons name="at-outline" size={18} color="#A0A0A0" style={styles.leadingIcon} />}
        />
        <Input
          style={styles.inputSpace}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secure1}
          placeholder="Password"
          leading={<Ionicons name="lock-closed-outline" size={18} color="#A0A0A0" style={styles.leadingIcon} />}
          trailing={
            <Pressable onPress={() => setSecure1((v) => !v)}>
              <Ionicons name={secure1 ? 'eye-outline' : 'eye-off-outline'} size={18} color="#8C8C8C" />
            </Pressable>
          }
        />
        <Input
          style={styles.inputSpace}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={secure2}
          placeholder="Confirm Password"
          leading={<Ionicons name="lock-closed-outline" size={18} color="#A0A0A0" style={styles.leadingIcon} />}
          trailing={
            <Pressable onPress={() => setSecure2((v) => !v)}>
              <Ionicons name={secure2 ? 'eye-outline' : 'eye-off-outline'} size={18} color="#8C8C8C" />
            </Pressable>
          }
        />

        <Button title="Sign Up  ->" size="lg" onPress={onSignUp} loading={submitting} style={styles.signupBtn} />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR SIGN UP WITH</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          <Pressable style={styles.socialBtn}><Text style={styles.socialText}>Google</Text></Pressable>
          <Pressable style={styles.socialBtn}><Text style={styles.socialText}>Apple</Text></Pressable>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.bottomMuted}>Already have an account? </Text>
          <Link href={'/auth/login' as never} asChild>
            <Pressable><Text style={styles.bottomAction}>Log in</Text></Pressable>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EFE7D3' },
  hero: { height: 170 },
  heroImage: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  formWrap: { paddingHorizontal: 24, paddingTop: 16 },
  title: { fontSize: 42, fontWeight: '700', color: '#303030' },
  subtitle: { color: '#847E6E', marginBottom: 16, fontSize: 18 },
  leadingIcon: { marginRight: 8 },
  inputSpace: { marginTop: 10 },
  signupBtn: {
    marginTop: 18,
    backgroundColor: '#2F3137',
    height: 54,
    borderRadius: 14,
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
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  bottomMuted: { color: '#8F8A7F' },
  bottomAction: { color: '#2E2E2E', fontWeight: '700' },
});
