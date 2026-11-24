import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChapaCoinIcon } from '../components/ChapaCoinIcon';
import { RELIC_LEVEL_COLORS, RelicIcon } from '../components/RelicIcon';
import { useAppAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { useAchievementToast } from '../context/ToastContext';
import { meApi, shopApi } from '../services/api';
import {
  COLORS,
  FONTS,
  GRADIENTS,
  RADIUS,
  SHADOWS,
  SPACING,
  WEB_GLASS,
} from '../theme/tokens';
import { CosmeticItem } from '../types/api';

type TreasuryFilter = 'owned' | 'all' | 'shop' | 'achievement';

export default function TreasuryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, meProfile, loading, refreshMe, applyMeProfile } = useAuth();
  const userId = user?.id ?? null;
  const { showAlert } = useAppAlert();
  const { showAchievements } = useAchievementToast();
  const theme = useAppTheme();

  const [filter, setFilter] = useState<TreasuryFilter>(() =>
    meProfile?.cosmetics.relics.some((r) => r.unlocked) ? 'owned' : 'all'
  );
  const hasAutoSelectedFilter = useRef(
    Boolean(meProfile?.cosmetics.relics.some((r) => r.unlocked))
  );

  const [editingSlot, setEditingSlot] = useState<1 | 2 | 3 | null>(null);
  const [relicPickTarget, setRelicPickTarget] = useState<CosmeticItem | null>(null);
  const [upgradeTarget, setUpgradeTarget] = useState<CosmeticItem | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        refreshMe();
      }
    }, [userId, refreshMe])
  );

  useEffect(() => {
    if (!meProfile || hasAutoSelectedFilter.current) return;
    hasAutoSelectedFilter.current = true;
    if (meProfile.cosmetics.relics.some((r) => r.unlocked)) {
      setFilter('owned');
    } else {
      setFilter('all');
    }
  }, [meProfile]);

  const allRelics = useMemo(() => meProfile?.cosmetics.relics ?? [], [meProfile]);
  const ownedRelics = useMemo(() => allRelics.filter((r) => r.unlocked), [allRelics]);

  const visibleRelics = useMemo(() => {
    if (filter === 'owned') return ownedRelics;
    if (filter === 'shop') return allRelics.filter((r) => r.source === 'shop');
    if (filter === 'achievement') return allRelics.filter((r) => r.source === 'achievement');
    return allRelics;
  }, [allRelics, ownedRelics, filter]);

  if (!loading && !user) {
    return <Redirect href="/auth/login" />;
  }

  const balance = meProfile?.user.chapas ?? user?.chapas ?? 0;
  const showcaseSlots = meProfile?.user.showcaseRelics ?? [null, null, null];
  const activeSummary = meProfile?.activeRelicsSummary;

  const findEquippedSlot = (relicId: number): 1 | 2 | 3 | null => {
    for (let i = 0; i < 3; i += 1) {
      if (showcaseSlots[i]?.id === relicId) {
        return (i + 1) as 1 | 2 | 3;
      }
    }
    return null;
  };

  const assignRelicToSlot = async (slot: 1 | 2 | 3, relicId: number | null) => {
    if (savingSlot) return;
    setSavingSlot(true);
    try {
      const payload =
        slot === 1
          ? { showcaseSlot1Id: relicId }
          : slot === 2
          ? { showcaseSlot2Id: relicId }
          : { showcaseSlot3Id: relicId };
      const updated = await meApi.equip(payload);
      applyMeProfile(updated);
      if (updated.newlyUnlocked?.length) {
        showAchievements(updated.newlyUnlocked);
      }
      setEditingSlot(null);
      setRelicPickTarget(null);
    } catch (err) {
      showAlert('Error', err instanceof Error ? err.message : 'No se pudo actualizar la vitrina.');
    } finally {
      setSavingSlot(false);
    }
  };

  const handleOpenUpgrade = (relic: CosmeticItem) => {
    const cost = relic.relicPower?.nextUpgradeCost;
    if (!cost) return;
    if (balance < cost) {
      const missing = cost - balance;
      showAlert(
        'Chapas insuficientes',
        `Necesitas ${missing.toLocaleString('es-ES')} Chapas más para mejorar "${relic.name}" a Nivel ${(relic.relicPower?.level ?? 1) + 1}.`
      );
      return;
    }
    setUpgradeTarget(relic);
  };

  const handleConfirmUpgrade = async () => {
    if (!upgradeTarget || upgrading) return;
    setUpgrading(true);
    try {
      const res = await shopApi.upgradeRelic(upgradeTarget.id);
      applyMeProfile(res.profile);
      const name = upgradeTarget.name;
      setUpgradeTarget(null);
      showAlert(
        `¡Reliquia mejorada a Nivel ${res.newLevel}!`,
        `"${name}" ahora tiene mayor poder en tu colección.`
      );
    } catch (err) {
      showAlert(
        'No se pudo mejorar',
        err instanceof Error ? err.message : 'Error al mejorar la reliquia.'
      );
    } finally {
      setUpgrading(false);
    }
  };

  const filterTabs: Array<{ key: TreasuryFilter; label: string }> = [
    { key: 'owned', label: `En posesión (${ownedRelics.length})` },
    { key: 'all', label: `Todas (${allRelics.length})` },
    { key: 'shop', label: 'Tienda (10)' },
    { key: 'achievement', label: 'Logros (6)' },
  ];

  return (
    <View style={styles.root}>
      {/* Cabecera superior */}
      <View style={[styles.topHeaderOuter, { paddingTop: Math.max(insets.top, 8) + 8 }]}>
        <View style={styles.topHeader}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/menu'))}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color={theme.bright} />
            <Text style={[styles.backText, { color: theme.bright }]}>Volver</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Tesorería</Text>
          <View
            style={[
              styles.headerChapasPill,
              { backgroundColor: theme.tintBg, borderColor: theme.border },
            ]}
          >
            <ChapaCoinIcon size={14} />
            <Text style={[styles.headerChapasText, { color: theme.bright }]}>
              {balance.toLocaleString('es-ES')}
            </Text>
          </View>
        </View>
      </View>

      {!meProfile ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Vitrina Activa: 3 Multiplicadores */}
          <LinearGradient
            colors={GRADIENTS.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { borderColor: theme.border }, SHADOWS.card]}
          >
            <View style={styles.heroHeaderRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.heroEyebrow, { color: theme.primary }]}>
                  VITRINA ACTIVA · 3 MULTIPLICADORES
                </Text>
                <Text style={styles.heroTitle}>Tus Reliquias Activas</Text>
                <Text style={styles.heroSub}>
                  Solo las 3 reliquias expuestas en tu vitrina aplican su bonificación de Chapas. Mejora su nivel del 1 al 5 aquí.
                </Text>
              </View>
            </View>

            <View style={styles.vitrinaRow}>
              {([0, 1, 2] as const).map((idx) => {
                const relic = showcaseSlots[idx] ?? null;
                const slotNum = (idx + 1) as 1 | 2 | 3;
                const lvl = relic?.relicPower?.level ?? 1;
                const lvlColor = RELIC_LEVEL_COLORS[lvl] || theme.bright;

                return (
                  <Pressable
                    key={idx}
                    onPress={() => setEditingSlot(slotNum)}
                    style={[
                      styles.vitrinaSlot,
                      relic && { borderColor: lvlColor },
                    ]}
                  >
                    <LinearGradient
                      colors={
                        relic
                          ? ['#2A1F14', '#140F0B', '#090706']
                          : ['#17120E', '#0D0A08']
                      }
                      style={styles.vitrinaSlotGrad}
                    >
                      {relic ? (
                        <>
                          <View style={styles.slotTopBar}>
                            <View style={[styles.slotLvPill, { borderColor: lvlColor }]}>
                              <Text style={[styles.slotLvText, { color: lvlColor }]}>
                                Nv.{lvl}
                              </Text>
                            </View>
                          </View>
                          <RelicIcon
                            previewKey={relic.previewKey}
                            size={54}
                            pedestal
                            level={lvl}
                          />
                          <View style={styles.vitrinaPlaque}>
                            <Text style={styles.vitrinaSlotName} numberOfLines={1}>
                              {relic.name}
                            </Text>
                            {relic.relicPower?.shortTag ? (
                              <Text style={[styles.vitrinaSlotEffect, { color: theme.bright }]} numberOfLines={1}>
                                {relic.relicPower.shortTag}
                              </Text>
                            ) : null}
                          </View>
                        </>
                      ) : (
                        <View style={styles.vitrinaEmptyInner}>
                          <Ionicons name="add-circle-outline" size={22} color={COLORS.textMuted} />
                          <Text style={styles.vitrinaEmptyText}>Hueco {slotNum}</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>

            {/* Resumen de multiplicadores activos */}
            <View style={styles.activeSummaryBox}>
              <Text style={styles.activeSummaryTitle}>
                BONIFICACIONES ACTIVAS ({activeSummary?.activeCount ?? 0}/3)
              </Text>
              {activeSummary && activeSummary.effects.length > 0 ? (
                <View style={styles.activeEffectsChips}>
                  {activeSummary.effects.map((eff) => (
                    <View
                      key={eff.relicId}
                      style={[
                        styles.activeEffectChip,
                        eff.active
                          ? { backgroundColor: theme.tintBg, borderColor: theme.border }
                          : styles.inactiveEffectChip,
                      ]}
                    >
                      <Text
                        style={[
                          styles.activeEffectChipText,
                          { color: eff.active ? theme.bright : COLORS.textMuted },
                        ]}
                      >
                        {eff.name} Nv.{eff.level}: {eff.shortTag}
                        {!eff.active ? ' (requiere 3/3)' : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noActiveHint}>
                  No tienes reliquias activas todavía. Toca un hueco de arriba o consigue reliquias por logros o en La Bodega.
                </Text>
              )}
            </View>
          </LinearGradient>

          {/* Filtros */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {filterTabs.map((tabItem) => {
              const active = filter === tabItem.key;
              return (
                <Pressable
                  key={tabItem.key}
                  onPress={() => setFilter(tabItem.key)}
                  style={[
                    styles.filterChip,
                    active && {
                      backgroundColor: theme.tintBg,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && { color: theme.bright, fontWeight: '800' },
                    ]}
                  >
                    {tabItem.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Lista de Forja de Reliquias */}
          {visibleRelics.length === 0 ? (
            <LinearGradient colors={GRADIENTS.card} style={[styles.emptyCard, SHADOWS.card]}>
              <Ionicons name="sparkles-outline" size={34} color={theme.bright} />
              <Text style={styles.emptyTitle}>Tu Tesorería está lista para abrir</Text>
              <Text style={styles.emptySub}>
                Aún no tienes reliquias desbloqueadas. Consíguelas completando logros o comprándolas en La Bodega y vuelve aquí para subirlas del Nivel 1 al 5.
              </Text>
              <View style={styles.emptyActionsRow}>
                <Pressable
                  onPress={() => setFilter('all')}
                  style={[styles.secondaryActionBtn, { borderColor: theme.border }]}
                >
                  <Text style={[styles.secondaryActionText, { color: theme.bright }]}>
                    Ver las 16 reliquias
                  </Text>
                </Pressable>
                <Pressable onPress={() => router.push('/(tabs)/shop')}>
                  <LinearGradient colors={theme.gradientBtn} style={styles.primarySmallBtn}>
                    <Text style={styles.primarySmallBtnText}>Ir a La Bodega</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </LinearGradient>
          ) : (
            <View style={styles.forgeList}>
              {visibleRelics.map((item) => {
                const power = item.relicPower;
                const currentLevel = power?.level ?? 1;
                const levelColor = RELIC_LEVEL_COLORS[currentLevel] || theme.bright;
                const equippedSlot = findEquippedSlot(item.id);
                const nextCost = power?.nextUpgradeCost ?? null;
                const canAffordUpgrade = nextCost !== null && balance >= nextCost;

                return (
                  <LinearGradient
                    key={item.id}
                    colors={
                      item.equipped
                        ? GRADIENTS.unlocked
                        : item.unlocked
                        ? GRADIENTS.card
                        : GRADIENTS.locked
                    }
                    style={[
                      styles.forgeCard,
                      SHADOWS.card,
                      !item.unlocked && styles.lockedForgeCard,
                      item.equipped && { borderColor: levelColor, borderWidth: 1.5 },
                    ]}
                  >
                    <View style={styles.forgeTopRow}>
                      <RelicIcon
                        previewKey={item.previewKey}
                        size={68}
                        pedestal
                        locked={!item.unlocked}
                        level={item.unlocked ? currentLevel : undefined}
                      />
                      <View style={styles.forgeHeadInfo}>
                        <View style={styles.badgeRow}>
                          {power ? (
                            <View style={styles.tierPill}>
                              <Text style={styles.tierPillText}>{power.tierLabel}</Text>
                            </View>
                          ) : null}
                          <View style={styles.sourcePill}>
                            <Text style={styles.sourcePillText}>
                              {item.source === 'shop' ? 'TIENDA' : 'LOGRO'}
                            </Text>
                          </View>
                          {equippedSlot ? (
                            <View
                              style={[
                                styles.activeSlotPill,
                                { backgroundColor: theme.tintBg, borderColor: theme.border },
                              ]}
                            >
                              <Text style={[styles.activeSlotPillText, { color: theme.bright }]}>
                                ACTIVA · HUECO {equippedSlot}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <Text
                          style={[
                            styles.forgeName,
                            !item.unlocked && { color: COLORS.lockedText },
                          ]}
                        >
                          {item.name}
                        </Text>

                        {/* 5 Estrellas de Nivel */}
                        <View style={styles.starsRow}>
                          {[1, 2, 3, 4, 5].map((starNum) => (
                            <Ionicons
                              key={starNum}
                              name={item.unlocked && starNum <= currentLevel ? 'star' : 'star-outline'}
                              size={15}
                              color={
                                !item.unlocked
                                  ? COLORS.lockedText
                                  : starNum <= currentLevel
                                  ? levelColor
                                  : COLORS.textMuted
                              }
                            />
                          ))}
                          <Text
                            style={[
                              styles.levelBadgeText,
                              { color: item.unlocked ? levelColor : COLORS.lockedText },
                            ]}
                          >
                            {item.unlocked ? `Nivel ${currentLevel} / 5` : 'Bloqueada (Nv. 1 base)'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Caja de Efecto actual y siguiente */}
                    {power ? (
                      <View style={styles.effectBox}>
                        <View style={styles.effectLineRow}>
                          <Text style={[styles.effectLabel, { color: levelColor }]}>
                            {item.unlocked ? `Nivel ${currentLevel}:` : 'Nivel 1:'}
                          </Text>
                          <Text style={styles.effectDesc}>{power.effectSummary}</Text>
                        </View>
                        {item.unlocked && power.nextLevelEffectSummary ? (
                          <View style={styles.nextEffectRow}>
                            <Text style={styles.nextEffectLabel}>
                              Siguiente (Nv. {currentLevel + 1}):
                            </Text>
                            <Text style={styles.nextEffectDesc}>
                              {power.nextLevelEffectSummary}
                            </Text>
                          </View>
                        ) : null}

                        {/* Escala visual Nv. 1 -> Nv. 5 */}
                        <View style={styles.ladderRow}>
                          {power.levels.map((lvlEntry) => {
                            const isCurrent = item.unlocked && lvlEntry.level === currentLevel;
                            const isReached = item.unlocked && lvlEntry.level <= currentLevel;
                            const stepColor =
                              RELIC_LEVEL_COLORS[lvlEntry.level] || theme.bright;
                            return (
                              <View
                                key={lvlEntry.level}
                                style={[
                                  styles.ladderStep,
                                  isCurrent && {
                                    borderColor: stepColor,
                                    backgroundColor: 'rgba(255, 208, 102, 0.12)',
                                  },
                                  !isReached && styles.ladderStepDim,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.ladderStepLv,
                                    isCurrent && { color: stepColor },
                                  ]}
                                >
                                  Nv.{lvlEntry.level}
                                </Text>
                                <Text style={styles.ladderStepTag} numberOfLines={1}>
                                  {lvlEntry.shortTag}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    ) : null}

                    {/* Botonera */}
                    {item.unlocked ? (
                      <View style={styles.forgeActionsRow}>
                        <Pressable
                          onPress={() => setRelicPickTarget(item)}
                          style={[
                            styles.equipBtn,
                            {
                              backgroundColor: theme.tintBg,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <Ionicons name="albums-outline" size={15} color={theme.bright} />
                          <Text style={[styles.equipBtnText, { color: theme.bright }]}>
                            {equippedSlot ? `Hueco ${equippedSlot}` : 'Equipar'}
                          </Text>
                        </Pressable>

                        {nextCost !== null ? (
                          <Pressable
                            onPress={() => handleOpenUpgrade(item)}
                            style={({ pressed }) => [
                              styles.upgradeBtnFlex,
                              pressed && { opacity: 0.88 },
                            ]}
                          >
                            <LinearGradient
                              colors={
                                canAffordUpgrade
                                  ? theme.gradientBtn
                                  : (['#2C2520', '#201B17'] as const)
                              }
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.upgradeBtn}
                            >
                              <Ionicons
                                name="arrow-up-circle"
                                size={16}
                                color={canAffordUpgrade ? COLORS.bg : COLORS.textSecondary}
                              />
                              <Text
                                style={[
                                  styles.upgradeBtnText,
                                  !canAffordUpgrade && { color: COLORS.textSecondary },
                                ]}
                                numberOfLines={1}
                              >
                                Nv. {currentLevel + 1} · {nextCost.toLocaleString('es-ES')} Chapas
                              </Text>
                            </LinearGradient>
                          </Pressable>
                        ) : (
                          <View style={[styles.maxBadge, { borderColor: levelColor }]}>
                            <Ionicons name="sparkles" size={14} color={levelColor} />
                            <Text style={[styles.maxBadgeText, { color: levelColor }]}>
                              MAESTRÍA MÁXIMA
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : item.source === 'shop' ? (
                      <Pressable
                        onPress={() => router.push('/(tabs)/shop')}
                        style={[styles.lockedActionBtn, { borderColor: theme.border }]}
                      >
                        <ChapaCoinIcon size={14} />
                        <Text style={[styles.lockedActionText, { color: theme.bright }]}>
                          Ver en La Bodega · {(item.priceChapas ?? 0).toLocaleString('es-ES')} Chapas
                        </Text>
                      </Pressable>
                    ) : (
                      <View style={styles.lockedAchBanner}>
                        <Ionicons name="lock-closed" size={14} color={COLORS.lockedText} />
                        <Text style={styles.lockedAchText}>
                          Se desbloquea al completar el logro: {item.unlockAchievementName || 'Especial'}
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal confirmar mejora de nivel */}
      <Modal
        visible={Boolean(upgradeTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!upgrading) setUpgradeTarget(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { borderColor: theme.border }, SHADOWS.card]}>
            {upgradeTarget && upgradeTarget.relicPower?.nextUpgradeCost ? (
              <>
                <Text style={styles.modalEyebrow}>FORJAR RELIQUIA</Text>
                <RelicIcon
                  previewKey={upgradeTarget.previewKey}
                  size={74}
                  pedestal
                  level={upgradeTarget.relicPower.level + 1}
                />
                <Text style={[styles.modalTitle, { color: theme.bright }]}>
                  {upgradeTarget.name}
                </Text>
                <Text style={styles.modalLevelTransition}>
                  Nivel {upgradeTarget.relicPower.level} ➔ Nivel{' '}
                  {upgradeTarget.relicPower.level + 1}
                </Text>

                <View style={styles.modalSummaryBox}>
                  <View style={styles.modalSummaryCol}>
                    <Text style={styles.modalSummaryLabel}>Efecto actual:</Text>
                    <Text style={styles.modalSummarySubVal}>
                      {upgradeTarget.relicPower.effectSummary}
                    </Text>
                  </View>
                  <View style={styles.modalSummaryDivider} />
                  <View style={styles.modalSummaryCol}>
                    <Text style={[styles.modalSummaryLabel, { color: theme.bright }]}>
                      Nuevo efecto (Nv. {upgradeTarget.relicPower.level + 1}):
                    </Text>
                    <Text style={styles.modalSummaryHighlight}>
                      {upgradeTarget.relicPower.nextLevelEffectSummary}
                    </Text>
                  </View>
                  <View style={styles.modalSummaryDivider} />
                  <View style={styles.modalSummaryRow}>
                    <Text style={styles.modalSummaryLabel}>Coste de mejora:</Text>
                    <View style={styles.modalCoinRow}>
                      <ChapaCoinIcon size={15} />
                      <Text style={[styles.modalSummaryVal, { color: theme.bright }]}>
                        {upgradeTarget.relicPower.nextUpgradeCost.toLocaleString('es-ES')} Chapas
                      </Text>
                    </View>
                  </View>
                  <View style={styles.modalSummaryRow}>
                    <Text style={styles.modalSummaryLabel}>Saldo restante:</Text>
                    <Text style={styles.modalSummaryAfter}>
                      {(balance - upgradeTarget.relicPower.nextUpgradeCost).toLocaleString('es-ES')}{' '}
                      Chapas
                    </Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => setUpgradeTarget(null)}
                    disabled={upgrading}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirmUpgrade}
                    disabled={upgrading}
                    style={styles.confirmBtnWrap}
                  >
                    <LinearGradient colors={theme.gradientBtn} style={styles.confirmBtn}>
                      {upgrading ? (
                        <ActivityIndicator size="small" color={COLORS.bg} />
                      ) : (
                        <Text style={styles.confirmBtnText}>Forjar mejora</Text>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Modal elegir reliquia para un hueco concreto */}
      <Modal
        visible={editingSlot !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingSlot(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { borderColor: theme.border }, SHADOWS.card]}>
            <Text style={[styles.modalTitle, { color: theme.bright }]}>
              Hueco {editingSlot} de la Vitrina
            </Text>
            {ownedRelics.length === 0 ? (
              <Text style={styles.modalBody}>
                Aún no tienes reliquias desbloqueadas. Consíguelas completando logros o comprándolas en La Bodega.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 280, width: '100%' }} contentContainerStyle={{ gap: 8 }}>
                {ownedRelics.map((relic) => (
                  <Pressable
                    key={relic.id}
                    onPress={() => editingSlot && assignRelicToSlot(editingSlot, relic.id)}
                    style={[styles.relicPickRow, { borderColor: COLORS.borderStrong }]}
                  >
                    <RelicIcon
                      previewKey={relic.previewKey}
                      size={40}
                      level={relic.relicPower?.level ?? 1}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.relicPickName}>
                        {relic.name} (Nv.{relic.relicPower?.level ?? 1})
                      </Text>
                      <Text style={styles.relicPickDesc} numberOfLines={1}>
                        {relic.relicPower?.shortTag || relic.description}
                      </Text>
                    </View>
                    <Ionicons name="checkmark-circle-outline" size={20} color={theme.bright} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <View style={styles.modalActions}>
              {editingSlot && showcaseSlots[editingSlot - 1] ? (
                <Pressable
                  onPress={() => assignRelicToSlot(editingSlot, null)}
                  style={styles.cancelBtn}
                >
                  <Text style={[styles.cancelBtnText, { color: COLORS.danger }]}>Vaciar hueco</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => setEditingSlot(null)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal elegir hueco para equipar una reliquia */}
      <Modal
        visible={Boolean(relicPickTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setRelicPickTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { borderColor: theme.border }, SHADOWS.card]}>
            <Text style={[styles.modalTitle, { color: theme.bright }]}>
              Colocar "{relicPickTarget?.name}"
            </Text>
            <View style={styles.slotsChoiceRow}>
              {([1, 2, 3] as const).map((slotNum) => {
                const current = showcaseSlots[slotNum - 1];
                return (
                  <Pressable
                    key={slotNum}
                    onPress={() =>
                      relicPickTarget && assignRelicToSlot(slotNum, relicPickTarget.id)
                    }
                    style={[
                      styles.slotChoiceBtn,
                      { borderColor: theme.border, backgroundColor: theme.tintBg },
                    ]}
                  >
                    <Text style={[styles.slotChoiceTitle, { color: theme.bright }]}>
                      Hueco {slotNum}
                    </Text>
                    <Text style={styles.slotChoiceSub} numberOfLines={1}>
                      {current ? current.name : 'Vacío'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setRelicPickTarget(null)}
              style={[styles.cancelBtn, { width: '100%', flex: undefined }]}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    minWidth: 74,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 19,
    fontWeight: '800',
  },
  headerChapasPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 74,
    justifyContent: 'center',
  },
  headerChapasText: {
    fontFamily: FONTS.display,
    fontSize: 12.5,
    fontWeight: '900',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: SPACING.lg,
    maxWidth: 740,
    width: '100%',
    alignSelf: 'center',
    gap: SPACING.lg,
    paddingBottom: SPACING.xxl + 16,
  },
  heroCard: {
    borderRadius: RADIUS.xl + 4,
    borderWidth: 1.5,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  heroEyebrow: {
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
    fontSize: 12,
    lineHeight: 17,
  },
  vitrinaRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  vitrinaSlot: {
    flex: 1,
    minHeight: 126,
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
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 7,
    gap: 4,
  },
  slotTopBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  slotLvPill: {
    backgroundColor: 'rgba(12, 9, 8, 0.85)',
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  slotLvText: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  vitrinaPlaque: {
    width: '100%',
    backgroundColor: 'rgba(18, 13, 9, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 102, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 3,
    gap: 1,
  },
  vitrinaSlotName: {
    color: COLORS.text,
    fontSize: 9.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  vitrinaSlotEffect: {
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
  activeSummaryBox: {
    backgroundColor: 'rgba(12, 9, 8, 0.56)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 8,
  },
  activeSummaryTitle: {
    color: COLORS.textSecondary,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  activeEffectsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  activeEffectChip: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  inactiveEffectChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: COLORS.lockedBorder,
  },
  activeEffectChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  noActiveHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  filterScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  emptyTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  emptyActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: 4,
  },
  secondaryActionBtn: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.elevated,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  primarySmallBtn: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  primarySmallBtnText: {
    color: COLORS.bg,
    fontFamily: FONTS.display,
    fontSize: 13,
    fontWeight: '900',
  },
  forgeList: {
    gap: SPACING.md,
  },
  forgeCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  lockedForgeCard: {
    borderColor: COLORS.lockedBorder,
    opacity: 0.85,
  },
  forgeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  forgeHeadInfo: {
    flex: 1,
    gap: 5,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tierPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tierPillText: {
    color: COLORS.textSecondary,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  sourcePill: {
    backgroundColor: 'rgba(12, 9, 8, 0.6)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sourcePillText: {
    color: COLORS.textMuted,
    fontSize: 9.5,
    fontWeight: '800',
  },
  activeSlotPill: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeSlotPillText: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  forgeName: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 17,
    fontWeight: '900',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },
  effectBox: {
    backgroundColor: 'rgba(12, 9, 8, 0.56)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 8,
  },
  effectLineRow: {
    gap: 2,
  },
  effectLabel: {
    fontSize: 11.5,
    fontWeight: '900',
  },
  effectDesc: {
    color: COLORS.text,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
  },
  nextEffectRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
    gap: 2,
  },
  nextEffectLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  nextEffectDesc: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
  },
  ladderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
  },
  ladderStep: {
    flexGrow: 1,
    minWidth: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: 'center',
    gap: 1,
  },
  ladderStepDim: {
    opacity: 0.58,
  },
  ladderStepLv: {
    color: COLORS.textSecondary,
    fontSize: 9.5,
    fontWeight: '900',
  },
  ladderStepTag: {
    color: COLORS.text,
    fontSize: 9.5,
    fontWeight: '700',
  },
  forgeActionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  equipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  equipBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  upgradeBtnFlex: {
    flex: 1,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: RADIUS.md,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  upgradeBtnText: {
    color: COLORS.bg,
    fontFamily: FONTS.display,
    fontSize: 13,
    fontWeight: '900',
  },
  maxBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    backgroundColor: 'rgba(232, 121, 249, 0.08)',
  },
  maxBadgeText: {
    fontFamily: FONTS.display,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  lockedActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  lockedActionText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  lockedAchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(12, 9, 8, 0.45)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  lockedAchText: {
    color: COLORS.lockedText,
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 6, 4, 0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    ...WEB_GLASS,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl + 2,
    borderWidth: 1.5,
    padding: SPACING.xl,
    gap: SPACING.md,
    alignItems: 'center',
  },
  modalEyebrow: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  modalTitle: {
    fontFamily: FONTS.display,
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalLevelTransition: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 14,
    fontWeight: '800',
  },
  modalBody: {
    color: COLORS.textSecondary,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalSummaryBox: {
    width: '100%',
    backgroundColor: 'rgba(12, 9, 8, 0.56)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: 8,
  },
  modalSummaryCol: {
    gap: 2,
  },
  modalSummaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  modalSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalSummaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  modalSummarySubVal: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  modalSummaryHighlight: {
    color: COLORS.text,
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 17,
  },
  modalCoinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  modalSummaryVal: {
    fontFamily: FONTS.display,
    fontSize: 14,
    fontWeight: '900',
  },
  modalSummaryAfter: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 13,
    fontWeight: '800',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 13.5,
  },
  confirmBtnWrap: {
    flex: 1,
  },
  confirmBtn: {
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: COLORS.bg,
    fontFamily: FONTS.display,
    fontWeight: '900',
    fontSize: 13.5,
  },
  relicPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    backgroundColor: 'rgba(12, 9, 8, 0.5)',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
  },
  relicPickName: {
    color: COLORS.text,
    fontSize: 13.5,
    fontWeight: '800',
  },
  relicPickDesc: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  slotsChoiceRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  slotChoiceBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    alignItems: 'center',
    gap: 4,
  },
  slotChoiceTitle: {
    fontFamily: FONTS.display,
    fontSize: 13.5,
    fontWeight: '900',
  },
  slotChoiceSub: {
    color: COLORS.textSecondary,
    fontSize: 10.5,
    textAlign: 'center',
  },
});
