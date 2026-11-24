import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { tabernasApi } from '../../services/api';
import {
  COLORS,
  FONTS,
  GRADIENTS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../theme/tokens';
import { TabernaRankingEntry } from '../../types/api';

type RankingScope = 'global' | 'monthly';

export default function TabernasRankingScreen() {
  const router = useRouter();
  const theme = useAppTheme();

  const [scope, setScope] = useState<RankingScope>('global');
  const [month, setMonth] = useState('');
  const [ranking, setRanking] = useState<TabernaRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRanking = useCallback(
    async (targetScope: RankingScope, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const res = await tabernasApi.getRanking(targetScope);
        setRanking(res.ranking);
        setMonth(res.month);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadRanking(scope);
    }, [loadRanking, scope])
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRanking(scope, true)}
            tintColor={theme.primary}
          />
        }
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/tabernas'))}
          style={styles.backLink}
        >
          <Ionicons name="arrow-back" size={17} color={theme.bright} />
          <Text style={[styles.backLinkText, { color: theme.bright }]}>Volver a Tabernas</Text>
        </Pressable>

        <LinearGradient
          colors={GRADIENTS.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { borderColor: theme.border }, SHADOWS.card]}
        >
          <View style={styles.heroRow}>
            <Ionicons name="podium" size={26} color={theme.bright} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: theme.primary }]}>
                CLASIFICACIÓN DE HERMANDADES
              </Text>
              <Text style={styles.heroTitle}>Ranking de Tabernas</Text>
            </View>
          </View>
          <Text style={styles.heroSub}>
            {scope === 'monthly'
              ? `Puntos ganados en ${month || 'el mes actual'}. El Top 3 al cierre del mes desbloquea el logro #110 «Élite del Ranking» (+2.500 Chapas y Carta Estandarte Real).`
              : 'Clasificación histórica ordenada por Nivel y Puntos acumulados.'}
          </Text>
        </LinearGradient>

        <View style={styles.tabsTrack}>
          <Pressable
            onPress={() => {
              setScope('global');
              void loadRanking('global');
            }}
            style={[styles.tabBtn, scope === 'global' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, scope === 'global' && { color: theme.bright }]}>
              Global
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setScope('monthly');
              void loadRanking('monthly');
            }}
            style={[styles.tabBtn, scope === 'monthly' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, scope === 'monthly' && { color: theme.bright }]}>
              Mensual ({month || 'Mes'})
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : ranking.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="trophy-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Aún no hay Tabernas en el ranking</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {ranking.map((entry) => {
              const medalColor =
                entry.rank === 1
                  ? '#FFD166'
                  : entry.rank === 2
                  ? '#D6DCE5'
                  : entry.rank === 3
                  ? '#D98F4E'
                  : COLORS.textSecondary;

              return (
                <Pressable
                  key={entry.id}
                  onPress={() => router.push(`/tabernas/${entry.id}`)}
                  style={({ pressed }) => [pressed && { opacity: 0.9 }]}
                >
                  <LinearGradient
                    colors={entry.isMember ? GRADIENTS.unlocked : GRADIENTS.card}
                    style={[
                      styles.rankCard,
                      SHADOWS.card,
                      entry.isMember && { borderColor: theme.border, borderWidth: 1.5 },
                    ]}
                  >
                    <View
                      style={[
                        styles.rankBadge,
                        entry.rank <= 3 && { borderColor: medalColor },
                      ]}
                    >
                      <Text style={[styles.rankNum, { color: medalColor }]}>
                        #{entry.rank}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text style={styles.nameText} numberOfLines={1}>
                          {entry.name}
                        </Text>
                        {entry.isMember ? (
                          <View style={[styles.myTag, { backgroundColor: theme.tintBg, borderColor: theme.border }]}>
                            <Text style={[styles.myTagText, { color: theme.bright }]}>Tuya</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.metaText}>
                        Nv. {entry.level} · {entry.memberCount}/{entry.maxMembers} miembros
                      </Text>
                    </View>

                    <View style={[styles.scorePill, { borderColor: theme.border }]}>
                      <Text style={[styles.scoreText, { color: theme.bright }]}>
                        {scope === 'monthly'
                          ? `${entry.monthlyPoints} pts`
                          : `${entry.points} pts`}
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>
        )}
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
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  backLinkText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  heroCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: '900',
  },
  heroSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  tabsTrack: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: COLORS.elevated,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.display,
    fontSize: 13.5,
    fontWeight: '800',
  },
  center: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
  },
  emptyBox: {
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 16,
    fontWeight: '900',
  },
  list: {
    gap: SPACING.sm,
  },
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  rankBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.elevated,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: {
    fontFamily: FONTS.display,
    fontSize: 15,
    fontWeight: '900',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameText: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 15.5,
    fontWeight: '900',
    flexShrink: 1,
  },
  myTag: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  myTagText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  scorePill: {
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scoreText: {
    fontFamily: FONTS.display,
    fontSize: 13,
    fontWeight: '900',
  },
});
