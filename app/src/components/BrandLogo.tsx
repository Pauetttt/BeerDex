import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { resolveMediaUrl } from '../services/api';
import { COLORS, FONTS, SHADOWS } from '../theme/tokens';

interface Props {
  logoUrl?: string | null;
  name: string;
  size?: number;
}

const BRAND_ASSETS: Record<string, ImageSourcePropType> = {
  'brand://estrella-galicia': require('../../assets/brands/estrella-galicia.png'),
  'brand://mahou': require('../../assets/brands/mahou.png'),
  'brand://alhambra': require('../../assets/brands/alhambra.png'),
  'brand://la-virgen': require('../../assets/brands/la-virgen.png'),
  'brand://estrella-damm': require('../../assets/brands/estrella-damm.png'),
  'brand://san-miguel': require('../../assets/brands/san-miguel.png'),
  'brand://cruzcampo': require('../../assets/brands/cruzcampo.png'),
  'brand://ambar': require('../../assets/brands/ambar.png'),
  'brand://heineken': require('../../assets/brands/heineken.png'),
  'brand://guinness': require('../../assets/brands/guinness.png'),
  'brand://paulaner': require('../../assets/brands/paulaner.png'),
  'brand://leffe': require('../../assets/brands/leffe.png'),
  'brand://brewdog': require('../../assets/brands/brewdog.png'),
  'brand://corona': require('../../assets/brands/corona.png'),
  'brand://peroni': require('../../assets/brands/peroni.png'),
  'brand://el-aguila': require('../../assets/brands/el-aguila.png'),
  'brand://turia': require('../../assets/brands/turia.png'),
  'brand://estrella-de-levante': require('../../assets/brands/estrella-de-levante.png'),
  'brand://victoria': require('../../assets/brands/victoria.png'),
  'brand://amstel': require('../../assets/brands/amstel.png'),
  'brand://dorada': require('../../assets/brands/dorada.png'),
  'brand://tropical': require('../../assets/brands/tropical.png'),
  'brand://moritz': require('../../assets/brands/moritz.png'),
  'brand://keler': require('../../assets/brands/keler.png'),
  'brand://la-salve': require('../../assets/brands/la-salve.png'),
  'brand://el-alcazar': require('../../assets/brands/el-alcazar.png'),
  'brand://la-sagra': require('../../assets/brands/la-sagra.png'),
  'brand://voll-damm': require('../../assets/brands/voll-damm.png'),
  'brand://1906': require('../../assets/brands/1906.png'),
  'brand://budweiser': require('../../assets/brands/budweiser.png'),
  'brand://stella-artois': require('../../assets/brands/stella-artois.png'),
  'brand://carlsberg': require('../../assets/brands/carlsberg.png'),
  'brand://franziskaner': require('../../assets/brands/franziskaner.png'),
  'brand://desperados': require('../../assets/brands/desperados.png'),
  'brand://delirium-tremens': require('../../assets/brands/delirium-tremens.png'),
  'brand://pilsner-urquell': require('../../assets/brands/pilsner-urquell.png'),
  'brand://modelo': require('../../assets/brands/modelo.png'),
  'brand://asahi': require('../../assets/brands/asahi.png'),
  'brand://sapporo': require('../../assets/brands/sapporo.png'),
  'brand://super-bock': require('../../assets/brands/super-bock.png'),
  'brand://sagres': require('../../assets/brands/sagres.png'),
};

export function BrandLogo({ logoUrl, name, size = 50 }: Props) {
  const borderRadius = Math.round(size * 0.26);
  const padding = Math.max(4, Math.round(size * 0.1));

  const isExternal = Boolean(
    logoUrl &&
      (logoUrl.startsWith('http://') ||
        logoUrl.startsWith('https://') ||
        logoUrl.startsWith('/') ||
        logoUrl.startsWith('data:'))
  );

  const localAsset = logoUrl ? BRAND_ASSETS[logoUrl] : undefined;

  if (isExternal && logoUrl) {
    return (
      <View
        style={[
          styles.crestFrame,
          { width: size, height: size, borderRadius, padding },
          SHADOWS.card,
        ]}
      >
        <Image
          source={{ uri: resolveMediaUrl(logoUrl) }}
          style={styles.logoImg}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (localAsset) {
    return (
      <View
        style={[
          styles.crestFrame,
          { width: size, height: size, borderRadius, padding },
          SHADOWS.card,
        ]}
      >
        <Image source={localAsset} style={styles.logoImg} resizeMode="contain" />
      </View>
    );
  }

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View
      style={[
        styles.fallbackFrame,
        { width: size, height: size, borderRadius },
        SHADOWS.card,
      ]}
    >
      <Text style={[styles.fallbackText, { fontSize: Math.round(size * 0.34) }]}>
        {initials || 'BD'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  crestFrame: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(246, 196, 83, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  fallbackFrame: {
    backgroundColor: COLORS.elevated,
    borderWidth: 1.5,
    borderColor: COLORS.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: COLORS.amberBright,
    fontFamily: FONTS.display,
    fontWeight: '800',
  },
});
