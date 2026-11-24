import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { AlertProvider } from '../context/AlertContext';
import { AuthProvider } from '../context/AuthContext';
import { AppThemeProvider, useAppTheme } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { COLORS } from '../theme/tokens';

enableScreens(true);

function ThemedApp() {
  const theme = useAppTheme();

  const navTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: theme.primary,
      background: COLORS.screenBg,
      card: COLORS.surface,
      text: COLORS.text,
      border: COLORS.border,
      notification: theme.bright,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.screenBg },
        }}
      />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.screenBg }}>
      <SafeAreaProvider>
        <AlertProvider>
          <ToastProvider>
            <AuthProvider>
              <AppThemeProvider>
                <ThemedApp />
              </AppThemeProvider>
            </AuthProvider>
          </ToastProvider>
        </AlertProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
