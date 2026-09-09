import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AccountStatusProvider } from '@/context/AccountStatusContext';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationMonitorProvider } from '@/context/NotificationMonitorContext';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <View style={{ flex: 1, backgroundColor: Colors.dark.background }}>
        <AuthProvider>
          <AccountStatusProvider>
            <NotificationMonitorProvider>
              <AnimatedSplashOverlay />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: Colors.dark.background },
                }}
              />
            </NotificationMonitorProvider>
          </AccountStatusProvider>
        </AuthProvider>
      </View>
    </ThemeProvider>
  );
}
