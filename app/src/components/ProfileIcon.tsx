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
import { resolveMediaUrl } from '../services/api';
import { COLORS, SHADOWS } from '../theme/tokens';

interface Props {
  imageUrl?: string | null;
  size?: number;
  locked?: boolean;
  highlight?: boolean;
  frameCode?: string | null;
  frameMetadata?: Record<string, unknown> | null;
}

const ICON_ASSETS: Record<string, ImageSourcePropType> = {
  // Originales (13)
  'icon://mug-classic': require('../../assets/icons-profile/mug-classic.png'),
  'icon://hop-gold': require('../../assets/icons-profile/hop-gold.png'),
  'icon://bottle-retro': require('../../assets/icons-profile/bottle-retro.png'),
  'icon://can-craft': require('../../assets/icons-profile/can-craft.png'),
  'icon://cap-vintage': require('../../assets/icons-profile/cap-vintage.png'),
  'icon://sommelier': require('../../assets/icons-profile/sommelier.png'),
  'icon://crown-hop': require('../../assets/icons-profile/crown-hop.png'),
  'icon://shield-house': require('../../assets/icons-profile/shield-house.png'),
  'icon://scepter-malt': require('../../assets/icons-profile/scepter-malt.png'),
  'icon://can-gold': require('../../assets/icons-profile/can-gold.png'),
  'icon://bottle-master': require('../../assets/icons-profile/bottle-master.png'),
  'icon://cheers-squad': require('../../assets/icons-profile/cheers-squad.png'),
  'icon://beerdex-gold': require('../../assets/icons-profile/beerdex-gold.png'),

  // Nuevos de logros (10)
  'icon://barrel-imperial': require('../../assets/icons-profile/barrel-imperial.png'),
  'icon://chalice-platinum': require('../../assets/icons-profile/chalice-platinum.png'),
  'icon://emblem-supreme': require('../../assets/icons-profile/emblem-supreme.png'),
  'icon://beer-throne': require('../../assets/icons-profile/beer-throne.png'),
  'icon://hop-compass': require('../../assets/icons-profile/hop-compass.png'),
  'icon://can-legendary': require('../../assets/icons-profile/can-legendary.png'),
  'icon://giant-mug': require('../../assets/icons-profile/giant-mug.png'),
  'icon://toasted-barley': require('../../assets/icons-profile/toasted-barley.png'),
  'icon://beer-sun': require('../../assets/icons-profile/beer-sun.png'),
  'icon://eternal-flame': require('../../assets/icons-profile/eternal-flame.png'),

  // Exclusivos de La Bodega (14)
  'icon://shop-oak-barrel': require('../../assets/icons-profile/shop-oak-barrel.png'),
  'icon://shop-gold-tap': require('../../assets/icons-profile/shop-gold-tap.png'),
  'icon://shop-coaster-retro': require('../../assets/icons-profile/shop-coaster-retro.png'),
  'icon://shop-bavarian-boot': require('../../assets/icons-profile/shop-bavarian-boot.png'),
  'icon://shop-copper-kettle': require('../../assets/icons-profile/shop-copper-kettle.png'),
  'icon://shop-neon-hop': require('../../assets/icons-profile/shop-neon-hop.png'),
  'icon://shop-hop-skull': require('../../assets/icons-profile/shop-hop-skull.png'),
  'icon://shop-craft-still': require('../../assets/icons-profile/shop-craft-still.png'),
  'icon://shop-brew-bear': require('../../assets/icons-profile/shop-brew-bear.png'),
  'icon://shop-tavern-cat': require('../../assets/icons-profile/shop-tavern-cat.png'),
  'icon://shop-night-owl': require('../../assets/icons-profile/shop-night-owl.png'),
  'icon://shop-brew-monk': require('../../assets/icons-profile/shop-brew-monk.png'),
  'icon://shop-viking-horn': require('../../assets/icons-profile/shop-viking-horn.png'),
  'icon://shop-foam-captain': require('../../assets/icons-profile/shop-foam-captain.png'),

  // Tabernas y Hermandad (1)
  'icon://tavern-brotherhood': require('../../assets/icons-profile/tavern-brotherhood.png'),
};

const FRAME_ASSETS: Record<string, ImageSourcePropType> = {
  frame_bronze_classic: require('../../assets/frames/frame-bronze-classic.png'),
  frame_platinum_imperial: require('../../assets/frames/frame-platinum-imperial.png'),
  frame_gold_laurel: require('../../assets/frames/frame-gold-laurel.png'),
  frame_overflow_foam: require('../../assets/frames/frame-overflow-foam.png'),
  frame_gold_compass: require('../../assets/frames/frame-gold-compass.png'),
  frame_ruby: require('../../assets/frames/frame-ruby.png'),
  frame_oak_barrel: require('../../assets/frames/frame-oak-barrel.png'),
  frame_toasted_copper: require('../../assets/frames/frame-toasted-copper.png'),
  frame_night_slate: require('../../assets/frames/frame-night-slate.png'),
  frame_ice_frost: require('../../assets/frames/frame-ice-frost.png'),
  frame_neon_amber: require('../../assets/frames/frame-neon-amber.png'),
  frame_diamond_brew: require('../../assets/frames/frame-diamond-brew.png'),
};

