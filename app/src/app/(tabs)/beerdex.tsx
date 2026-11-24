import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BeerCard } from '../../components/BeerCard';
import { BrandLogo } from '../../components/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useAchievementToast } from '../../context/ToastContext';
import { beerdexApi } from '../../services/api';
import {
  COLORS,
  FONTS,
  GRADIENTS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../theme/tokens';
import { BeerDexItem, BeerDexResponse, BeerFormat, BrandDexItem } from '../../types/api';

type FilterMode = 'all' | 'unlocked' | 'locked';
type FormatFilter = 'all' | BeerFormat;

interface VisibleBrandEntry {
  brand: BrandDexItem;
  filteredBeers: BeerDexItem[];
}

const BEERDEX_CACHE_KEY = 'beerdex_cache_v1';
const BEERDEX_STALE_TTL_MS = 15_000;
const STYLE_OPTIONS = ['all', 'Lager', 'Tostada', 'IPA', 'Negra', '0,0%', 'Trigo'] as const;

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const BrandListSeparator = React.memo(function BrandListSeparator() {
  return <View style={styles.listSeparator} />;
});

const BrandAccordionItem = React.memo(function BrandAccordionItem({
  brand,
  filteredBeers,
  isExpanded,
  onToggle,
  onFlipToBack,
}: {
  brand: BrandDexItem;
  filteredBeers: BeerDexItem[];
  isExpanded: boolean;
  onToggle: (brandId: number) => void;
  onFlipToBack: (beerId: number) => void;
}) {
  const completed = brand.totalCount > 0 && brand.registeredCount >= brand.totalCount;
  const brandPct =
    brand.totalCount > 0 ? Math.round((brand.registeredCount / brand.totalCount) * 100) : 0;

  return (
    <LinearGradient
      colors={completed ? GRADIENTS.unlocked : GRADIENTS.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.brandSection,
        SHADOWS.card,
        completed && styles.brandCompleted,
      ]}
    >
      <Pressable onPress={() => onToggle(brand.id)} style={styles.brandHeader}>
        <BrandLogo logoUrl={brand.logoUrl} name={brand.name} size={54} />
        <View style={styles.brandInfo}>
          <View style={styles.brandTitleRow}>
            <Text style={styles.brandName} numberOfLines={1}>
              {brand.name}
            </Text>
            <View
              style={[
                styles.brandCountBadge,
                completed && styles.brandCountCompleted,
              ]}
            >
              {completed ? <Ionicons name="trophy" size={11} color={COLORS.gold} /> : null}
              <Text
                style={[
                  styles.brandCountText,
                  completed && styles.brandCountTextCompleted,
                ]}
              >
                {brand.registeredCount} / {brand.totalCount}
              </Text>
            </View>
          </View>
          <View style={styles.brandMiniTrack}>
            <LinearGradient
              colors={GRADIENTS.progress}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.brandMiniFill, { width: `${brandPct}%` }]}
            />
          </View>
        </View>
        <View style={styles.chevronWrap}>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={COLORS.amberBright}
          />
        </View>
      </Pressable>

      {brand.history ? (
        <View style={styles.brandHistoryBox}>
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={[
              styles.brandHistoryScroll,
              isExpanded && styles.brandHistoryScrollExpanded,
            ]}
          >
            <Text style={styles.brandHistory}>{brand.history}</Text>
          </ScrollView>
        </View>
      ) : null}

      {isExpanded ? (
        <View style={styles.brandBody}>
          {filteredBeers.length === 0 ? (
            <Text style={styles.emptyBrandFilter}>
              No hay cervezas en esta categoría para {brand.name}.
            </Text>
          ) : (
            <View style={styles.grid}>
              {filteredBeers.map((beer) => (
                <BeerCard key={beer.id} beer={beer} onFlipToBack={onFlipToBack} />
              ))}
            </View>
          )}
        </View>
      ) : null}
    </LinearGradient>
  );
});

