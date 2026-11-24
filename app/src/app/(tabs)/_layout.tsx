import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { GlobalHeader } from '../../components/GlobalHeader';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { COLORS } from '../../theme/tokens';

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const theme = useAppTheme();

  if (!loading && !user) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.screenBg }}>
      <GlobalHeader showBackToMenu />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
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
