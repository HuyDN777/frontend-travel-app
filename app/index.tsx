import { Redirect } from 'expo-router';

import { resolveLandingRoute } from '@/utils/access-control';
import { getSessionUser } from '@/utils/session';

export default function AppEntry() {
  return <Redirect href={resolveLandingRoute(getSessionUser()) as '/login' | '/admin' | '/(tabs)'} />;
}
