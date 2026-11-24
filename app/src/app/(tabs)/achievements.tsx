import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { ChapaCoinIcon } from '../../components/ChapaCoinIcon';
import { ProfileIcon } from '../../components/ProfileIcon';
import { RelicIcon } from '../../components/RelicIcon';
import { useAppTheme } from '../../context/ThemeContext';
import { achievementsApi } from '../../services/api';
import {
  COLORS,
  FONTS,
  GRADIENTS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../theme/tokens';
import { AchievementItem, CosmeticType } from '../../types/api';

const CATEGORIES = [
  'Todas',
  'Colección de Cervezas',
  'Marcas y Descubrimiento',
  'Formatos',
  'Estilos y Graduación',
  'Geografía y Rutas',
  'Social y Amigos',
  'Perfil y Constancia',
  'Logro Definitivo',
] as const;

const COSMETIC_TYPE_LABEL: Record<CosmeticType, string> = {
  frame: 'Marco',
  card_style: 'Carta 3D',
  relic: 'Reliquia',
  color_theme: 'Color',
};

export default function AchievementsScreen() {
  const theme = useAppTheme();
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(100);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAchievements = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await achievementsApi.getAll();
      setAchievements(res.achievements);
      setUnlockedCount(res.unlockedCount);
      setTotalCount(res.totalCount);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAchievements();
    }, [loadAchievements])
  );

  const overallPct =
    totalCount > 0 ? Math.min(100, Math.round((unlockedCount / totalCount) * 100)) : 0;

  const visibleAchievements = useMemo(() => {
    if (selectedCategory === 'Todas') return achievements;
    return achievements.filter((a) => a.category === selectedCategory);
  }, [achievements, selectedCategory]);

  if (loading && achievements.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadAchievements(true)}
          tintColor={theme.primary}
        />
      }
    >
      <LinearGradient
        colors={GRADIENTS.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.summaryCard, { borderColor: theme.border }, SHADOWS.card]}
      >
        <View style={styles.summaryRow}>
          <View>
            <Text style={[styles.summaryLabel, { color: theme.primary }]}>SALA DE TROFEOS</Text>
            <Text style={styles.summaryTitle}>Logros BeerDex</Text>
          </View>
          <LinearGradient colors={theme.gradientBtn} style={styles.summaryBadge}>
            <Ionicons name="trophy" size={17} color={COLORS.bg} />
            <Text style={styles.summaryCount}>
              {unlockedCount} / {totalCount}
            </Text>
          </LinearGradient>
        </View>
        <View style={styles.overallTrack}>
          <LinearGradient
            colors={theme.gradientBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.overallFill, { width: `${overallPct}%` }]}
          />
        </View>
      </LinearGradient>

      {/* Filtro de categorías */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catsScroll}
      >
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <Pressable
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.catChip,
                active && { backgroundColor: theme.tintBg, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.catChipText, active && { color: theme.bright }]}>
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.list}>
        {visibleAchievements.map((ach) => {
          const pct =
            ach.targetValue > 0
              ? Math.min(100, Math.round((ach.currentProgress / ach.targetValue) * 100))
              : 0;

          return (
            <LinearGradient
              key={ach.id}
              colors={ach.unlocked ? GRADIENTS.unlocked : GRADIENTS.card}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.card,
                SHADOWS.card,
                ach.unlocked && { borderColor: theme.border, borderWidth: 1.5 },
              ]}
            >
              {/* Arriba de cada logro sin conseguir: progreso numérico exacto X/Y */}
              <View style={styles.topBar}>
                <Text style={styles.category}>{ach.category.toUpperCase()}</Text>
                {ach.unlocked ? (
                  <View style={styles.doneBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                    <Text style={styles.doneText}>COMPLETADO</Text>
                  </View>
                ) : (
                  <View style={[styles.progressBadge, { borderColor: theme.border }]}>
                    <Text style={[styles.progressCounterText, { color: theme.bright }]}>
                      {ach.currentProgress}/{ach.targetValue}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.mainRow}>
                {ach.unlocked ? (
                  <LinearGradient colors={theme.gradientBtn} style={styles.trophyIconDone}>
                    <Ionicons name="trophy" size={22} color={COLORS.bg} />
                  </LinearGradient>
                ) : (
                  <View style={styles.trophyIcon}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={21}
                      color={COLORS.textMuted}
                    />
                  </View>
                )}

                <View style={styles.textCol}>
                  <Text style={[styles.achName, ach.unlocked && { color: theme.bright }]}>
                    {ach.id}. {ach.name}
                  </Text>
                  <Text style={styles.achDesc}>{ach.description}</Text>

                  {!ach.unlocked ? (
                    <View style={styles.track}>
                      <LinearGradient
                        colors={theme.gradientBtn}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.fill, { width: `${pct}%` }]}
                      />
                    </View>
                  ) : null}

                  <View style={styles.rewardsRow}>
                    {ach.rewardChapas > 0 ? (
                      <View
                        style={[
                          styles.rewardTag,
                          { backgroundColor: theme.tintBg, borderColor: theme.border },
                        ]}
                      >
                        <ChapaCoinIcon size={14} />
                        <Text style={[styles.rewardText, { color: theme.bright }]}>
                          +{ach.rewardChapas} Chapas
                        </Text>
                      </View>
                    ) : null}
                    {ach.rewardTitle ? (
                      <View
                        style={[
                          styles.rewardTag,
                          { backgroundColor: theme.tintBg, borderColor: theme.border },
                        ]}
                      >
                        <Ionicons name="ribbon-outline" size={13} color={theme.bright} />
                        <Text style={[styles.rewardText, { color: theme.bright }]}>
                          Título: "{ach.rewardTitle.name}"
                        </Text>
                      </View>
                    ) : null}
                    {ach.rewardIcon ? (
                      <View
                        style={[
                          styles.rewardTag,
                          { backgroundColor: theme.tintBg, borderColor: theme.border },
                        ]}
                      >
                        <ProfileIcon
                          imageUrl={ach.rewardIcon.imageUrl}
                          size={20}
                          locked={!ach.unlocked}
                        />
                        <Text style={[styles.rewardText, { color: theme.bright }]}>
                          Icono: {ach.rewardIcon.name}
                        </Text>
                      </View>
                    ) : null}
                    {ach.rewardCosmetic ? (
                      <View
                        style={[
                          styles.rewardTag,
                          { backgroundColor: theme.tintBg, borderColor: theme.border },
                        ]}
                      >
                        {ach.rewardCosmetic.type === 'relic' ? (
                          <RelicIcon
                            previewKey={ach.rewardCosmetic.previewKey}
                            size={18}
                            locked={!ach.unlocked}
                          />
                        ) : (
                          <Ionicons
                            name={
                              ach.rewardCosmetic.type === 'frame'
                                ? 'scan-circle-outline'
                                : ach.rewardCosmetic.type === 'card_style'
                                ? 'albums-outline'
                                : 'color-palette-outline'
                            }
                            size={14}
                            color={theme.bright}
                          />
                        )}
                        <Text style={[styles.rewardText, { color: theme.bright }]}>
                          {COSMETIC_TYPE_LABEL[ach.rewardCosmetic.type]}: {ach.rewardCosmetic.name}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            </LinearGradient>
          );
        })}
      </View>
    </ScrollView>
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
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    borderRadius: RADIUS.xl + 2,
    borderWidth: 1.5,
    borderColor: COLORS.borderGold,
    padding: SPACING.lg + 2,
    gap: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: COLORS.amber,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  summaryTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  summaryCount: {
    color: COLORS.bg,
    fontFamily: FONTS.display,
    fontSize: 15,
    fontWeight: '900',
  },
  overallTrack: {
    height: 8,
    backgroundColor: 'rgba(12, 9, 8, 0.7)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  overallFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },
  catsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  catChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catChipActive: {
    backgroundColor: COLORS.amberBg,
    borderColor: COLORS.borderGold,
  },
  catChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  catChipTextActive: {
    color: COLORS.amberBright,
  },
  list: {
    gap: SPACING.md,
  },
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.md + 2,
    gap: SPACING.sm + 2,
  },
  cardUnlocked: {
    borderColor: COLORS.gold,
    borderWidth: 1.5,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  category: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  progressBadge: {
    backgroundColor: 'rgba(12, 9, 8, 0.6)',
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 2.5,
  },
  progressCounterText: {
    color: COLORS.amberBright,
    fontSize: 12,
    fontWeight: '900',
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 2.5,
  },
  doneText: {
    color: COLORS.success,
    fontSize: 10.5,
    fontWeight: '800',
  },
  mainRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'flex-start',
  },
  trophyIcon: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md + 2,
    backgroundColor: 'rgba(12, 9, 8, 0.55)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyIconDone: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 5,
  },
  achName: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 16.5,
    fontWeight: '800',
  },
  achNameDone: {
    color: COLORS.amberBright,
  },
  achDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  track: {
    height: 7,
    backgroundColor: 'rgba(12, 9, 8, 0.7)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    marginTop: 2,
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },
  rewardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 3,
  },
  rewardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.goldBg,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rewardText: {
    color: COLORS.amberBright,
    fontSize: 11.5,
    fontWeight: '700',
  },
});
