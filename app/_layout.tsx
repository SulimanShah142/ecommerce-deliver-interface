import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { initOneSignal } from '@/lib/notifications';
import { OneSignal } from 'react-native-onesignal';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';

// 1. Lock the splash screen immediately
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  
  const [appIsReady, setAppIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // 2. INITIALIZATION
  useEffect(() => {
    async function prepare() {
      try {
        // Setup OneSignal
        await initOneSignal();
        
        // Check Session
        const storedId = await SecureStore.getItemAsync('deliverer_id');
        if (storedId) {
          OneSignal.login(storedId);
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }

        // Give the native UI a moment to settle
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  // 3. AUTH ROUTING
  useEffect(() => {
    if (!appIsReady || isLoggedIn === null) return;

    const inAuthGroup = segments[0] === 'login';

    if (!isLoggedIn && !inAuthGroup) {
      // ❌ Fixed path: remove the './(tabs)' if login is at the root
      router.replace('/(tabs)/login'); 
    } 
    else if (isLoggedIn && inAuthGroup) {
      // ✅ Go straight to the main order list
      router.replace('/(tabs)/orders');
    }
  }, [appIsReady, isLoggedIn, segments]);

  // 4. HIDE SPLASH HANDLER
  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This hides the splash only when the View is actually mounted
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady || isLoggedIn === null) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Stack screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: '#FFF' },
        animation: 'fade'
      }}>
        <Stack.Screen name="login" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="orders/[id]" options={{ presentation: 'card' }} />
      </Stack>
    </View>
  );
}
