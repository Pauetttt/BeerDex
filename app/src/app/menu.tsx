import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ChapaCoinIcon } from '../components/ChapaCoinIcon';
import { GlobalHeader } from '../components/GlobalHeader';
import { ProfileIcon } from '../components/ProfileIcon';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { COLORS, FONTS, GRADIENTS, RADIUS, SHADOWS, SPACING } from '../theme/tokens';

export default function MenuScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, meProfile, loading, refreshMe } = useAuth();
  const userId = user?.id ?? null;
  const theme = useAppTheme();

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        refreshMe();
      }
    }, [userId, refreshMe])
  );

  if (!loading && !user) {
    return <Redirect href="/auth/login" />;
  }

  const beersRegistered = meProfile?.stats.beersRegistered ?? 0;
  const beersTotal = meProfile?.stats.beersTotal ?? 557;
  const achUnlocked = meProfile?.stats.achievementsUnlocked ?? 0;
  const achTotal = meProfile?.stats.achievementsTotal ?? 100;
  const chapasBalance = user?.chapas ?? 0;
  const beersPct = beersTotal > 0 ? Math.min(100, Math.round((beersRegistered / beersTotal) * 100)) : 0;
  const achPct = achTotal > 0 ? Math.min(100, Math.round((achUnlocked / achTotal) * 100)) : 0;
  const relicsOwned = meProfile?.cosmetics.relics.filter((r) => r.unlocked).length ?? 0;
  const relicsTotal = meProfile?.cosmetics.relics.length ?? 16;
  const activeRelicsCount =
    meProfile?.activeRelicsSummary?.activeCount ??
    user?.showcaseRelics?.filter(Boolean).length ??
    0;
  const isTwoCol = width >= 620;

  return (
    <View style={styles.root}>
      <GlobalHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient
          colors={GRADIENTS.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { borderColor: theme.border }, SHADOWS.card]}
        >
          <View style={styles.heroTopRow}>
            <ProfileIcon
              imageUrl={user?.equippedIcon?.imageUrl}
              size={64}
              highlight
              frameCode={user?.equippedFrame?.code}
              frameMetadata={user?.equippedFrame?.metadata}
            />
            <View style={styles.heroTextCol}>
              <Text style={[styles.welcomeEyebrow, { color: theme.primary }]}>
                PANEL DE COLECCIONISTA
              </Text>
              <Text style={styles.welcomeTitle} numberOfLines={1}>
                ¡Salud, {user?.username || 'Cervecero'}!
              </Text>
              <View style={styles.badgesRow}>
                <View
                  style={[
                    styles.equippedTitleBadge,
                    { backgroundColor: theme.tintBg, borderColor: theme.border },
                  ]}
                >
                  <Ionicons name="ribbon" size={12} color={theme.bright} />
                  <Text style={[styles.equippedTitleText, { color: theme.bright }]} numberOfLines={1}>
                    {user?.equippedTitle?.name || 'Cervecero Novato'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.equippedTitleBadge,
                    { backgroundColor: theme.tintBg, borderColor: theme.border },
                  ]}
                >
                  <ChapaCoinIcon size={13} />
                  <Text style={[styles.equippedTitleText, { color: theme.bright }]}>
                    {chapasBalance.toLocaleString('es-ES')} Chapas
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.miniBarsRow}>
            <View style={styles.miniBarCard}>
              <View style={styles.miniBarHeader}>
                <Text style={styles.miniBarLabel}>BEERDEX</Text>
                <Text style={[styles.miniBarVal, { color: theme.bright }]}>
                  {beersRegistered}/{beersTotal}
                </Text>
              </View>
              <View style={styles.miniTrack}>
                <LinearGradient
                  colors={theme.gradientBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.miniFill, { width: `${beersPct}%` }]}
                />
              </View>
            </View>

            <View style={styles.miniBarCard}>
              <View style={styles.miniBarHeader}>
                <Text style={styles.miniBarLabel}>LOGROS</Text>
                <Text style={[styles.miniBarVal, { color: theme.bright }]}>
                  {achUnlocked}/{achTotal}
                </Text>
              </View>
              <View style={styles.miniTrack}>
                <LinearGradient
                  colors={theme.gradientBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.miniFill, { width: `${achPct}%` }]}
                />
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/scan')}
            style={({ pressed }) => [styles.heroScanWrap, pressed && styles.pressed]}
          >
            <LinearGradient
              colors={theme.gradientBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.heroScanBtn, SHADOWS.amberGlow]}
            >
              <Ionicons name="barcode-outline" size={21} color={COLORS.bg} />
              <Text style={styles.heroScanText}>Registrar Cerveza</Text>
            </LinearGradient>
          </Pressable>
        </LinearGradient>

        <View style={[styles.menuGrid, isTwoCol && styles.menuGridTwoCol]}>
          <Pressable
            onPress={() => router.push('/(tabs)/beerdex')}
            style={({ pressed }) => [
              isTwoCol ? styles.menuItemHalf : styles.menuItemFull,
              pressed && styles.pressed,
            ]}
          >
            <LinearGradient
              colors={GRADIENTS.unlocked}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.menuCard,
                styles.menuCardPrimary,
                { borderColor: theme.border },
                SHADOWS.card,
              ]}
            >
              <LinearGradient colors={theme.gradientBtn} style={styles.iconBoxPrimary}>
                <Ionicons name="beer" size={28} color={COLORS.bg} />
              </LinearGradient>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>BeerDex</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  Explora 41 marcas reales, gira fichas 3D y amplía tus fotos
                </Text>
                <View
                  style={[
                    styles.statPill,
                    { backgroundColor: theme.tintBg, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.statPillText, { color: theme.bright }]}>
                    {beersRegistered} / {beersTotal} registradas ({beersPct}%)
                  </Text>
                </View>
              </View>
              <View style={[styles.chevronCirclePrimary, { backgroundColor: theme.tintBg }]}>
                <Ionicons name="chevron-forward" size={20} color={theme.bright} />
              </View>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/shop')}
            style={({ pressed }) => [
              isTwoCol ? styles.menuItemHalf : styles.menuItemFull,
              pressed && styles.pressed,
            ]}
          >
            <LinearGradient
              colors={GRADIENTS.card}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.menuCard, SHADOWS.card]}
            >
              <View style={[styles.iconBox, { borderColor: theme.border }]}>
                <Ionicons name="storefront" size={26} color={theme.bright} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>La Bodega</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  Canjea tus Chapas por cosméticos, marcos y reliquias
                </Text>
                <View
                  style={[
                    styles.statPill,
                    { backgroundColor: theme.tintBg, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.statPillText, { color: theme.bright }]}>
                    Saldo: {chapasBalance.toLocaleString('es-ES')} Chapas
                  </Text>
                </View>
              </View>
              <View style={styles.chevronCircle}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </View>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/achievements')}
            style={({ pressed }) => [
              isTwoCol ? styles.menuItemHalf : styles.menuItemFull,
              pressed && styles.pressed,
            ]}
          >
            <LinearGradient
              colors={GRADIENTS.card}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.menuCard, SHADOWS.card]}
            >
              <View style={styles.iconBox}>
                <Ionicons name="trophy" size={26} color={theme.bright} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Logros</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  Completa misiones y gana Chapas, títulos e iconos
                </Text>
                <View
                  style={[
                    styles.statPill,
                    { backgroundColor: theme.tintBg, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.statPillText, { color: theme.bright }]}>
                    {achUnlocked} / {achTotal} completados
                  </Text>
                </View>
              </View>
              <View style={styles.chevronCircle}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </View>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/friends')}
            style={({ pressed }) => [
              isTwoCol ? styles.menuItemHalf : styles.menuItemFull,
              pressed && styles.pressed,
            ]}
          >
            <LinearGradient
              colors={GRADIENTS.card}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.menuCard, SHADOWS.card]}
            >
              <View style={styles.iconBox}>
                <Ionicons name="people" size={26} color={theme.bright} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Amigos</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  Compite en el ranking del grupo y compara colecciones
                </Text>
                <View
                  style={[
                    styles.statPill,
                    { backgroundColor: theme.tintBg, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.statPillText, { color: theme.bright }]}>
                    Comunidad y vitrinas
                  </Text>
                </View>
              </View>
              <View style={styles.chevronCircle}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </View>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => router.push('/treasury')}
            style={({ pressed }) => [styles.menuItemFull, pressed && styles.pressed]}
          >
            <LinearGradient
              colors={GRADIENTS.card}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.menuCard, { borderColor: theme.border }, SHADOWS.card]}
            >
              <View style={[styles.iconBox, { borderColor: theme.border }]}>
                <Ionicons name="diamond" size={26} color={theme.bright} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>Tesorería</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  Mejora tus reliquias del Nv. 1 al Nv. 5 y multiplica tus Chapas
                </Text>
                <View
                  style={[
                    styles.statPill,
                    { backgroundColor: theme.tintBg, borderColor: theme.border },
                  ]}
                >
                  <Text style={[styles.statPillText, { color: theme.bright }]}>
                    {relicsOwned} / {relicsTotal} reliquias · {activeRelicsCount}/3 activas
                  </Text>
                </View>
              </View>
              <View style={styles.chevronCircle}>
                <Ionicons name="chevron-forward" size={20} color={theme.bright} />
              </View>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
  },
  content: {
    padding: SPACING.lg,
    maxWidth: 740,
    width: '100%',
    alignSelf: 'center',
    gap: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  heroCard: {
    borderRadius: RADIUS.xl + 4,
    borderWidth: 1.5,
    borderColor: COLORS.borderGold,
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  heroTextCol: {
    flex: 1,
    gap: 4,
  },
  welcomeEyebrow: {
    color: COLORS.amber,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  welcomeTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 25,
    fontWeight: '900',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  equippedTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.amberBg,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  equippedTitleText: {
    color: COLORS.amberBright,
    fontSize: 11.5,
    fontWeight: '800',
  },
  miniBarsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  miniBarCard: {
    flex: 1,
    backgroundColor: 'rgba(12, 9, 8, 0.55)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 6,
  },
  miniBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniBarLabel: {
    color: COLORS.textSecondary,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  miniBarVal: {
    color: COLORS.amberBright,
    fontFamily: FONTS.display,
    fontSize: 13,
    fontWeight: '900',
  },
  miniTrack: {
    height: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 224, 180, 0.08)',
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },
  heroScanWrap: {
    width: '100%',
  },
  heroScanBtn: {
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  heroScanText: {
    color: COLORS.bg,
    fontFamily: FONTS.display,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  menuGrid: {
    gap: SPACING.md,
  },
  menuGridTwoCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItemFull: {
    width: '100%',
  },
  menuItemHalf: {
    width: '48.8%',
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl + 2,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.lg,
    gap: SPACING.md,
    minHeight: 112,
  },
  menuCardPrimary: {
    borderColor: COLORS.borderGold,
    borderWidth: 1.5,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxPrimary: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 19,
    fontWeight: '900',
  },
  cardDesc: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    lineHeight: 17,
  },
  statPill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: COLORS.amberBg,
    borderWidth: 1,
    borderColor: 'rgba(236, 161, 42, 0.25)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 2.5,
  },
  statPillText: {
    color: COLORS.amberBright,
    fontSize: 11,
    fontWeight: '800',
  },
  chevronCirclePrimary: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.amberBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
