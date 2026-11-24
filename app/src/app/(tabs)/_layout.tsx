import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlobalHeader } from '../../components/GlobalHeader';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS, FONTS, SHADOWS, WEB_GLASS } from '../../theme/tokens';

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  if (!loading && !user) {
    return <Redirect href="/auth/login" />;
  }

  const isWide = width >= 560;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.screenBg }}>
      <GlobalHeader showBackToMenu />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.bright,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarItemStyle: {
            flex: 1,
            paddingHorizontal: 2,
          },
          tabBarStyle: isWide
            ? {
                backgroundColor: COLORS.surfaceGlass,
                borderTopWidth: 1,
                borderWidth: 1,
                borderColor: COLORS.borderStrong,
                borderRadius: 24,
                maxWidth: 580,
                width: '92%',
                alignSelf: 'center',
                marginBottom: 14,
                height: 64,
                paddingBottom: 6,
                paddingTop: 6,
                ...SHADOWS.floatingDock,
                ...WEB_GLASS,
              }
            : {
                backgroundColor: COLORS.surfaceGlass,
                borderTopColor: COLORS.border,
                borderTopWidth: 1,
                height: 62 + Math.max(insets.bottom, 4),
                paddingBottom: Math.max(insets.bottom, 6),
                paddingTop: 6,
                ...WEB_GLASS,
              },
          tabBarLabelStyle: {
            fontFamily: FONTS.display,
            fontSize: 11.5,
            fontWeight: '800',
          },
          sceneStyle: {
            backgroundColor: COLORS.screenBg,
          },
        }}
      >
        <Tabs.Screen
          name="beerdex"
          options={{
            title: 'BeerDex',
            tabBarIcon: ({ focused, size }) => (
              <Ionicons
                name={focused ? 'beer' : 'beer-outline'}
                size={size}
                color={focused ? theme.bright : COLORS.textMuted}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="achievements"
          options={{
            title: 'Logros',
            tabBarIcon: ({ focused, size }) => (
              <Ionicons
                name={focused ? 'trophy' : 'trophy-outline'}
                size={size}
                color={focused ? theme.bright : COLORS.textMuted}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="friends"
          options={{
            title: 'Amigos',
            tabBarIcon: ({ focused, size }) => (
              <Ionicons
                name={focused ? 'people' : 'people-outline'}
                size={size}
                color={focused ? theme.bright : COLORS.textMuted}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            title: 'Tienda',
            tabBarIcon: ({ focused, size }) => (
              <Ionicons
                name={focused ? 'storefront' : 'storefront-outline'}
                size={size}
                color={focused ? theme.bright : COLORS.textMuted}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