export default function BeerDexScreen() {
  const router = useRouter();
  const { meProfile, refreshMe } = useAuth();
  const theme = useAppTheme();
  const { showAchievements } = useAchievementToast();

  const [data, setData] = useState<BeerDexResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offlineFallback, setOfflineFallback] = useState(false);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');
  const [styleFilter, setStyleFilter] = useState<string>('all');
  const [expandedBrandIds, setExpandedBrandIds] = useState<Set<number>>(new Set());

  const hasLoadedOnceRef = useRef(false);
  const lastFetchedAtRef = useRef(0);
  const lastSyncedBeersCountRef = useRef<number | null>(null);
  const meBeersCountRef = useRef<number | null>(null);
  meBeersCountRef.current = meProfile?.stats.beersRegistered ?? null;

  const fetchDex = useCallback(async (isRefresh = false) => {
    if (
      !isRefresh &&
      hasLoadedOnceRef.current &&
      Date.now() - lastFetchedAtRef.current < BEERDEX_STALE_TTL_MS &&
      meBeersCountRef.current === lastSyncedBeersCountRef.current
    ) {
      return;
    }
    if (isRefresh) setRefreshing(true);
    try {
      const res = await beerdexApi.getDex();
      setData(res);
      setOfflineFallback(false);
      hasLoadedOnceRef.current = true;
      lastFetchedAtRef.current = Date.now();
      lastSyncedBeersCountRef.current = res.global.registeredCount;
      await AsyncStorage.setItem(BEERDEX_CACHE_KEY, JSON.stringify(res)).catch(() => {});
    } catch {
      const cachedRaw = await AsyncStorage.getItem(BEERDEX_CACHE_KEY).catch(() => null);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw) as BeerDexResponse;
          setData(cached);
          setOfflineFallback(true);
        } catch {
          // Ignorar cache corrupto
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDex();
    }, [fetchDex])
  );

  const toggleBrand = useCallback((brandId: number) => {
    setExpandedBrandIds((prev) => {
      const next = new Set(prev);
      if (next.has(brandId)) {
        next.delete(brandId);
      } else {
        next.add(brandId);
      }
      return next;
    });
  }, []);

  const handleFlipToBack = useCallback(
    async (beerId: number) => {
      try {
        const res = await beerdexApi.recordFlip(beerId);
        if (res.newlyUnlocked.length > 0) {
          showAchievements(res.newlyUnlocked);
          refreshMe();
        }
      } catch {
        // Ignorar errores silenciosamente durante flip visual
      }
    },
    [refreshMe, showAchievements]
  );

  const progressPct = useMemo(() => {
    if (!data || data.global.totalCount === 0) return 0;
    return Math.round((data.global.registeredCount / data.global.totalCount) * 100);
  }, [data]);

  const hasActiveSearchOrAttrFilter =
    searchQuery.trim().length > 0 || formatFilter !== 'all' || styleFilter !== 'all';

  const visibleBrands = useMemo<VisibleBrandEntry[]>(() => {
    if (!data) return [];
    const q = normalizeSearchText(searchQuery.trim());

    return data.brands
      .map((brand) => {
        const brandNameMatch = q ? normalizeSearchText(brand.name).includes(q) : false;
        const filteredBeers = brand.beers.filter((beer) => {
          if (filter === 'unlocked' && !beer.unlocked) return false;
          if (filter === 'locked' && beer.unlocked) return false;
          if (formatFilter !== 'all' && beer.format !== formatFilter) return false;
          if (styleFilter !== 'all') {
            const beerStyle = (beer.style || '').toLowerCase();
            if (beerStyle !== styleFilter.toLowerCase()) return false;
          }
          if (q && !brandNameMatch && !normalizeSearchText(beer.name).includes(q)) {
            return false;
          }
          return true;
        });

        return { brand, filteredBeers };
      })
      .filter((entry) => !hasActiveSearchOrAttrFilter || entry.filteredBeers.length > 0);
  }, [data, filter, formatFilter, hasActiveSearchOrAttrFilter, searchQuery, styleFilter]);

  const listHeader = useMemo(
    () => (
      <View style={styles.headerContainer}>
        {offlineFallback ? (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color={COLORS.amberBright} />
            <Text style={styles.offlineText}>
              Modo sin conexión (mostrando última copia guardada)
            </Text>
          </View>
        ) : null}

        {/* Botón superior destacado Registrar Cerveza */}
        <Pressable
          onPress={() => router.push('/scan')}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <LinearGradient
            colors={theme.gradientBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.scanCta, SHADOWS.amberGlow]}
          >
            <Ionicons name="barcode-outline" size={23} color={COLORS.bg} />
            <Text style={styles.scanCtaText}>Registrar Cerveza</Text>
          </LinearGradient>
        </Pressable>

        {/* Contador Global */}
        <LinearGradient
          colors={GRADIENTS.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.globalCard, { borderColor: theme.border }, SHADOWS.card]}
        >
          <View style={styles.globalTopRow}>
            <View>
              <Text style={[styles.globalLabel, { color: theme.primary }]}>PROGRESO GLOBAL</Text>
              <Text style={styles.globalSub}>{data?.brands.length ?? 41} casas cerveceras</Text>
            </View>
            <View style={styles.globalRight}>
              <Text style={styles.globalCounter}>
                {data?.global.registeredCount ?? 0} / {data?.global.totalCount ?? 0}
              </Text>
              <View
                style={[
                  styles.pctBadge,
                  { backgroundColor: theme.tintBg, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.pctBadgeText, { color: theme.bright }]}>{progressPct}%</Text>
              </View>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={theme.gradientBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progressPct}%` }]}
            />
          </View>
        </LinearGradient>

        {/* Buscador rápido */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar cerveza o marca..."
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            style={styles.searchInput}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => setSearchQuery('')}
              hitSlop={8}
              accessibilityLabel="Limpiar búsqueda"
            >
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Filtros segmentados de estado */}
        <View style={styles.segmentedTrack}>
          {(
            [
              { key: 'all', label: 'Todas' },
              { key: 'unlocked', label: 'Conseguidas' },
              { key: 'locked', label: 'Pendientes' },
            ] as const
          ).map((item) => {
            const active = filter === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={[styles.segmentPill, active && styles.segmentPillActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Chips de formato y estilo */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {(
            [
              { key: 'all', label: 'Formato: Todos' },
              { key: 'lata', label: 'Lata' },
              { key: 'botellin', label: 'Botellín' },
              { key: 'litrona', label: 'Litrona' },
            ] as const
          ).map((f) => {
            const active = formatFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFormatFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {STYLE_OPTIONS.map((st) => {
            const active = styleFilter === st;
            return (
              <Pressable
                key={st}
                onPress={() => setStyleFilter(st)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {st === 'all' ? 'Estilo: Todos' : st}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    ),
    [
      offlineFallback,
      router,
      theme,
      data?.brands.length,
      data?.global.registeredCount,
      data?.global.totalCount,
      progressPct,
      searchQuery,
      filter,
      formatFilter,
      styleFilter,
    ]
  );

  const listEmpty = useMemo(
    () => (
      <LinearGradient colors={GRADIENTS.card} style={[styles.emptySearchBox, SHADOWS.card]}>
        <Ionicons name="beer-outline" size={34} color={COLORS.textMuted} />
        <Text style={styles.emptyBrandFilter}>
          No encontramos cervezas con esos filtros.
        </Text>
        {hasActiveSearchOrAttrFilter ? (
          <Pressable
            onPress={() => {
              setSearchQuery('');
              setFormatFilter('all');
              setStyleFilter('all');
              setFilter('all');
            }}
            style={styles.clearFiltersBtn}
          >
            <Text style={styles.clearFiltersText}>Restablecer filtros</Text>
          </Pressable>
        ) : null}
      </LinearGradient>
    ),
    [hasActiveSearchOrAttrFilter]
  );

  const renderBrandItem = useCallback(
    ({ item }: { item: VisibleBrandEntry }) => (
      <BrandAccordionItem
        brand={item.brand}
        filteredBeers={item.filteredBeers}
        isExpanded={hasActiveSearchOrAttrFilter || expandedBrandIds.has(item.brand.id)}
        onToggle={toggleBrand}
        onFlipToBack={handleFlipToBack}
      />
    ),
    [hasActiveSearchOrAttrFilter, expandedBrandIds, toggleBrand, handleFlipToBack]
  );

  const keyExtractor = useCallback((item: VisibleBrandEntry) => String(item.brand.id), []);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.amber} />
        <Text style={styles.loadingText}>Cargando tu BeerDex...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      data={visibleBrands}
      extraData={expandedBrandIds}
      keyExtractor={keyExtractor}
      renderItem={renderBrandItem}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={listEmpty}
      ItemSeparatorComponent={BrandListSeparator}
      initialNumToRender={10}
      maxToRenderPerBatch={8}
      windowSize={7}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchDex(true)}
          tintColor={COLORS.amber}
        />
      }
    />
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
    paddingBottom: SPACING.xxl,
  },
  headerContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  listSeparator: {
    height: SPACING.md,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.amberBg,
    borderWidth: 1,
    borderColor: COLORS.amber,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  offlineText: {
    color: COLORS.amberBright,
    fontSize: 12,
    fontWeight: '700',
  },
  scanCta: {
    borderRadius: RADIUS.lg + 2,
    paddingVertical: 15,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  scanCtaText: {
    color: COLORS.bg,
    fontFamily: FONTS.display,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  globalCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.lg,
    gap: SPACING.sm + 2,
  },
  globalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  globalLabel: {
    color: COLORS.amber,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  globalSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  globalRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  globalCounter: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: '900',
  },
  pctBadge: {
    backgroundColor: COLORS.amberBg,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  pctBadgeText: {
    color: COLORS.amberBright,
    fontSize: 12,
    fontWeight: '900',
  },
  progressTrack: {
    height: 10,
    backgroundColor: 'rgba(12, 9, 8, 0.7)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceGlass,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14.5,
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: '#120E0C',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    padding: 4,
    gap: 4,
  },
  segmentPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
  },
  segmentPillActive: {
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
  },
  filterText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  filterTextActive: {
    color: COLORS.amberBright,
    fontWeight: '800',
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 6.5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.amberBg,
    borderColor: COLORS.borderGold,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: COLORS.amberBright,
  },
  brandSection: {
    borderRadius: RADIUS.xl + 2,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    overflow: 'hidden',
  },
  brandCompleted: {
    borderColor: COLORS.gold,
    borderWidth: 1.5,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md + 2,
    gap: SPACING.md,
  },
  brandInfo: {
    flex: 1,
    gap: 5,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  brandName: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: '800',
    flexShrink: 1,
  },
  brandCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(12, 9, 8, 0.55)',
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  brandCountCompleted: {
    backgroundColor: COLORS.goldBg,
    borderColor: COLORS.gold,
  },
  brandCountText: {
    color: COLORS.amberBright,
    fontSize: 12,
    fontWeight: '800',
  },
  brandCountTextCompleted: {
    color: COLORS.gold,
  },
  brandHistoryBox: {
    paddingHorizontal: SPACING.md + 2,
    paddingBottom: SPACING.md,
  },
  brandHistoryScroll: {
    maxHeight: 58,
  },
  brandHistoryScrollExpanded: {
    maxHeight: 112,
  },
  brandHistory: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
  },
  brandMiniTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 224, 180, 0.08)',
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    marginTop: 2,
  },
  brandMiniFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },
  chevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.amberBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBody: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
    backgroundColor: 'rgba(12, 9, 8, 0.3)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptySearchBox: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyBrandFilter: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
  },
  clearFiltersBtn: {
    backgroundColor: COLORS.amberBg,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  clearFiltersText: {
    color: COLORS.amberBright,
    fontSize: 13,
    fontWeight: '800',
  },
});
