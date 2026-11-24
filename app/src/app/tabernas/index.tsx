import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChapaCoinIcon } from '../../components/ChapaCoinIcon';
import { useAppAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useAchievementToast } from '../../context/ToastContext';
import { tabernasApi } from '../../services/api';
import {
  COLORS,
  FONTS,
  GRADIENTS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../theme/tokens';
import { TabernaExploreItem, TabernaSummary, TabernaVisibility } from '../../types/api';

type TabMode = 'mine' | 'explore';

export default function TabernasIndexScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { user, refreshMe } = useAuth();
  const { showAlert } = useAppAlert();
  const { showAchievements } = useAchievementToast();

  const [tab, setTab] = useState<TabMode>('mine');
  const [myTabernas, setMyTabernas] = useState<TabernaSummary[]>([]);
  const [exploreList, setExploreList] = useState<TabernaExploreItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [busyTabernaId, setBusyTabernaId] = useState<string | null>(null);

  // Modal crear Taberna
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [visibilityInput, setVisibilityInput] = useState<TabernaVisibility>('public');
  const [minBeersInput, setMinBeersInput] = useState('0');
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const [mineRes, expRes] = await Promise.all([
          tabernasApi.getMine(),
          tabernasApi.explore(searchQuery),
        ]);
        setMyTabernas(mineRes.tabernas);
        setExploreList(expRes.tabernas);
      } catch (err) {
        showAlert('Error', err instanceof Error ? err.message : 'No se pudieron cargar las Tabernas.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchQuery, showAlert]
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSearch = async () => {
    setSearching(true);
    try {
      const res = await tabernasApi.explore(searchQuery);
      setExploreList(res.tabernas);
    } catch (err) {
      showAlert('Error', err instanceof Error ? err.message : 'Error al buscar Tabernas.');
    } finally {
      setSearching(false);
    }
  };

  const handleCreate = async () => {
    const cleanName = nameInput.trim();
    if (cleanName.length < 3 || cleanName.length > 30) {
      showAlert('Nombre inválido', 'El nombre debe tener entre 3 y 30 caracteres.');
      return;
    }
    const minBeers = Math.max(0, parseInt(minBeersInput || '0', 10) || 0);
    setCreating(true);
    try {
      const res = await tabernasApi.create({
        name: cleanName,
        description: descInput.trim(),
        visibility: visibilityInput,
        minBeers,
      });
      setShowCreateModal(false);
      setNameInput('');
      setDescInput('');
      setVisibilityInput('public');
      setMinBeersInput('0');
      if (res.newlyUnlocked?.length) {
        showAchievements(res.newlyUnlocked);
      }
      await refreshMe();
      await loadData();
      router.push(`/tabernas/${res.taberna.id}`);
    } catch (err) {
      showAlert('No se pudo fundar', err instanceof Error ? err.message : 'Error al crear la Taberna.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (item: TabernaExploreItem) => {
    setBusyTabernaId(item.id);
    try {
      const res = await tabernasApi.join(item.id);
      if (res.newlyUnlocked?.length) {
        showAchievements(res.newlyUnlocked);
        await refreshMe();
      }
      if (res.joined) {
        await loadData();
        router.push(`/tabernas/${item.id}`);
      } else if (res.requested) {
        showAlert(
          'Solicitud enviada',
          `Has solicitado acceso a ${item.name}. El líder deberá aceptarla.`
        );
        await loadData();
      }
    } catch (err) {
      showAlert('No se pudo entrar', err instanceof Error ? err.message : 'Error al solicitar acceso.');
    } finally {
      setBusyTabernaId(null);
    }
  };

  const renderTabernaCard = (item: TabernaSummary, isExplore = false) => {
    const isMember = Boolean(item.myRole);
    const isFull = item.memberCount >= item.maxMembers;
    const hasCooldown = Boolean(item.cooldownUntil);
    const pct = item.currentMission?.completionPct ?? 0;

    return (
      <Pressable
        key={item.id}
        onPress={() => router.push(`/tabernas/${item.id}`)}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        <LinearGradient
          colors={isMember ? GRADIENTS.unlocked : GRADIENTS.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.tabernaCard,
            SHADOWS.card,
            isMember && { borderColor: theme.border, borderWidth: 1.5 },
          ]}
        >
          <View style={styles.cardTop}>
            <View style={[styles.levelBadge, { borderColor: theme.border, backgroundColor: theme.tintBg }]}>
              <Text style={[styles.levelText, { color: theme.bright }]}>Nv. {item.level}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.tabernaName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.visBadge}>
                  <Ionicons
                    name={item.visibility === 'public' ? 'globe-outline' : 'lock-closed-outline'}
                    size={12}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.visText}>
                    {item.visibility === 'public' ? 'Pública' : 'Privada'}
                  </Text>
                </View>
              </View>
              <Text style={styles.tabernaDesc} numberOfLines={2}>
                {item.description || 'Sin descripción de hermandad.'}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="people-outline" size={13} color={theme.bright} />
              <Text style={styles.metaText}>
                {item.memberCount}/{item.maxMembers}
              </Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="star-outline" size={13} color={theme.bright} />
              <Text style={styles.metaText}>{item.points.toLocaleString('es-ES')} pts</Text>
            </View>
            {item.minBeers > 0 ? (
              <View style={styles.metaPill}>
                <Ionicons name="beer-outline" size={13} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>Mín. {item.minBeers}</Text>
              </View>
            ) : null}
            {item.myRole === 'leader' ? (
              <View style={[styles.rolePill, { backgroundColor: theme.tintBg, borderColor: theme.border }]}>
                <Text style={[styles.roleText, { color: theme.bright }]}>Líder</Text>
              </View>
            ) : item.myRole === 'member' ? (
              <View style={styles.rolePill}>
                <Text style={styles.metaText}>Miembro</Text>
              </View>
            ) : null}
          </View>

          {item.currentMission ? (
            <View style={styles.missionMini}>
              <View style={styles.missionMiniHeader}>
                <Text style={styles.missionMiniLabel} numberOfLines={1}>
                  Misión del mes: {item.currentMission.title}
                </Text>
                <Text style={[styles.missionMiniPct, { color: theme.bright }]}>{pct}%</Text>
              </View>
              <View style={styles.miniTrack}>
                <LinearGradient
                  colors={theme.gradientBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.miniFill, { width: `${pct}%` }]}
                />
              </View>
            </View>
          ) : null}

          {isExplore && !isMember ? (
            <View style={styles.exploreActionRow}>
              {item.pendingRequestId ? (
                <View style={styles.statusChip}>
                  <Text style={styles.statusChipText}>Solicitud pendiente</Text>
                </View>
              ) : hasCooldown ? (
                <View style={styles.statusChip}>
                  <Text style={styles.statusChipText}>En espera (24h)</Text>
                </View>
              ) : isFull ? (
                <View style={styles.statusChip}>
                  <Text style={styles.statusChipText}>Aforo completo (10/10)</Text>
                </View>
              ) : (
                <Pressable
                  disabled={busyTabernaId === item.id}
                  onPress={() => void handleJoin(item)}
                >
                  <LinearGradient colors={theme.gradientBtn} style={styles.joinBtn}>
                    {busyTabernaId === item.id ? (
                      <ActivityIndicator size="small" color={COLORS.bg} />
                    ) : (
                      <Text style={styles.joinBtnText}>
                        {item.visibility === 'public' ? 'Unirse' : 'Solicitar entrada'}
                      </Text>
                    )}
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          ) : null}
        </LinearGradient>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={theme.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={GRADIENTS.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { borderColor: theme.border }, SHADOWS.card]}
        >
          <View style={styles.heroHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: theme.primary }]}>
                HERMANDADES MULTIJUGADOR
              </Text>
              <Text style={styles.heroTitle}>Tabernas</Text>
              <Text style={styles.heroSub}>
                Únete hasta a 5 Tabernas, completad el minijuego del mes y subid en el ranking.
              </Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            <Pressable
              onPress={() => setShowCreateModal(true)}
              style={{ flex: 1 }}
            >
              <LinearGradient colors={theme.gradientBtn} style={styles.primaryBtn}>
                <Ionicons name="add-circle-outline" size={18} color={COLORS.bg} />
                <Text style={styles.primaryBtnText}>Fundar Taberna (100 Ch.)</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              onPress={() => router.push('/tabernas/ranking')}
              style={[styles.rankingBtn, { borderColor: theme.border }]}
            >
              <Ionicons name="podium" size={18} color={theme.bright} />
              <Text style={[styles.rankingBtnText, { color: theme.bright }]}>Ranking</Text>
            </Pressable>
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabsTrack}>
          <Pressable
            onPress={() => setTab('mine')}
            style={[styles.tabBtn, tab === 'mine' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, tab === 'mine' && { color: theme.bright }]}>
              Mis Tabernas ({myTabernas.length}/5)
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('explore')}
            style={[styles.tabBtn, tab === 'explore' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, tab === 'explore' && { color: theme.bright }]}>
              Explorar
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : tab === 'mine' ? (
          myTabernas.length === 0 ? (
            <LinearGradient colors={GRADIENTS.card} style={[styles.emptyCard, SHADOWS.card]}>
              <Ionicons name="shield-half-outline" size={44} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Aún no perteneces a ninguna Taberna</Text>
              <Text style={styles.emptySub}>
                Funda tu propia Taberna por 100 Chapas o explora las hermandades abiertas para jugar el minijuego del mes.
              </Text>
              <Pressable onPress={() => setTab('explore')}>
                <LinearGradient colors={theme.gradientBtn} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Explorar Tabernas</Text>
                </LinearGradient>
              </Pressable>
            </LinearGradient>
          ) : (
            <View style={styles.list}>
              {myTabernas.map((t) => renderTabernaCard(t, false))}
            </View>
          )
        ) : (
          <View style={styles.list}>
            <View style={styles.searchRow}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar Taberna por nombre o descripción..."
                placeholderTextColor={COLORS.textMuted}
                onSubmitEditing={() => void handleSearch()}
                style={styles.searchInput}
              />
              <Pressable onPress={() => void handleSearch()}>
                <LinearGradient colors={theme.gradientBtn} style={styles.searchBtn}>
                  {searching ? (
                    <ActivityIndicator size="small" color={COLORS.bg} />
                  ) : (
                    <Ionicons name="search" size={19} color={COLORS.bg} />
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            {exploreList.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No se encontraron Tabernas</Text>
                <Text style={styles.emptySub}>Prueba con otro término o funda la primera.</Text>
              </View>
            ) : (
              exploreList.map((t) => renderTabernaCard(t, true))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal Fundar Taberna */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fundar Nueva Taberna</Text>
              <Pressable onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.costBanner}>
              <ChapaCoinIcon size={16} />
              <Text style={styles.costText}>
                Coste: 100 Chapas · Tu saldo: {(user?.chapas ?? 0).toLocaleString('es-ES')} Ch.
              </Text>
            </View>

            <Text style={styles.fieldLabel}>Nombre (3-30 caracteres, único)</Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              maxLength={30}
              placeholder="Ej: Los Caballeros del Lúpulo"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Descripción (máx. 200 caracteres)</Text>
            <TextInput
              value={descInput}
              onChangeText={setDescInput}
              maxLength={200}
              multiline
              placeholder="Cuenta qué cervezas buscáis..."
              placeholderTextColor={COLORS.textMuted}
              style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
            />

            <Text style={styles.fieldLabel}>Visibilidad</Text>
            <View style={styles.visRow}>
              {(['public', 'private'] as const).map((v) => {
                const active = visibilityInput === v;
                return (
                  <Pressable
                    key={v}
                    onPress={() => setVisibilityInput(v)}
                    style={[
                      styles.visOption,
                      active && { backgroundColor: theme.tintBg, borderColor: theme.border },
                    ]}
                  >
                    <Ionicons
                      name={v === 'public' ? 'globe-outline' : 'lock-closed-outline'}
                      size={16}
                      color={active ? theme.bright : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.visOptionText,
                        active && { color: theme.bright },
                      ]}
                    >
                      {v === 'public' ? 'Pública (directa)' : 'Privada (solicitud)'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Requisito mínimo de cervezas (≥0)</Text>
            <TextInput
              value={minBeersInput}
              onChangeText={setMinBeersInput}
              keyboardType="number-pad"
              maxLength={4}
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowCreateModal(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                disabled={creating}
                onPress={() => void handleCreate()}
                style={{ flex: 1 }}
              >
                <LinearGradient colors={theme.gradientBtn} style={styles.primaryBtn}>
                  {creating ? (
                    <ActivityIndicator size="small" color={COLORS.bg} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Fundar (100 Ch.)</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
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
  content: {
    padding: SPACING.lg,
    maxWidth: 740,
    width: '100%',
    alignSelf: 'center',
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  heroCard: {
    borderRadius: RADIUS.xl + 2,
    borderWidth: 1.5,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  heroTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 26,
    fontWeight: '900',
  },
  heroSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  heroActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  primaryBtn: {
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  primaryBtnText: {
    color: COLORS.bg,
    fontFamily: FONTS.display,
    fontSize: 14,
    fontWeight: '900',
  },
  rankingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    backgroundColor: COLORS.elevated,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
  },
  rankingBtnText: {
    fontFamily: FONTS.display,
    fontSize: 14,
    fontWeight: '800',
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
  list: {
    gap: SPACING.md,
  },
  tabernaCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  pressed: {
    opacity: 0.9,
  },
  cardTop: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'flex-start',
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    fontFamily: FONTS.display,
    fontSize: 13.5,
    fontWeight: '900',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  tabernaName: {
    flex: 1,
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 17.5,
    fontWeight: '900',
  },
  visBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.elevated,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  visText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  tabernaDesc: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(12, 9, 8, 0.5)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  metaText: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '700',
  },
  rolePill: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  missionMini: {
    gap: 5,
    backgroundColor: 'rgba(12, 9, 8, 0.45)',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  missionMiniHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  missionMiniLabel: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '700',
  },
  missionMiniPct: {
    fontFamily: FONTS.display,
    fontSize: 12,
    fontWeight: '900',
  },
  miniTrack: {
    height: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 224, 180, 0.08)',
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },
  exploreActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  joinBtn: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
  },
  joinBtnText: {
    color: COLORS.bg,
    fontFamily: FONTS.display,
    fontWeight: '900',
    fontSize: 13,
  },
  statusChip: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  searchBtn: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  emptyTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    padding: SPACING.xl,
    gap: SPACING.sm,
    ...SHADOWS.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 19,
    fontWeight: '900',
  },
  costBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  costText: {
    color: COLORS.amberBright,
    fontSize: 12.5,
    fontWeight: '800',
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  input: {
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    color: COLORS.text,
    fontSize: 14,
  },
  visRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  visOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.elevated,
  },
  visOptionText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '800',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  cancelBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '800',
  },
});
