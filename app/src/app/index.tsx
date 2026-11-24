import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS } from '../theme/tokens';

const EMBLEM_SOURCE = require('../../assets/beerdex-emblem.png');

export default function IndexScreen() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.emblemWrap}>
          <Image source={EMBLEM_SOURCE} style={styles.emblemImg} resizeMode="cover" />
        </View>
        <ActivityIndicator size="large" color={COLORS.amberBright} />
        <Text style={styles.text}>Cargando BeerDex...</Text>
      </View>
    );
  }

  if (user) {
    return <Redirect href="/menu" />;
  }

  return <Redirect href="/auth/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  emblemWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.borderGold,
    overflow: 'hidden',
    backgroundColor: '#0B0807',
  },
  emblemImg: {
    width: '100%',
    height: '100%',
  },
  text: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.display,
    fontSize: 15,
    fontWeight: '700',
  },
});
