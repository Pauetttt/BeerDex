import React from 'react';
import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  Platform,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { COLORS } from '../theme/tokens';

const RELIC_ASSETS: Record<string, ImageSourcePropType> = {
  'relic://relic-cap-1900': require('../../assets/relics/relic-cap-1900.png'),
  'relic://relic-founder-coaster': require('../../assets/relics/relic-founder-coaster.png'),
  'relic://relic-mini-barrel': require('../../assets/relics/relic-mini-barrel.png'),
  'relic://relic-hop-medal': require('../../assets/relics/relic-hop-medal.png'),
  'relic://relic-abbey-chalice': require('../../assets/relics/relic-abbey-chalice.png'),
  'relic://relic-foam-trophy': require('../../assets/relics/relic-foam-trophy.png'),
  'relic://relic-munich-coaster': require('../../assets/relics/relic-munich-coaster.png'),
  'relic://relic-vintage-opener': require('../../assets/relics/relic-vintage-opener.png'),
  'relic://relic-crystal-hop': require('../../assets/relics/relic-crystal-hop.png'),
  'relic://relic-porcelain-mug': require('../../assets/relics/relic-porcelain-mug.png'),
  'relic://relic-platinum-cap': require('../../assets/relics/relic-platinum-cap.png'),
  'relic://relic-bronze-tap': require('../../assets/relics/relic-bronze-tap.png'),
  'relic://relic-bodega-key': require('../../assets/relics/relic-bodega-key.png'),
  'relic://relic-collector-barrel': require('../../assets/relics/relic-collector-barrel.png'),
  'relic://relic-solid-gold-hop': require('../../assets/relics/relic-solid-gold-hop.png'),
  'relic://relic-royal-crown': require('../../assets/relics/relic-royal-crown.png'),
};

interface Props {
  previewKey?: string | null;
  size?: number;
  locked?: boolean;
  pedestal?: boolean;
}

export function RelicIcon({ previewKey, size = 48, locked = false, pedestal = false }: Props) {
  const source =
    (previewKey && RELIC_ASSETS[previewKey]) || RELIC_ASSETS['relic://relic-cap-1900'];

  const webFilter: ImageStyle | undefined =
    locked && Platform.OS === 'web'
      ? ({ filter: 'grayscale(90%) brightness(0.6)' } as unknown as ImageStyle)
      : undefined;

  const pedestalGlow: ViewStyle | undefined =
    pedestal && !locked && Platform.OS === 'web'
      ? ({
          boxShadow:
            '0 6px 18px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 220, 140, 0.28)',
        } as unknown as ViewStyle)
      : undefined;

  const cornerRadius = pedestal ? Math.round(size * 0.2) : 0;

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size },
        pedestal && {
          borderRadius: cornerRadius,
          overflow: 'hidden',
          backgroundColor: '#090706',
          borderWidth: 1,
          borderColor: locked ? COLORS.lockedBorder : 'rgba(255, 208, 102, 0.34)',
        },
        pedestalGlow,
        locked && styles.locked,
      ]}
    >
      <Image
        source={source}
        style={[{ width: size, height: size }, webFilter]}
        resizeMode={pedestal ? 'cover' : 'contain'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  locked: {
    opacity: 0.45,
  },
});
