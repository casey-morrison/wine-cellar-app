import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider } from 'expo-router/react-navigation';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

import Colors from '@/constants/Colors';
import { CellarProvider } from '@/context/CellarContext';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tintLight,
    background: Colors.dark.background,
    card: Colors.dark.backgroundElevated,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.tint,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <CellarProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style="light" />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="wine/[id]"
            options={{ title: 'Wine', headerBackTitle: 'Cellar' }}
          />
          <Stack.Screen
            name="wine/edit"
            options={{ title: 'Edit Wine', presentation: 'modal' }}
          />
          <Stack.Screen
            name="tasting/[wineId]"
            options={{ title: 'Log Tasting', presentation: 'modal' }}
          />
          <Stack.Screen
            name="identify/confirm"
            options={{ title: 'Confirm Bottle', presentation: 'modal' }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ThemeProvider>
    </CellarProvider>
  );
}
