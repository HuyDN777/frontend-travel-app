import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';

export default function RootIndex() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.background }}>
        <ActivityIndicator color={Colors.light.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href={'/auth/login' as never} />;
  }

  return <Redirect href={'/(tabs)/explore' as never} />;
}
