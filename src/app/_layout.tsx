import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AccountStatusProvider } from '@/context/AccountStatusContext';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationMonitorProvider } from '@/context/NotificationMonitorContext';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    // Every useSafeAreaInsets()/SafeAreaView call in the app depends on this
    // being present somewhere above it. Without it, insets.bottom silently
    // reads as 0 on Android — screens looked correctly padded in the code,
    // but the padding being added was always zero, so content and buttons at
    // the bottom sat flush against (and behind) the system navigation bar on
    // both 3-button and gesture navigation. This is the actual fix; the
    // padding logic elsewhere was already correct once this exists.
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
