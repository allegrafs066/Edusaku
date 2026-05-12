import React, { useEffect, useState } from 'react';
import { useColorScheme, StatusBar, View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LightColors, DarkColors } from './src/theme/colors';
import { useAppStore } from './src/store/appStore';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';

// ─── Navigation types ─────────────────────────────────────────────────────────

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Chat: { documentId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ─── Custom nav themes ────────────────────────────────────────────────────────

const LightNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: LightColors.background,
    card: LightColors.surface,
    text: LightColors.textPrimary,
    border: LightColors.border,
    primary: LightColors.primary,
    notification: LightColors.primary,
  },
};

const DarkNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: DarkColors.background,
    card: DarkColors.surface,
    text: DarkColors.textPrimary,
    border: DarkColors.border,
    primary: DarkColors.primary,
    notification: DarkColors.primary,
  },
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // Wait for Zustand persist to rehydrate from AsyncStorage before rendering
  // the navigator — otherwise initialRouteName would always read the default
  // (false) value and flash Onboarding on every launch.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // useAppStore.persist is available when the persist middleware is active.
    // onFinishHydration fires once rehydration completes (or immediately if
    // already done, e.g. on fast re-renders).
    const unsub = useAppStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // If already hydrated (e.g. store was created synchronously in tests),
    // set immediately.
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return unsub;
  }, []);

  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);

  // Show a minimal splash while the store rehydrates (typically < 100 ms)
  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: isDark ? DarkColors.background : LightColors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator
          color={isDark ? DarkColors.primary : LightColors.primary}
          size="large"
        />
      </View>
    );
  }

  return (
    <NavigationContainer theme={isDark ? DarkNavTheme : LightNavTheme}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? DarkColors.background : LightColors.background}
      />
      <Stack.Navigator
        // Route directly to Home on subsequent launches; Onboarding on first run.
        initialRouteName={hasCompletedOnboarding ? 'Home' : 'Onboarding'}
        screenOptions={{
          headerShown: true,
          headerShadowVisible: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Edusaku' }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={({ route }) => ({
            title: route.params?.documentId ? 'Ask Document' : 'Chat',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
