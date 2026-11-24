import { Platform, ViewStyle } from 'react-native';

export const COLORS = {
  bg: '#0C0908',
  screenBg: '#0C0908',
  surface: '#161210',
  surfaceGlass: 'rgba(20, 15, 12, 0.84)',
  elevated: '#211B16',
  cardBack: '#1B1510',
  border: 'rgba(255, 224, 180, 0.09)',
  borderStrong: 'rgba(255, 218, 165, 0.19)',
  borderGold: 'rgba(246, 196, 83, 0.45)',

  amber: '#ECA12A',
  amberBright: '#FFD066',
  copper: '#C97A2B',
  gold: '#E5B94C',

  text: '#FAF4EC',
  textSecondary: '#B9AA9A',
  textMuted: '#827466',

  lockedBg: '#120F0D',
  lockedBorder: 'rgba(255, 224, 180, 0.08)',
  lockedText: '#6F6358',

  success: '#4ADE80',
  successBg: 'rgba(74, 222, 128, 0.13)',
  successBorder: 'rgba(74, 222, 128, 0.35)',
  danger: '#F26B63',
  dangerBg: 'rgba(242, 107, 99, 0.13)',
  dangerBorder: 'rgba(242, 107, 99, 0.4)',
  amberBg: 'rgba(236, 161, 42, 0.14)',
  goldBg: 'rgba(229, 185, 76, 0.17)',
} as const;

export const FONTS = {
  brand: Platform.select({
    web: '"UnifrakturMaguntia", "Outfit", serif',
    default: undefined,
  }),
  display: Platform.select({
    web: '"Outfit", "Plus Jakarta Sans", sans-serif',
    default: undefined,
  }),
  sans: Platform.select({
    web: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    default: undefined,
  }),
} as const;

export const GRADIENTS = {
  amberBtn: ['#FFD166', '#E59A28', '#CE7C17'] as const,
  card: ['#1D1713', '#130F0C'] as const,
  hero: ['#2B1F14', '#19130E', '#120E0B'] as const,
  unlocked: ['#261D12', '#17120D'] as const,
  backFace: ['#231911', '#15100C'] as const,
  locked: ['#15110E', '#0F0C0A'] as const,
  progress: ['#FFD166', '#ECA12A', '#C97A2B'] as const,
} as const;

export const SHADOWS: Record<'card' | 'amberGlow' | 'floatingDock', ViewStyle> = {
  card: Platform.select({
    web: {
      boxShadow: '0 10px 28px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 232, 196, 0.06)',
    } as unknown as ViewStyle,
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.38,
      shadowRadius: 14,
      elevation: 6,
    } as ViewStyle,
  })!,
  amberGlow: Platform.select({
    web: {
      boxShadow: '0 8px 26px rgba(236, 161, 42, 0.28), 0 0 18px rgba(255, 208, 102, 0.12)',
    } as unknown as ViewStyle,
    default: {
      shadowColor: '#ECA12A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.34,
      shadowRadius: 14,
      elevation: 8,
    } as ViewStyle,
  })!,
  floatingDock: Platform.select({
    web: {
      boxShadow: '0 18px 42px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 224, 180, 0.1)',
    } as unknown as ViewStyle,
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 12,
    } as ViewStyle,
  })!,
};

export const WEB_GLASS: ViewStyle =
  Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      } as unknown as ViewStyle)
    : {};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const FORMAT_LABELS: Record<'lata' | 'botellin' | 'litrona', string> = {
  lata: 'Lata',
  botellin: 'Botellín',
  litrona: 'Litrona',
};
