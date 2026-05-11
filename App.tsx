import React from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LightColors, DarkColors } from './src/theme/colors';
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

  return (
    <NavigationContainer theme={isDark ? DarkNavTheme : LightNavTheme}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? DarkColors.background : LightColors.background}
      />
      <Stack.Navigator
        initialRouteName="Onboarding"
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
          options={{ title: 'Ask Document' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
