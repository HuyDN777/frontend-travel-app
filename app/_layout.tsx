import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  useColorScheme();

  return (
    <SafeAreaProvider>
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ai-itinerary" options={{ title: 'Chatbot lịch trình AI' }} />
        <Stack.Screen name="community-post-editor" options={{ headerShown: false }} />
        <Stack.Screen name="community-my-posts" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="admin-panel" options={{ headerShown: false }} />
        <Stack.Screen name="flights" options={{ title: 'Chuyến bay', presentation: 'card' }} />
        <Stack.Screen name="hotels" options={{ title: 'Khách sạn', presentation: 'card' }} />
        <Stack.Screen name="restaurants" options={{ title: 'Nhà hàng', presentation: 'card' }} />
        <Stack.Screen name="transport" options={{ title: 'Xe / tàu / bus', presentation: 'card' }} />
        <Stack.Screen name="transport-web" options={{ presentation: 'card' }} />
        <Stack.Screen name="destination-detail" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="place-detail" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="flight-checkout" options={{ title: 'Xác nhận & thanh toán', presentation: 'card' }} />
        <Stack.Screen name="my-tickets" options={{ title: 'Vé của tôi', presentation: 'card' }} />
        <Stack.Screen name="payment-status" options={{ title: 'Trạng thái thanh toán', presentation: 'card' }} />
        <Stack.Screen name="trip-members" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="name-trip" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Cửa sổ' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
    </SafeAreaProvider>
  );
}
