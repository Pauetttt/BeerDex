import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { COLORS, FONTS, RADIUS, SPACING, WEB_GLASS } from '../theme/tokens';
import { ChapaCoinIcon } from './ChapaCoinIcon';
import { ProfileIcon } from './ProfileIcon';

interface Props {
  showBackToMenu?: boolean;
}

const EMBLEM_SOURCE = require('../../assets/beerdex-emblem.png');

export function GlobalHeader({ showBackToMenu = false }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const theme = useAppTheme();

  const isNarrow = width < 430;
  const chapasValue = user?.chapas ?? 0;

  return (
    <View style={[styles.outer, { paddingTop: Math.max(insets.top, 8) + 6 }]}>
      <View
        style={[
          styles.container,
          { paddingHorizontal: isNarrow ? 12 : SPACING.lg },
        ]}
      >
        <Pressable
          onPress={() => router.push('/menu')}
          style={({ pressed }) => [styles.brandBtn, pressed && styles.pressed]}
          accessibilityLabel="Ir al menú inicial de BeerDex"
        >
          <View
            style={[
              styles.logoBadge,
              { borderColor: theme.border },
              isNarrow && styles.logoBadgeNarrow,
            ]}
          >
            <Image source={EMBLEM_SOURCE} style={styles.logoImg} resizeMode="cover" />
          </View>
          <View>
            <Text style={[styles.logoText, { color: theme.bright }, isNarrow && styles.logoTextNarrow]}>
              BeerDex
            </Text>
            {showBackToMenu ? (
              <Text style={styles.subHint}>← Menú</Text>
            ) : !isNarrow ? (
              <Text style={styles.subTagline}>COLECCIÓN CERVECERA</Text>
            ) : null}
          </View>
        </Pressable>

        {user ? (
          <Pressable
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [
              styles.userPill,
              {
                minWidth: isNarrow ? 228 : 304,
                maxWidth: isNarrow ? '73%' : '68%',
              },
              pressed && styles.pressed,
            ]}
            accessibilityLabel="Abrir perfil y personalización"
          >
            <View style={styles.userTextCol}>
              <View style={styles.userTopRow}>
                <View
                  style={[
                    styles.chapasPill,
                    { backgroundColor: theme.tintBg, borderColor: theme.border },
                  ]}
                >
                  <ChapaCoinIcon size={13} />
                  <Text style={[styles.chapasText, { color: theme.bright }]}>
                    {chapasValue.toLocaleString('es-ES')}
                  </Text>
                </View>
                <Text style={styles.username} numberOfLines={1}>
                  {user.username}
                </Text>
              </View>
              <Text style={[styles.titleText, { color: theme.bright }]} numberOfLines={1}>
                {user.equippedTitle?.name || 'Cervecero Novato'}
              </Text>
            </View>
            <View style={styles.avatarSlot}>
              <ProfileIcon
                imageUrl={user.equippedIcon?.imageUrl}
                size={35}
                highlight
                frameCode={user.equippedFrame?.code}
                frameMetadata={user.equippedFrame?.metadata}
              />
            </View>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: COLORS.surfaceGlass,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 208, 102, 0.14)',
    ...WEB_GLASS,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    overflow: 'visible',
  },
  brandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.86,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#0B0807',
    borderWidth: 1.5,
    borderColor: COLORS.borderGold,
    overflow: 'hidden',
  },
  logoBadgeNarrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  logoText: {
    color: COLORS.amberBright,
    fontFamily: FONTS.brand,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.3,
    lineHeight: 27,
  },
  logoTextNarrow: {
    fontSize: 21,
    lineHeight: 24,
  },
  subHint: {
    color: COLORS.textSecondary,
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: -2,
  },
  subTagline: {
    color: COLORS.textMuted,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.0,
    marginTop: -1,
  },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: 'rgba(33, 27, 22, 0.88)',
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.pill,
    minHeight: 60,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 6,
    flexShrink: 1,
    overflow: 'visible',
  },
  avatarSlot: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'visible',
  },
  userTextCol: {
    alignItems: 'flex-end',
    flexShrink: 1,
    minWidth: 0,
    gap: 1,
  },
  userTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    maxWidth: '100%',
  },
  chapasPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    flexShrink: 0,
  },
  chapasText: {
    fontFamily: FONTS.display,
    fontSize: 10.5,
    fontWeight: '900',
  },
  username: {
    color: COLORS.text,
    fontSize: 12.5,
    fontWeight: '800',
    flexShrink: 1,
  },
  titleText: {
    color: COLORS.amberBright,
    fontSize: 10,
    fontWeight: '700',
  },
});
