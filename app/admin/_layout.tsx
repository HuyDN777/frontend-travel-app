import { Stack } from 'expo-router';

import { AccessGate } from '@/components/auth/access-gate';

export default function AdminLayout() {
  return (
    <AccessGate required="admin">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="users" />
        <Stack.Screen name="moderation" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="logs" />
      </Stack>
    </AccessGate>
  );
}
