import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileIcon } from '../../components/ProfileIcon';
import { RelicIcon } from '../../components/RelicIcon';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useAchievementToast } from '../../context/ToastContext';
import { friendsApi } from '../../services/api';
import {
  COLORS,
  FONTS,
  FORMAT_LABELS,
  GRADIENTS,
  RADIUS,
  SHADOWS,
  SPACING,
  WEB_GLASS,
} from '../../theme/tokens';
import { PublicProfileResponse } from '../../types/api';

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading, refreshMe } = useAuth();
  const userId = user?.id ?? null;
  const { showAchievements } = useAchievementToast();
  const theme = useAppTheme();

  const [data, setData] = useState<PublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !userId) return;
    let active = true;
    (async () => {
      try {
        const res = await friendsApi.getUserProfile(id);
        if (!active) return;
        setData(res);
        if (res.newlyUnlocked?.length) {
          showAchievements(res.newlyUnlocked);
          refreshMe();
        }
      } catch (err) {
        if (!active) return;
        setErrorMsg(
          err instanceof Error ? err.message : 'No se pudo cargar el perfil.'
        );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id, userId, refreshMe, showAchievements]);

  if (!authLoading && !user) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <View style={styles.root}>
      <View style={[styles.topHeaderOuter, { paddingTop: Math.max(insets.top, 8) + 8 }]}>
        <View style={styles.topHeader}>
          <Pressable
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/(tabs)/friends')
            }
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.amberBright} />
            <Text style={styles.backText}>Amigos</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Perfil de Amigo</Text>
          <View style={styles.backPlaceholder} />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.amber} />
        </View>
      ) : errorMsg || !data ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{errorMsg || 'Perfil no disponible.'}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <LinearGradient
            colors={GRADIENTS.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, SHADOWS.card]}
          >
            <ProfileIcon
              imageUrl={data.user.equippedIcon?.imageUrl}
              size={76}
              highlight
              frameCode={data.user.equippedFrame?.code}
              frameMetadata={data.user.equippedFrame?.metadata}
            />
            <Text style={styles.username}>{data.user.username}</Text>
            <View
              style={[
                styles.titlePill,
                { backgroundColor: theme.tintBg, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.titleText, { color: theme.bright }]}>
                {data.user.equippedTitle?.name || 'Cervecero Novato'}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: theme.bright }]}>
                  {data.beerdexProgress.registeredCount} /{' '}
                  {data.beerdexProgress.totalCount}
                </Text>
                <Text style={styles.statLabel}>BeerDex</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statVal, { color: theme.bright }]}>
                  {data.achievementsSummary.unlockedCount} /{' '}
                  {data.achievementsSummary.totalCount}
                </Text>
                <Text style={styles.statLabel}>Logros</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Vitrina de Reliquias del amigo */}
          <LinearGradient
            colors={GRADIENTS.card}
            style={[styles.compareCard, SHADOWS.card]}
          >
            <Text style={styles.sectionTitle}>Vitrina de {data.user.username}</Text>
            <View style={styles.vitrinaRow}>
              {[0, 1, 2].map((idx) => {
                const relic = data.user.showcaseRelics?.[idx] ?? null;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.vitrinaSlot,
                      relic && { borderColor: theme.border },
                    ]}
                  >
                    <LinearGradient
                      colors={
                        relic
                          ? ['#2A1F14', '#140F0B', '#090706']
                          : ['#17120E', '#0D0A08']
                      }
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.vitrinaSlotGrad}
                    >
                      {relic ? (
                        <>
                          <View style={styles.vitrinaLightBar} />
                          <RelicIcon
                            previewKey={relic.previewKey}
                            size={58}
                            pedestal
                            level={relic.relicPower?.level ?? 1}
                          />
                          <View style={styles.vitrinaPlaque}>
                            <Text style={styles.vitrinaSlotName} numberOfLines={1}>
                              {relic.name}
                            </Text>
                            <Text style={styles.vitrinaSlotLv}>
                              Nv. {relic.relicPower?.level ?? 1}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <View style={styles.vitrinaEmptyInner}>
                          <Ionicons name="sparkles-outline" size={20} color={COLORS.textMuted} />
                          <Text style={styles.vitrinaEmptyText}>Sin reliquia</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </View>
                );
              })}
            </View>
          </LinearGradient>

          {data.comparison ? (
            <LinearGradient
              colors={GRADIENTS.card}
              style={[styles.compareCard, SHADOWS.card]}
            >
              <Text style={styles.sectionTitle}>Comparativa BeerDex</Text>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>
                    {data.comparison.commonBeersCount}
                  </Text>
                  <Text style={styles.statLabel}>En común</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>
                    {data.comparison.onlyTargetBeersCount}
                  </Text>
                  <Text style={styles.statLabel}>Te faltan</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>
                    {data.comparison.onlyViewerBeersCount}
                  </Text>
                  <Text style={styles.statLabel}>Tienes tú</Text>
                </View>
              </View>

              {data.comparison.onlyTargetBeers.length > 0 ? (
                <View style={styles.missingWrap}>
                  <Text style={styles.missingLabel}>
                    Cervezas que tiene {data.user.username} y te faltan:
                  </Text>
                  <View style={styles.chipRow}>
                    {data.comparison.onlyTargetBeers.map((b) => (
                      <View key={b.beerId} style={styles.missingChip}>
                        <Text style={styles.missingChipText}>
                          {b.name} · {FORMAT_LABELS[b.format]}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </LinearGradient>
          ) : null}

          <Text style={styles.sectionTitle}>Logros de {data.user.username}</Text>

          <View style={styles.achList}>
            {data.achievements.map((ach) => (
              <LinearGradient
                key={ach.id}
                colors={ach.unlocked ? GRADIENTS.unlocked : GRADIENTS.card}
                style={[styles.achCard, ach.unlocked && styles.achCardUnlocked]}
              >
                <Ionicons
                  name={ach.unlocked ? 'trophy' : 'lock-closed-outline'}
                  size={20}
                  color={ach.unlocked ? COLORS.amberBright : COLORS.lockedText}
                />
                <View style={styles.achInfo}>
                  <Text
                    style={[
                      styles.achName,
                      !ach.unlocked && styles.achNameLocked,
                    ]}
                  >
                    {ach.name}
                  </Text>
                  <Text style={styles.achDesc}>{ach.description}</Text>
                </View>
                <Text
                  style={[
                    styles.achProgress,
                    ach.unlocked && styles.achProgressDone,
                  ]}
                >
                  {ach.unlocked
                    ? '✓'
                    : `${ach.currentProgress}/${ach.targetValue}`}
                </Text>
              </LinearGradient>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
  },
  topHeaderOuter: {
    backgroundColor: COLORS.surfaceGlass,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...WEB_GLASS,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 780,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 78,
  },
  backText: {
    color: COLORS.amberBright,
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: '800',
  },
  backPlaceholder: {
    minWidth: 78,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    padding: SPACING.lg,
    maxWidth: 720,
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
    alignItems: 'center',
    gap: SPACING.sm,
  },
  username: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  titlePill: {
    backgroundColor: COLORS.amberBg,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  titleText: {
    color: COLORS.amberBright,
    fontSize: 13,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
    marginTop: SPACING.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(12, 9, 8, 0.55)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  statVal: {
    color: COLORS.amberBright,
    fontFamily: FONTS.display,
    fontSize: 19,
    fontWeight: '900',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  compareCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  vitrinaRow: {
    flexDirection: 'row',
    gap: SPACING.sm + 2,
  },
  vitrinaSlot: {
    flex: 1,
    minHeight: 120,
    borderRadius: RADIUS.lg + 2,
    borderWidth: 1.25,
    borderColor: COLORS.borderStrong,
    overflow: 'hidden',
  },
  vitrinaSlotGrad: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 6,
  },
  vitrinaLightBar: {
    width: '55%',
    height: 2,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 215, 130, 0.55)',
  },
  vitrinaPlaque: {
    width: '100%',
    backgroundColor: 'rgba(18, 13, 9, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 102, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  vitrinaSlotName: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  vitrinaSlotLv: {
    color: COLORS.amberBright,
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  vitrinaEmptyInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  vitrinaEmptyText: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: '700',
  },
  missingWrap: {
    gap: SPACING.sm,
  },
  missingLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  missingChip: {
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  missingChipText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    color: COLORS.amberBright,
    fontFamily: FONTS.display,
    fontSize: 16.5,
    fontWeight: '800',
  },
  achList: {
    gap: SPACING.sm,
  },
  achCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.md,
  },
  achCardUnlocked: {
    borderColor: COLORS.gold,
  },
  achInfo: {
    flex: 1,
    gap: 2,
  },
  achName: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 14.5,
    fontWeight: '800',
  },
  achNameLocked: {
    color: COLORS.textSecondary,
  },
  achDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  achProgress: {
    color: COLORS.amber,
    fontSize: 12,
    fontWeight: '800',
  },
  achProgressDone: {
    color: COLORS.success,
    fontSize: 15,
  },
});
