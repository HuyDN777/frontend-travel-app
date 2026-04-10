import { Redirect } from 'expo-router';

import { isLoggedIn } from '@/utils/session';

export default function AppEntry() {
  if (isLoggedIn()) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}
