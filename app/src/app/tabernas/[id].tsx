import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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
import { ProfileIcon } from '../../components/ProfileIcon';
import { TabernaMissionBoard } from '../../components/TabernaMissionBoard';
import { TabernaQuickScannerModal } from '../../components/TabernaQuickScannerModal';
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
import {
  TabernaDetailResponse,
  TabernaMissionDto,
  TabernaRequestItem,
  TabernaVisibility,
} from '../../types/api';

export default function TabernaDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const tabernaId = String(params.id || '');
  const theme = useAppTheme();
  const { user, refreshMe } = useAuth();
  const { showAlert, showConfirm } = useAppAlert();
  const { showAchievements } = useAchievementToast();

  const [detail, setDetail] = useState<TabernaDetailResponse | null>(null);
  const [requests, setRequests] = useState<TabernaRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  // Modal editar Taberna (solo líder)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [editVis, setEditVis] = useState<TabernaVisibility>('public');
  const [editMinBeers, setEditMinBeers] = useState('0');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadDetail = useCallback(
    async (isRefresh = false) => {
      if (!tabernaId) return;
      if (isRefresh) setRefreshing(true);
      try {
        const res = await tabernasApi.getDetail(tabernaId);
        setDetail(res);
        setEditDesc(res.taberna.description);
        setEditVis(res.taberna.visibility);
        setEditMinBeers(String(res.taberna.minBeers));
        if (res.myRole === 'leader') {
          const reqRes = await tabernasApi.getRequests(tabernaId);
          setRequests(reqRes.requests);
        } else {
          setRequests([]);
        }
      } catch (err) {
        showAlert('Error', err instanceof Error ? err.message : 'No se pudo cargar la Taberna.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showAlert, tabernaId]
  );

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail])
  );

  const handleCloseScanner = useCallback(() => {
    setScannerOpen(false);
    void loadDetail();
  }, [loadDetail]);

  const handleMissionUpdated = useCallback(
    (mission: TabernaMissionDto, tabernaStats?: { level: number; points: number }) => {
      setDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          mission,
          taberna: tabernaStats
            ? {
                ...prev.taberna,
                level: tabernaStats.level,
                points: tabernaStats.points,
              }
            : prev.taberna,
        };
      });
    },
    []
  );

  const handleJoin = async () => {
    setActionBusy(true);
    try {
      const res = await tabernasApi.join(tabernaId);
      if (res.newlyUnlocked?.length) {
        showAchievements(res.newlyUnlocked);
        await refreshMe();
      }
      if (res.requested) {
        showAlert('Solicitud enviada', 'El líder de la Taberna revisará tu solicitud.');
      }
      await loadDetail();
    } catch (err) {
      showAlert('Aviso', err instanceof Error ? err.message : 'No se pudo unir.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleLeave = () => {
    const isLeader = detail?.myRole === 'leader';
    showConfirm(
      'Abandonar Taberna',
      isLeader
        ? 'Si abandonas siendo líder, el miembro más antiguo heredará el liderazgo (o la Taberna se eliminará si no queda nadie). Además no podrás volver a entrar en 24 horas.'
        : '¿Seguro que quieres abandonar esta Taberna? No podrás volver a solicitar acceso durante 24 horas.',
      async () => {
        try {
          await tabernasApi.leave(tabernaId);
          router.replace('/tabernas');
        } catch (err) {
          showAlert('Error', err instanceof Error ? err.message : 'No se pudo abandonar.');
        }
      },
      { confirmText: 'Abandonar', destructive: true }
    );
  };

  const handleDeleteTaberna = () => {
    showConfirm(
      'Eliminar Taberna',
      'Esta acción eliminará la Taberna, sus miembros y el progreso de la misión del mes (sin reembolso de Chapas). ¿Continuar?',
      async () => {
        try {
          await tabernasApi.remove(tabernaId);
          router.replace('/tabernas');
        } catch (err) {
          showAlert('Error', err instanceof Error ? err.message : 'No se pudo eliminar.');
        }
      },
      { confirmText: 'Eliminar', destructive: true }
    );
  };

  const handleRespondRequest = async (reqId: string, action: 'accept' | 'reject') => {
    try {
      if (action === 'accept') {
        await tabernasApi.acceptRequest(tabernaId, reqId);
      } else {
        await tabernasApi.rejectRequest(tabernaId, reqId);
      }
      await loadDetail();
    } catch (err) {
      showAlert('Error', err instanceof Error ? err.message : 'No se pudo procesar la solicitud.');
    }
  };

  const handleKickMember = (memberId: string, username: string) => {
    showConfirm(
      'Expulsar miembro',
      `¿Expulsar a ${username} de la Taberna? No podrá volver a solicitar acceso en 24 horas.`,
      async () => {
        try {
          await tabernasApi.kickMember(tabernaId, memberId);
          await loadDetail();
        } catch (err) {
          showAlert('Error', err instanceof Error ? err.message : 'No se pudo expulsar.');
        }
      },
      { confirmText: 'Expulsar', destructive: true }
    );
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      await tabernasApi.update(tabernaId, {
        description: editDesc.trim(),
        visibility: editVis,
        minBeers: Math.max(0, parseInt(editMinBeers || '0', 10) || 0),
      });
      setShowEditModal(false);
      await loadDetail();
    } catch (err) {
      showAlert('Error', err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading && !detail) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Taberna no encontrada.</Text>
        <Pressable onPress={() => router.replace('/tabernas')} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Volver a Tabernas</Text>
        </Pressable>
      </View>
    );
  }

  const { taberna, members, mission, myRole } = detail;
  const isMember = Boolean(myRole);
  const isLeader = myRole === 'leader';

  const prevLevelPts = (taberna.level - 1) * 500;
  const nextLevelPts = taberna.nextLevelPoints;
  const levelPct = nextLevelPts
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(((taberna.points - prevLevelPts) / (nextLevelPts - prevLevelPts)) * 100)
        )
      )
    : 100;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDetail(true)}
            tintColor={theme.primary}
          />
        }
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/tabernas'))}
          style={styles.backLink}
        >
          <Ionicons name="arrow-back" size={17} color={theme.bright} />
          <Text style={[styles.backLinkText, { color: theme.bright }]}>Mis Tabernas</Text>
        </Pressable>

        {/* BOTÓN PRIORITARIO ARRIBA DEL TODO: Escanear para la Taberna */}
        {isMember ? (
          <Pressable
            onPress={() => setScannerOpen(true)}
            style={({ pressed }) => [pressed && { opacity: 0.9 }]}
          >
            <LinearGradient
              colors={theme.gradientBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.scanHeroBtn, SHADOWS.amberGlow]}
            >
              <Ionicons name="camera" size={24} color={COLORS.bg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.scanHeroTitle}>Escanear para la Taberna</Text>
                <Text style={styles.scanHeroSub}>
                  Escaneo directo al minijuego del mes · Sin foto ni valoración
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={COLORS.bg} />
            </LinearGradient>
          </Pressable>
        ) : null}

        {/* Cabecera de la Taberna */}
        <LinearGradient
          colors={GRADIENTS.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { borderColor: theme.border }, SHADOWS.card]}
        >
          <View style={styles.heroTopRow}>
            <View style={[styles.levelBox, { borderColor: theme.border, backgroundColor: theme.tintBg }]}>
              <Text style={[styles.levelLabel, { color: theme.primary }]}>NIVEL</Text>
              <Text style={[styles.levelValue, { color: theme.bright }]}>{taberna.level}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tabernaTitle}>{taberna.name}</Text>
              <Text style={styles.tabernaDesc}>
                {taberna.description || 'Sin descripción.'}
              </Text>
            </View>
          </View>

          <View style={styles.metaPills}>
            <View style={styles.metaPill}>
              <Ionicons
                name={taberna.visibility === 'public' ? 'globe-outline' : 'lock-closed-outline'}
                size={13}
                color={theme.bright}
              />
              <Text style={styles.metaPillText}>
                {taberna.visibility === 'public' ? 'Pública' : 'Privada'}
              </Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="people-outline" size={13} color={theme.bright} />
              <Text style={styles.metaPillText}>
                {taberna.memberCount}/{taberna.maxMembers} miembros
              </Text>
            </View>
            {taberna.minBeers > 0 ? (
              <View style={styles.metaPill}>
                <Ionicons name="beer-outline" size={13} color={theme.bright} />
                <Text style={styles.metaPillText}>Mín. {taberna.minBeers} cervezas</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.xpBox}>
            <View style={styles.xpRow}>
              <Text style={styles.xpLabel}>PUNTOS DE TABERNA</Text>
              <Text style={[styles.xpVal, { color: theme.bright }]}>
                {taberna.points.toLocaleString('es-ES')}
                {nextLevelPts ? ` / ${nextLevelPts.toLocaleString('es-ES')} pts` : ' pts (Niv. Máx)'}
              </Text>
            </View>
            <View style={styles.track}>
              <LinearGradient
                colors={theme.gradientBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.fill, { width: `${levelPct}%` }]}
              />
            </View>
          </View>

          {!isMember ? (
            taberna.pendingRequestId ? (
              <View style={styles.pendingBanner}>
                <Ionicons name="time-outline" size={16} color={COLORS.amberBright} />
                <Text style={styles.pendingText}>Solicitud pendiente de aprobación</Text>
              </View>
            ) : taberna.cooldownUntil ? (
              <View style={styles.pendingBanner}>
                <Ionicons name="hourglass-outline" size={16} color={COLORS.danger} />
                <Text style={styles.pendingText}>Debes esperar 24h para volver a solicitar</Text>
              </View>
            ) : (
              <Pressable disabled={actionBusy} onPress={() => void handleJoin()}>
                <LinearGradient colors={theme.gradientBtn} style={styles.primaryBtn}>
                  {actionBusy ? (
                    <ActivityIndicator size="small" color={COLORS.bg} />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {taberna.visibility === 'public' ? 'Unirse a la Taberna' : 'Solicitar entrada'}
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            )
          ) : null}
        </LinearGradient>

        {/* Minijuego del Mes */}
        <LinearGradient colors={GRADIENTS.card} style={[styles.sectionCard, SHADOWS.card]}>
          <View style={styles.missionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: theme.primary }]}>
                MINIJUEGO · {mission.month}
              </Text>
              <Text style={styles.sectionTitle}>{mission.title}</Text>
              <Text style={styles.missionSub}>{mission.subtitle}</Text>
            </View>
            <View
              style={[
                styles.missionStatusBadge,
                mission.status === 'completed' && {
                  backgroundColor: COLORS.successBg,
                  borderColor: COLORS.successBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.missionStatusText,
                  mission.status === 'completed' && { color: COLORS.success },
                ]}
              >
                {mission.status === 'completed'
                  ? 'COMPLETADO'
                  : `${mission.completedCount}/${mission.totalTarget}`}
              </Text>
            </View>
          </View>

          <View style={styles.track}>
            <LinearGradient
              colors={theme.gradientBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fill, { width: `${mission.completionPct}%` }]}
            />
          </View>

          <TabernaMissionBoard
            mission={mission}
            isMember={isMember}
            currentUserId={user?.id}
            theme={theme}
          />
        </LinearGradient>

        {/* Crónica de contribuciones */}
        {mission.recentContributions.length > 0 ? (
          <LinearGradient colors={GRADIENTS.card} style={[styles.sectionCard, SHADOWS.card]}>
            <Text style={styles.sectionTitle}>Crónica de la Taberna</Text>
            {mission.recentContributions.slice(0, 6).map((c) => (
              <View key={c.id} style={styles.contribRow}>
                <Ionicons name="beer-outline" size={16} color={theme.bright} />
                <Text style={styles.contribText}>
                  <Text style={styles.contribUser}>@{c.username}</Text> aportó{' '}
                  <Text style={{ fontWeight: '800', color: COLORS.text }}>{c.beerName}</Text>
                </Text>
              </View>
            ))}
          </LinearGradient>
        ) : null}

        {/* Solicitudes pendientes (solo líder) */}
        {isLeader && requests.length > 0 ? (
          <LinearGradient
            colors={GRADIENTS.card}
            style={[styles.sectionCard, { borderColor: theme.border }, SHADOWS.card]}
          >
            <Text style={styles.sectionTitle}>
              Solicitudes pendientes ({requests.length})
            </Text>
            {requests.map((r) => (
              <View key={r.id} style={styles.memberRow}>
                <ProfileIcon
                  imageUrl={r.user.equippedIcon.imageUrl}
                  size={40}
                  frameCode={r.user.equippedFrame?.code}
                  frameMetadata={r.user.equippedFrame?.metadata}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{r.user.username}</Text>
                  <Text style={styles.memberMeta}>
                    {r.user.equippedTitle.name} · {r.user.beersCount} cervezas
                  </Text>
                </View>
                <Pressable
                  onPress={() => void handleRespondRequest(r.id, 'accept')}
                  style={styles.acceptBtn}
                >
                  <Text style={styles.acceptText}>Aceptar</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleRespondRequest(r.id, 'reject')}
                  style={styles.rejectBtn}
                >
                  <Text style={styles.rejectText}>Rechazar</Text>
                </Pressable>
              </View>
            ))}
          </LinearGradient>
        ) : null}

        {/* Miembros */}
        <LinearGradient colors={GRADIENTS.card} style={[styles.sectionCard, SHADOWS.card]}>
          <Text style={styles.sectionTitle}>
            Miembros ({members.length}/{taberna.maxMembers})
          </Text>
          {members.map((m) => (
            <View key={m.userId} style={styles.memberRow}>
              <ProfileIcon
                imageUrl={m.equippedIcon.imageUrl}
                size={42}
                frameCode={m.equippedFrame?.code}
                frameMetadata={m.equippedFrame?.metadata}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.memberName}>{m.username}</Text>
                  {m.role === 'leader' ? (
                    <View
                      style={[
                        styles.leaderTag,
                        { backgroundColor: theme.tintBg, borderColor: theme.border },
                      ]}
                    >
                      <Text style={[styles.leaderTagText, { color: theme.bright }]}>Líder</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.memberMeta}>
                  {m.equippedTitle.name} · {m.beersCount} cervezas
                </Text>
              </View>
              {isLeader && m.userId !== user?.id ? (
                <Pressable
                  onPress={() => handleKickMember(m.userId, m.username)}
                  style={styles.kickBtn}
                >
                  <Ionicons name="person-remove-outline" size={17} color={COLORS.danger} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </LinearGradient>

        {/* Acciones de Líder / Miembro */}
        {isMember ? (
          <View style={styles.footerActions}>
            {isLeader ? (
              <View style={styles.leaderActionsRow}>
                <Pressable
                  onPress={() => setShowEditModal(true)}
                  style={[styles.secondaryBtn, { flex: 1 }]}
                >
                  <Ionicons name="settings-outline" size={16} color={COLORS.text} />
                  <Text style={styles.secondaryBtnText}>Ajustes de Taberna</Text>
                </Pressable>
                <Pressable onPress={handleDeleteTaberna} style={styles.dangerBtn}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  <Text style={styles.dangerBtnText}>Eliminar</Text>
                </Pressable>
              </View>
            ) : null}
            <Pressable onPress={handleLeave} style={styles.dangerBtn}>
              <Ionicons name="exit-outline" size={16} color={COLORS.danger} />
              <Text style={styles.dangerBtnText}>Abandonar Taberna</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {/* Modal Escáner Rápido */}
      {scannerOpen ? (
        <TabernaQuickScannerModal
          visible={scannerOpen}
          tabernaId={tabernaId}
          tabernaName={taberna.name}
          mission={mission}
          onClose={handleCloseScanner}
          onMissionUpdated={handleMissionUpdated}
        />
      ) : null}

      {/* Modal Editar Taberna (Líder) */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { borderColor: theme.border }]}>
            <Text style={styles.modalTitle}>Ajustes de {taberna.name}</Text>

            <Text style={styles.fieldLabel}>Descripción (≤200 car.)</Text>
            <TextInput
              value={editDesc}
              onChangeText={setEditDesc}
              maxLength={200}
              multiline
              style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
            />

            <Text style={styles.fieldLabel}>Visibilidad</Text>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              {(['public', 'private'] as const).map((v) => {
                const active = editVis === v;
                return (
                  <Pressable
                    key={v}
                    onPress={() => setEditVis(v)}
                    style={[
                      styles.visOption,
                      active && { backgroundColor: theme.tintBg, borderColor: theme.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.visOptionText,
                        active && { color: theme.bright },
                      ]}
                    >
                      {v === 'public' ? 'Pública' : 'Privada'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Cervezas mínimas requeridas</Text>
            <TextInput
              value={editMinBeers}
              onChangeText={setEditMinBeers}
              keyboardType="number-pad"
              maxLength={4}
              style={styles.input}
            />

            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md }}>
              <Pressable
                onPress={() => setShowEditModal(false)}
                style={[styles.secondaryBtn, { flex: 1 }]}
              >
                <Text style={styles.secondaryBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                disabled={savingEdit}
                onPress={() => void handleSaveEdit()}
                style={{ flex: 1 }}
              >
                <LinearGradient colors={theme.gradientBtn} style={styles.primaryBtn}>
                  {savingEdit ? (
                    <ActivityIndicator size="small" color={COLORS.bg} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Guardar</Text>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    padding: SPACING.xl,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 15,
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
  scanHeroBtn: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  scanHeroTitle: {
    color: COLORS.bg,
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: '900',
  },
  scanHeroSub: {
    color: 'rgba(12, 9, 8, 0.78)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  heroCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
  },
  levelBox: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  levelValue: {
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: '900',
  },
  tabernaTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: '900',
  },
  tabernaDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  metaPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(12, 9, 8, 0.55)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaPillText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  xpBox: {
    gap: 6,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpLabel: {
    color: COLORS.textSecondary,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  xpVal: {
    fontFamily: FONTS.display,
    fontSize: 12.5,
    fontWeight: '900',
  },
  track: {
    height: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 224, 180, 0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.elevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pendingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  sectionTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: '900',
  },
  missionSub: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    marginTop: 2,
  },
  missionStatusBadge: {
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  missionStatusText: {
    color: COLORS.amberBright,
    fontFamily: FONTS.display,
    fontSize: 12,
    fontWeight: '900',
  },
  contribRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contribText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 12.5,
  },
  contribUser: {
    color: COLORS.amberBright,
    fontWeight: '800',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: 4,
  },
  memberName: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 14.5,
  },
  memberMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  leaderTag: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  leaderTagText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  kickBtn: {
    padding: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  acceptBtn: {
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  acceptText: {
    color: COLORS.success,
    fontWeight: '800',
    fontSize: 12,
  },
  rejectBtn: {
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rejectText: {
    color: COLORS.danger,
    fontWeight: '800',
    fontSize: 12,
  },
  footerActions: {
    gap: SPACING.sm,
  },
  leaderActionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  primaryBtn: {
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: COLORS.bg,
    fontFamily: FONTS.display,
    fontWeight: '900',
    fontSize: 14,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.elevated,
    paddingVertical: 11,
    paddingHorizontal: SPACING.md,
  },
  secondaryBtnText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 13.5,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    backgroundColor: COLORS.dangerBg,
    paddingVertical: 11,
    paddingHorizontal: SPACING.md,
  },
  dangerBtnText: {
    color: COLORS.danger,
    fontWeight: '800',
    fontSize: 13.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  modalTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 19,
    fontWeight: '900',
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
  visOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.elevated,
  },
  visOptionText: {
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 13,
  },
});
