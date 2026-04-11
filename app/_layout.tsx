import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  useColorScheme();

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ai-itinerary" options={{ title: 'Chatbot lịch trình AI' }} />
        <Stack.Screen name="community-post-editor" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="admin-panel" options={{ headerShown: false }} />
        <Stack.Screen name="flights" options={{ title: 'Chuyến bay', presentation: 'card' }} />
        <Stack.Screen name="flight-checkout" options={{ title: 'Xác nhận & thanh toán', presentation: 'card' }} />
        <Stack.Screen name="my-tickets" options={{ title: 'Vé của tôi', presentation: 'card' }} />
        <Stack.Screen name="payment-status" options={{ title: 'Trạng thái thanh toán', presentation: 'card' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Cửa sổ' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
