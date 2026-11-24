import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { GlobalHeader } from '../../components/GlobalHeader';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../theme/tokens';

export default function TabernasLayout() {
  const { user, loading } = useAuth();

  if (!loading && !user) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.screenBg }}>
      <GlobalHeader showBackToMenu />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.screenBg },
        }}
      />
    </View>
  );
}