const FRAME_PRESETS: Record<
  string,
  {
    borderColor: string;
    secondaryColor?: string;
    glowColor?: string;
    ringStyle: 'solid' | 'double' | 'dashed' | 'laurel' | 'foam' | 'compass' | 'neon' | 'prism';
  }
> = {
  frame_default: { borderColor: '#E5B94C', ringStyle: 'solid' },
  frame_bronze_classic: {
    borderColor: '#CD7F32',
    secondaryColor: '#8B4513',
    glowColor: 'rgba(205,127,50,0.4)',
    ringStyle: 'double',
  },
  frame_platinum_imperial: {
    borderColor: '#E2E8F0',
    secondaryColor: '#94A3B8',
    glowColor: 'rgba(226,232,240,0.4)',
    ringStyle: 'double',
  },
  frame_gold_laurel: {
    borderColor: '#FFD066',
    secondaryColor: '#ECA12A',
    glowColor: 'rgba(255,208,102,0.52)',
    ringStyle: 'laurel',
  },
  frame_overflow_foam: {
    borderColor: '#FFF3D6',
    secondaryColor: '#F6C453',
    glowColor: 'rgba(255,243,214,0.45)',
    ringStyle: 'foam',
  },
  frame_gold_compass: {
    borderColor: '#F59E0B',
    secondaryColor: '#FDE68A',
    glowColor: 'rgba(245,158,11,0.45)',
    ringStyle: 'compass',
  },
  frame_ruby: {
    borderColor: '#EF4444',
    secondaryColor: '#FCA5A5',
    glowColor: 'rgba(239,68,68,0.48)',
    ringStyle: 'double',
  },
  frame_oak_barrel: {
    borderColor: '#A16207',
    secondaryColor: '#D97706',
    glowColor: 'rgba(161,98,7,0.35)',
    ringStyle: 'dashed',
  },
  frame_toasted_copper: {
    borderColor: '#D97736',
    secondaryColor: '#FDBA74',
    glowColor: 'rgba(217,119,54,0.4)',
    ringStyle: 'solid',
  },
  frame_night_slate: {
    borderColor: '#475569',
    secondaryColor: '#F6C453',
    glowColor: 'rgba(148,163,184,0.32)',
    ringStyle: 'double',
  },
  frame_ice_frost: {
    borderColor: '#38BDF8',
    secondaryColor: '#E0F2FE',
    glowColor: 'rgba(56,189,248,0.48)',
    ringStyle: 'double',
  },
  frame_neon_amber: {
    borderColor: '#FBBF24',
    secondaryColor: '#FEF08A',
    glowColor: 'rgba(251,191,36,0.65)',
    ringStyle: 'neon',
  },
  frame_diamond_brew: {
    borderColor: '#67E8F9',
    secondaryColor: '#F0ABFC',
    glowColor: 'rgba(103,232,249,0.58)',
    ringStyle: 'prism',
  },
  frame_tavern_wood: {
    borderColor: '#8B5A2B',
    secondaryColor: '#E0A458',
    glowColor: 'rgba(139,90,43,0.45)',
    ringStyle: 'double',
  },
};

export const ProfileIcon = React.memo(function ProfileIcon({
  imageUrl,
  size = 44,
  locked = false,
  highlight = false,
  frameCode,
  frameMetadata,
}: Props) {
  const slug = imageUrl || 'icon://mug-classic';

  const isExternal =
    slug.startsWith('http://') ||
    slug.startsWith('https://') ||
    slug.startsWith('/') ||
    slug.startsWith('data:');

  const source: ImageSourcePropType = isExternal
    ? { uri: resolveMediaUrl(slug) }
    : ICON_ASSETS[slug] ?? ICON_ASSETS['icon://mug-classic'];

  const preset = frameCode ? FRAME_PRESETS[frameCode] : undefined;
  const resolvedBorderColor =
    (typeof frameMetadata?.borderColor === 'string' && frameMetadata.borderColor) ||
    preset?.borderColor ||
    (highlight ? COLORS.amberBright : COLORS.borderGold);
  const resolvedSecondary =
    (typeof frameMetadata?.secondaryColor === 'string' && frameMetadata.secondaryColor) ||
    preset?.secondaryColor;
  const resolvedGlow =
    (typeof frameMetadata?.glowColor === 'string' && frameMetadata.glowColor) ||
    preset?.glowColor;
  const ringStyle =
    (typeof frameMetadata?.ringStyle === 'string'
      ? (frameMetadata.ringStyle as keyof typeof FRAME_PRESETS | string)
      : preset?.ringStyle) || 'solid';

  const frameAsset = frameCode ? FRAME_ASSETS[frameCode] : undefined;
  const hasCustomFrame = Boolean(frameCode && frameCode !== 'frame_default' && (!locked || frameAsset));
  const outerRingPad = hasCustomFrame ? (size >= 60 ? 4 : 2.5) : 0;
  const outerSize = frameAsset ? Math.round(size * 1.46) : size + outerRingPad * 2;
  const borderWidth = size >= 64 ? 2.5 : 1.75;

  const webLockedFilter: ImageStyle | undefined =
    locked && Platform.OS === 'web'
      ? ({ filter: 'grayscale(85%) brightness(0.65)' } as unknown as ImageStyle)
      : undefined;

  const customGlowStyle: ViewStyle | undefined =
    hasCustomFrame && !locked && resolvedGlow && Platform.OS === 'web'
      ? ({
          boxShadow: `0 0 ${size >= 60 ? 18 : 10}px ${resolvedGlow}`,
        } as unknown as ViewStyle)
      : undefined;

  const pipSize = size >= 60 ? 6 : 4;

  const innerMedallion = (
    <View
      style={[
        styles.medallion,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: frameAsset ? 0 : borderWidth,
          borderColor: locked ? COLORS.lockedBorder : resolvedBorderColor,
        },
        !hasCustomFrame && highlight && !locked && SHADOWS.amberGlow,
        locked && !frameAsset && styles.lockedOpacity,
      ]}
    >
      <Image
        source={source}
        style={[
          styles.image,
          { borderRadius: size / 2 },
          webLockedFilter,
        ]}
        resizeMode="cover"
      />
    </View>
  );

  if (!hasCustomFrame) {
    return innerMedallion;
  }

  if (frameAsset) {
    return (
      <View
        style={[
          styles.frameOuter,
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
          },
          locked && styles.lockedFrameOpacity,
        ]}
      >
        {innerMedallion}
        <Image
          source={frameAsset}
          style={[
            styles.frameOverlay,
            {
              width: outerSize,
              height: outerSize,
              pointerEvents: 'none',
            } as ImageStyle,
            webLockedFilter,
          ]}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.frameOuter,
        {
          width: outerSize,
          height: outerSize,
          borderRadius: outerSize / 2,
          borderWidth: size >= 60 ? 2 : 1.5,
          borderColor: resolvedSecondary || resolvedBorderColor,
          borderStyle: ringStyle === 'dashed' ? 'dashed' : 'solid',
        },
        customGlowStyle,
      ]}
    >
      {innerMedallion}

      {/* Detalles cardinales o decorativos para marcos especiales */}
      {(ringStyle === 'compass' || ringStyle === 'laurel' || ringStyle === 'prism') ? (
        <>
          <View
            style={[
              styles.pip,
              {
                width: pipSize,
                height: pipSize,
                borderRadius: pipSize / 2,
                backgroundColor: resolvedSecondary || resolvedBorderColor,
                top: -pipSize / 2,
                left: outerSize / 2 - pipSize / 2,
              },
            ]}
          />
          <View
            style={[
              styles.pip,
              {
                width: pipSize,
                height: pipSize,
                borderRadius: pipSize / 2,
                backgroundColor: resolvedSecondary || resolvedBorderColor,
                bottom: -pipSize / 2,
                left: outerSize / 2 - pipSize / 2,
              },
            ]}
          />
          <View
            style={[
              styles.pip,
              {
                width: pipSize,
                height: pipSize,
                borderRadius: pipSize / 2,
                backgroundColor: resolvedBorderColor,
                left: -pipSize / 2,
                top: outerSize / 2 - pipSize / 2,
              },
            ]}
          />
          <View
            style={[
              styles.pip,
              {
                width: pipSize,
                height: pipSize,
                borderRadius: pipSize / 2,
                backgroundColor: resolvedBorderColor,
                right: -pipSize / 2,
                top: outerSize / 2 - pipSize / 2,
              },
            ]}
          />
        </>
      ) : null}

      {ringStyle === 'foam' ? (
        <View
          style={[
            styles.foamCap,
            {
              width: size * 0.44,
              height: size >= 60 ? 7 : 5,
              borderRadius: 99,
              top: -2,
            },
          ]}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  frameOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  frameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  medallion: {
    backgroundColor: '#0B0807',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  lockedOpacity: {
    opacity: 0.45,
  },
  lockedFrameOpacity: {
    opacity: 0.62,
  },
  pip: {
    position: 'absolute',
  },
  foamCap: {
    position: 'absolute',
    backgroundColor: '#FFF7E2',
  },
});
