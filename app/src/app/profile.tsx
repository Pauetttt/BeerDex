import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChapaCoinIcon } from '../components/ChapaCoinIcon';
import { MedievalCardOrnament } from '../components/MedievalCardOrnament';
import { ProfileIcon } from '../components/ProfileIcon';
import { RelicIcon } from '../components/RelicIcon';
import { useAppAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { useAchievementToast } from '../context/ToastContext';
import { meApi } from '../services/api';
import {
  COLORS,
  FONTS,
  GRADIENTS,
  RADIUS,
  SHADOWS,
  SPACING,
  WEB_GLASS,
} from '../theme/tokens';
import { CosmeticItem, IconItem, TitleItem } from '../types/api';
import { formatDateDDMMYYYY } from '../utils/dateFormat';

type ProfileTab =
  | 'perfil'
  | 'iconos'
  | 'titulos'
  | 'marcos'
  | 'cartas'
  | 'vitrina'
  | 'colores';

const PROFILE_TABS: Array<{ key: ProfileTab; label: string }> = [
  { key: 'perfil', label: 'Perfil' },
  { key: 'iconos', label: 'Iconos' },
  { key: 'titulos', label: 'Títulos' },
  { key: 'marcos', label: 'Marcos' },
  { key: 'cartas', label: 'Cartas 3D' },
  { key: 'vitrina', label: 'Vitrina' },
  { key: 'colores', label: 'Colores' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, meProfile, loading, refreshMe, applyMeProfile, logout } = useAuth();
  const { showAlert, showConfirm } = useAppAlert();
  const { showAchievements } = useAchievementToast();
  const theme = useAppTheme();

  const [tab, setTab] = useState<ProfileTab>('perfil');
  const [saving, setSaving] = useState(false);

  // Vitrina slot modal
  const [editingSlot, setEditingSlot] = useState<1 | 2 | 3 | null>(null);
  const [relicPickTarget, setRelicPickTarget] = useState<CosmeticItem | null>(null);

  // Cambio de contraseña
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  // Borrado de cuenta
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        refreshMe();
      }
    }, [user, refreshMe])
  );

  if (!loading && !user) {
    return <Redirect href="/auth/login" />;
  }

  const promptLockedOrigin = (
    name: string,
    unlockAchName: string | null,
    source?: string,
    priceChapas?: number | null
  ) => {
    if (source === 'shop') {
      showConfirm(
        `${name} · La Bodega`,
        `Este artículo se compra en La Bodega por ${(priceChapas ?? 0).toLocaleString('es-ES')} Chapas. ¿Quieres ir a La Bodega?`,
        () => router.push('/(tabs)/shop'),
        { confirmText: 'Ir a La Bodega' }
      );
      return;
    }
    showAlert(
      'Artículo bloqueado',
      `Se desbloquea al completar el logro: ${unlockAchName || 'un logro especial'}`
    );
  };

  const runEquip = async (payload: Parameters<typeof meApi.equip>[0]) => {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await meApi.equip(payload);
      applyMeProfile(updated);
      if (updated.newlyUnlocked?.length) {
        showAchievements(updated.newlyUnlocked);
      }
      setEditingSlot(null);
      setRelicPickTarget(null);
    } catch (err) {
      showAlert('Error', err instanceof Error ? err.message : 'No se pudo equipar.');
    } finally {
      setSaving(false);
    }
  };

  const handleTitlePress = (item: TitleItem) => {
    if (!item.unlocked) {
      promptLockedOrigin(
        item.name,
        item.unlockAchievementName,
        item.source,
        item.priceChapas
      );
      return;
    }
    if (item.equipped) return;
    runEquip({ equippedTitleId: item.id });
  };

  const handleIconPress = (item: IconItem) => {
    if (!item.unlocked) {
      promptLockedOrigin(
        item.name,
        item.unlockAchievementName,
        item.source,
        item.priceChapas
      );
      return;
    }
    if (item.equipped) return;
    runEquip({ equippedIconId: item.id });
  };

  const handleCosmeticPress = (item: CosmeticItem) => {
    if (!item.unlocked) {
      promptLockedOrigin(
        item.name,
        item.unlockAchievementName,
        item.source,
        item.priceChapas
      );
      return;
    }
    if (item.type === 'relic') {
      setRelicPickTarget(item);
      return;
    }
    if (item.equipped) return;
    if (item.type === 'frame') runEquip({ equippedFrameId: item.id });
    else if (item.type === 'card_style') runEquip({ equippedCardStyleId: item.id });
    else if (item.type === 'color_theme') runEquip({ equippedColorThemeId: item.id });
  };

  const assignRelicToSlot = (slot: 1 | 2 | 3, relicId: number | null) => {
    if (slot === 1) runEquip({ showcaseSlot1Id: relicId });
    else if (slot === 2) runEquip({ showcaseSlot2Id: relicId });
    else runEquip({ showcaseSlot3Id: relicId });
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      showAlert('Campos incompletos', 'Introduce tu contraseña actual y la nueva.');
      return;
    }
    setPwSaving(true);
    try {
      const res = await meApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setShowPwForm(false);
      showAlert('Contraseña actualizada', res.message);
    } catch (err) {
      showAlert(
        'No se pudo cambiar',
        err instanceof Error ? err.message : 'Error al cambiar la contraseña.'
      );
    } finally {
      setPwSaving(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!deletePassword) {
      showAlert('Contraseña requerida', 'Introduce tu contraseña para confirmar.');
      return;
    }
    setDeletingAccount(true);
    try {
      await meApi.deleteAccount(deletePassword);
      setDeleteModalVisible(false);
      await logout();
      router.replace('/auth/login');
    } catch (err) {
      showAlert(
        'Error al eliminar cuenta',
        err instanceof Error ? err.message : 'No se pudo eliminar la cuenta.'
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleLogout = () => {
    showConfirm(
      'Cerrar sesión',
      '¿Seguro que quieres salir de tu cuenta en BeerDex?',
      async () => {
        await logout();
        router.replace('/auth/login');
      },
      { confirmText: 'Cerrar sesión', destructive: true }
    );
  };

  const profile = meProfile;
  const showcaseSlots = profile?.user.showcaseRelics ?? [null, null, null];
  const unlockedRelics = (profile?.cosmetics.relics ?? []).filter((r) => r.unlocked);

  const renderUnlockBadge = (
    item: { unlocked: boolean; equipped: boolean; source?: string; priceChapas?: number | null }
  ) => {
    if (item.equipped) {
      return (
        <View
          style={[
            styles.equippedPill,
            { backgroundColor: theme.tintBg, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.equippedTag, { color: theme.bright }]}>EQUIPADO</Text>
        </View>
      );
    }
    if (!item.unlocked) {
      return (
        <Text style={styles.lockedTag}>
          {item.source === 'shop' ? `${item.priceChapas ?? 0} CHAPAS` : 'LOGRO'}
        </Text>
      );
    }
    return (
      <View style={styles.equipPill}>
        <Text style={styles.equipActionTag}>Equipar</Text>
      </View>
    );
  };

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
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          <View
            style={[
              styles.headerChapasPill,
              { backgroundColor: theme.tintBg, borderColor: theme.border },
            ]}
          >
            <ChapaCoinIcon size={14} />
            <Text style={[styles.headerChapasText, { color: theme.bright }]}>
              {(profile?.user.chapas ?? user?.chapas ?? 0).toLocaleString('es-ES')}
            </Text>
          </View>
        </View>
      </View>

      {/* Selector horizontal de pestañas */}
      <View style={styles.navbarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.navbarScroll}
        >
          {PROFILE_TABS.map((item) => {
            const active = tab === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setTab(item.key)}
                style={[
                  styles.navTab,
                  active && {
                    backgroundColor: COLORS.elevated,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.navText,
                    active && { color: theme.bright, fontWeight: '800' },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {!profile ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {tab === 'perfil' ? (
            <View style={styles.profileWrap}>
              <LinearGradient
                colors={GRADIENTS.hero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.identityCard, { borderColor: theme.border }, SHADOWS.card]}
              >
                <ProfileIcon
                  imageUrl={profile.user.equippedIcon.imageUrl}
                  size={82}
                  highlight
                  frameCode={profile.user.equippedFrame?.code}
                  frameMetadata={profile.user.equippedFrame?.metadata}
                />
                <Text style={styles.username}>{profile.user.username}</Text>
                <View style={styles.heroBadgesRow}>
                  <View
                    style={[
                      styles.equippedTitlePill,
                      { backgroundColor: theme.tintBg, borderColor: theme.border },
                    ]}
                  >
                    <Ionicons name="ribbon" size={13} color={theme.bright} />
                    <Text style={[styles.equippedTitleText, { color: theme.bright }]}>
                      {profile.user.equippedTitle.name}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.equippedTitlePill,
                      { backgroundColor: theme.tintBg, borderColor: theme.border },
                    ]}
                  >
                    <ChapaCoinIcon size={14} />
                    <Text style={[styles.equippedTitleText, { color: theme.bright }]}>
                      {profile.user.chapas.toLocaleString('es-ES')} Chapas
                    </Text>
                  </View>
                </View>

                <View style={styles.heroStatsStrip}>
                  <View style={styles.heroStatItem}>
                    <Text style={[styles.heroStatVal, { color: theme.bright }]}>
                      {profile.stats.beersRegistered} / {profile.stats.beersTotal}
                    </Text>
                    <Text style={styles.heroStatLabel}>Cervezas BeerDex</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStatItem}>
                    <Text style={[styles.heroStatVal, { color: theme.bright }]}>
                      {profile.stats.achievementsUnlocked} / {profile.stats.achievementsTotal}
                    </Text>
                    <Text style={styles.heroStatLabel}>Logros completados</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Vitrina de Reliquias (3 cajas cuadradas simétricas) */}
              <LinearGradient
                colors={GRADIENTS.card}
                style={[styles.infoCard, SHADOWS.card]}
              >
                <View style={styles.vitrinaHeader}>
                  <View>
                    <Text style={styles.vitrinaTitle}>Vitrina de Reliquias</Text>
                    <Text style={styles.vitrinaSub}>
                      Toca cualquier hueco para exponer tus coleccionables
                    </Text>
                  </View>
                  <Pressable onPress={() => setTab('vitrina')}>
                    <Text style={[styles.vitrinaLink, { color: theme.bright }]}>Ver todas</Text>
                  </Pressable>
                </View>

                <View style={styles.vitrinaRow}>
                  {([0, 1, 2] as const).map((idx) => {
                    const relic = showcaseSlots[idx] ?? null;
                    const slotNum = (idx + 1) as 1 | 2 | 3;
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => setEditingSlot(slotNum)}
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
                              <RelicIcon previewKey={relic.previewKey} size={62} pedestal />
                              <View style={styles.vitrinaPlaque}>
                                <Text style={styles.vitrinaSlotName} numberOfLines={1}>
                                  {relic.name}
                                </Text>
                              </View>
                            </>
                          ) : (
                            <View style={styles.vitrinaEmptyInner}>
                              <Ionicons name="add-circle-outline" size={24} color={COLORS.textMuted} />
                              <Text style={styles.vitrinaEmptyText}>Hueco {slotNum}</Text>
                            </View>
                          )}
                        </LinearGradient>
                      </Pressable>
                    );
                  })}
                </View>
              </LinearGradient>

              {/* Resumen de personalización activa */}
              <LinearGradient
                colors={GRADIENTS.card}
                style={[styles.infoCard, SHADOWS.card]}
              >
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Marco equipado</Text>
                  <Text style={styles.infoVal}>
                    {profile.user.equippedFrame?.name || 'Marco Estándar'}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Carta 3D</Text>
                  <Text style={styles.infoVal}>
                    {profile.user.equippedCardStyle?.name || 'Carta Clásica Ámbar'}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tema de color</Text>
                  <Text style={styles.infoVal}>
                    {profile.user.equippedColorTheme?.name || 'Ámbar Clásico'}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Correo electrónico</Text>
                  <Text style={styles.infoVal}>{profile.user.email}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Fecha de registro</Text>
                  <Text style={styles.infoVal}>
                    {formatDateDDMMYYYY(profile.user.createdAt)}
                  </Text>
                </View>
              </LinearGradient>

              {/* Cambiar contraseña */}
              <LinearGradient
                colors={GRADIENTS.card}
                style={[styles.securityCard, SHADOWS.card]}
              >
                <Pressable
                  onPress={() => setShowPwForm((v) => !v)}
                  style={styles.securityToggle}
                >
                  <View style={styles.securityLeft}>
                    <Ionicons name="key-outline" size={20} color={theme.bright} />
                    <Text style={styles.securityTitle}>Cambiar contraseña</Text>
                  </View>
                  <Ionicons
                    name={showPwForm ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </Pressable>

                {showPwForm ? (
                  <View style={styles.pwForm}>
                    <TextInput
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Contraseña actual"
                      placeholderTextColor={COLORS.textMuted}
                      secureTextEntry
                      style={styles.input}
                    />
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Nueva contraseña (mín. 6 caracteres)"
                      placeholderTextColor={COLORS.textMuted}
                      secureTextEntry
                      style={styles.input}
                    />
                    <Pressable onPress={handleChangePassword} disabled={pwSaving}>
                      <LinearGradient
                        colors={theme.gradientBtn}
                        style={[styles.primaryBtn, pwSaving && styles.btnDisabled]}
                      >
                        {pwSaving ? (
                          <ActivityIndicator color={COLORS.bg} />
                        ) : (
                          <Text style={styles.primaryBtnText}>Guardar contraseña</Text>
                        )}
                      </LinearGradient>
                    </Pressable>
                  </View>
                ) : null}
              </LinearGradient>

              <Pressable onPress={handleLogout} style={styles.logoutBtn}>
                <Ionicons name="log-out-outline" size={20} color="#FFB4B0" />
                <Text style={styles.logoutText}>Cerrar sesión</Text>
              </Pressable>

              <View style={styles.dangerZone}>
                <Text style={styles.dangerLabel}>Zona de peligro</Text>
                <Pressable
                  onPress={() => {
                    setDeletePassword('');
                    setDeleteModalVisible(true);
                  }}
                  style={styles.deleteAccountBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  <Text style={styles.deleteAccountText}>Eliminar mi cuenta</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {tab === 'titulos' ? (
            <View style={styles.gridList}>
              {profile.titles.map((item) => (
                <Pressable key={item.id} onPress={() => handleTitlePress(item)}>
                  <LinearGradient
                    colors={
                      item.equipped
                        ? GRADIENTS.unlocked
                        : item.unlocked
                        ? GRADIENTS.card
                        : GRADIENTS.locked
                    }
                    style={[
                      styles.titleCard,
                      SHADOWS.card,
                      !item.unlocked && styles.lockedCard,
                      item.equipped && { borderColor: theme.border, borderWidth: 1.5 },
                    ]}
                  >
                    <View style={styles.titleRow}>
                      <View style={styles.titleLeft}>
                        <Ionicons
                          name={
                            !item.unlocked
                              ? 'lock-closed'
                              : item.equipped
                              ? 'checkmark-circle'
                              : 'ribbon-outline'
                          }
                          size={20}
                          color={
                            !item.unlocked
                              ? COLORS.lockedText
                              : item.equipped
                              ? theme.bright
                              : COLORS.textSecondary
                          }
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.titleName,
                              !item.unlocked && styles.lockedText,
                              item.equipped && { color: theme.bright },
                            ]}
                          >
                            {item.name}
                          </Text>
                          {!item.unlocked ? (
                            <Text style={styles.unlockHint}>
                              {item.source === 'shop'
                                ? `La Bodega · ${item.priceChapas} Chapas`
                                : `Logro: ${item.unlockAchievementName || 'Especial'}`}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      {renderUnlockBadge(item)}
                    </View>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          ) : null}

          {tab === 'iconos' ? (
            <View style={styles.iconsGrid}>
              {profile.icons.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleIconPress(item)}
                  style={styles.iconSlot}
                >
                  <LinearGradient
                    colors={
                      item.equipped
                        ? GRADIENTS.unlocked
                        : item.unlocked
                        ? GRADIENTS.card
                        : GRADIENTS.locked
                    }
                    style={[
                      styles.iconCard,
                      SHADOWS.card,
                      !item.unlocked && styles.lockedCard,
                      item.equipped && { borderColor: theme.border, borderWidth: 1.5 },
                    ]}
                  >
                    <View style={styles.iconWrap}>
                      <ProfileIcon
                        imageUrl={item.imageUrl}
                        size={74}
                        locked={!item.unlocked}
                        highlight={item.equipped}
                      />
                      {!item.unlocked ? (
                        <View style={styles.padlockBadge}>
                          <Ionicons name="lock-closed" size={14} color={COLORS.text} />
                        </View>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.iconName,
                        !item.unlocked && styles.lockedText,
                        item.equipped && { color: theme.bright },
                      ]}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    {renderUnlockBadge(item)}
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          ) : null}

          {tab === 'marcos' ? (
            <View style={styles.iconsGrid}>
              {profile.cosmetics.frames.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleCosmeticPress(item)}
                  style={styles.iconSlot}
                >
                  <LinearGradient
                    colors={
                      item.equipped
                        ? GRADIENTS.unlocked
                        : item.unlocked
                        ? GRADIENTS.card
                        : GRADIENTS.locked
                    }
                    style={[
                      styles.iconCard,
                      SHADOWS.card,
                      !item.unlocked && styles.lockedCard,
                      item.equipped && { borderColor: theme.border, borderWidth: 1.5 },
                    ]}
                  >
                    <View style={styles.iconWrap}>
                      <ProfileIcon
                        imageUrl={profile.user.equippedIcon.imageUrl}
                        size={52}
                        locked={!item.unlocked}
                        frameCode={item.code}
                        frameMetadata={item.metadata}
                      />
                      {!item.unlocked ? (
                        <View style={styles.padlockBadge}>
                          <Ionicons name="lock-closed" size={14} color={COLORS.text} />
                        </View>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.iconName,
                        !item.unlocked && styles.lockedText,
                        item.equipped && { color: theme.bright },
                      ]}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    {renderUnlockBadge(item)}
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          ) : null}

          {tab === 'cartas' ? (
            <View style={styles.iconsGrid}>
              {profile.cosmetics.cardStyles.map((item) => {
                const frontColors =
                  Array.isArray(item.metadata?.frontColors) &&
                  item.metadata.frontColors.length >= 2
                    ? ([
                        String(item.metadata.frontColors[0]),
                        String(item.metadata.frontColors[1]),
                      ] as const)
                    : GRADIENTS.unlocked;
                const borderColor =
                  typeof item.metadata?.borderColor === 'string'
                    ? item.metadata.borderColor
                    : COLORS.borderGold;
                const accent =
                  typeof item.metadata?.accentColor === 'string'
                    ? item.metadata.accentColor
                    : COLORS.amberBright;

                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleCosmeticPress(item)}
                    style={styles.iconSlot}
                  >
                    <LinearGradient
                      colors={
                        item.equipped
                          ? GRADIENTS.unlocked
                          : item.unlocked
                          ? GRADIENTS.card
                          : GRADIENTS.locked
                      }
                      style={[
                        styles.iconCard,
                        SHADOWS.card,
                        !item.unlocked && styles.lockedCard,
                        item.equipped && { borderColor: theme.border, borderWidth: 1.5 },
                      ]}
                    >
                      <LinearGradient
                        colors={frontColors}
                        style={[
                          styles.cardPreviewBox,
                          { borderColor },
                          !item.unlocked && { opacity: 0.45 },
                        ]}
                      >
                        <MedievalCardOrnament compact borderColor={borderColor} accentColor={accent} />
                        <Ionicons name="beer" size={22} color={accent} />
                      </LinearGradient>
                      <Text
                        style={[
                          styles.iconName,
                          !item.unlocked && styles.lockedText,
                          item.equipped && { color: theme.bright },
                        ]}
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>
                      {renderUnlockBadge(item)}
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {tab === 'vitrina' ? (
            <View style={styles.iconsGrid}>
              {profile.cosmetics.relics.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handleCosmeticPress(item)}
                  style={styles.iconSlot}
                >
                  <LinearGradient
                    colors={
                      item.equipped
                        ? GRADIENTS.unlocked
                        : item.unlocked
                        ? GRADIENTS.card
                        : GRADIENTS.locked
                    }
                    style={[
                      styles.iconCard,
                      SHADOWS.card,
                      !item.unlocked && styles.lockedCard,
                      item.equipped && { borderColor: theme.border, borderWidth: 1.5 },
                    ]}
                  >
                    <View style={styles.iconWrap}>
                      <RelicIcon
                        previewKey={item.previewKey}
                        size={76}
                        locked={!item.unlocked}
                        pedestal
                      />
                      {!item.unlocked ? (
                        <View style={styles.padlockBadge}>
                          <Ionicons name="lock-closed" size={14} color={COLORS.text} />
                        </View>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.iconName,
                        !item.unlocked && styles.lockedText,
                        item.equipped && { color: theme.bright },
                      ]}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    {renderUnlockBadge(item)}
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          ) : null}

          {tab === 'colores' ? (
            <View style={styles.gridList}>
              {profile.cosmetics.colorThemes.map((item) => {
                const grad =
                  Array.isArray(item.metadata?.gradientBtn) &&
                  item.metadata.gradientBtn.length >= 3
                    ? ([
                        String(item.metadata.gradientBtn[0]),
                        String(item.metadata.gradientBtn[1]),
                        String(item.metadata.gradientBtn[2]),
                      ] as const)
                    : GRADIENTS.amberBtn;

                return (
                  <Pressable key={item.id} onPress={() => handleCosmeticPress(item)}>
                    <LinearGradient
                      colors={
                        item.equipped
                          ? GRADIENTS.unlocked
                          : item.unlocked
                          ? GRADIENTS.card
                          : GRADIENTS.locked
                      }
                      style={[
                        styles.titleCard,
                        SHADOWS.card,
                        !item.unlocked && styles.lockedCard,
                        item.equipped && { borderColor: theme.border, borderWidth: 1.5 },
                      ]}
                    >
                      <View style={styles.titleRow}>
                        <View style={styles.titleLeft}>
                          <LinearGradient
                            colors={grad}
                            style={[
                              styles.colorCircle,
                              !item.unlocked && { opacity: 0.45 },
                            ]}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.titleName,
                                !item.unlocked && styles.lockedText,
                                item.equipped && { color: theme.bright },
                              ]}
                            >
                              {item.name}
                            </Text>
                            <Text style={styles.unlockHint}>
                              {item.unlocked
                                ? item.description
                                : item.source === 'shop'
                                ? `La Bodega · ${item.priceChapas} Chapas`
                                : `Logro: ${item.unlockAchievementName || 'Especial'}`}
                            </Text>
                          </View>
                        </View>
                        {renderUnlockBadge(item)}
                      </View>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* Modal elegir reliquia para un hueco de vitrina */}
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
            {unlockedRelics.length === 0 ? (
              <Text style={styles.modalBody}>
                Aún no tienes reliquias desbloqueadas. Consíguelas completando logros o comprándolas en La Bodega.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 280, width: '100%' }} contentContainerStyle={{ gap: 8 }}>
                {unlockedRelics.map((relic) => (
                  <Pressable
                    key={relic.id}
                    onPress={() => editingSlot && assignRelicToSlot(editingSlot, relic.id)}
                    style={[
                      styles.relicPickRow,
                      { borderColor: COLORS.borderStrong },
                    ]}
                  >
                    <RelicIcon previewKey={relic.previewKey} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.relicPickName}>{relic.name}</Text>
                      <Text style={styles.relicPickDesc} numberOfLines={1}>
                        {relic.description}
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

      {/* Modal elegir en qué hueco colocar una reliquia desde la pestaña Vitrina */}
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

      {/* Modal confirmar eliminación de cuenta */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, SHADOWS.card]}>
            <Text style={styles.modalTitle}>Eliminar cuenta definitivamente</Text>
            <Text style={styles.modalBody}>
              Esta acción borrará tu perfil, tus cervezas registradas, tus fotos personales, tus logros y tus amistades de forma irreversible. Introduce tu contraseña para confirmar:
            </Text>
            <TextInput
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Tu contraseña actual"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setDeleteModalVisible(false)}
                disabled={deletingAccount}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmDeleteAccount}
                disabled={deletingAccount}
                style={styles.confirmDeleteBtn}
              >
                {deletingAccount ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Eliminar</Text>
                )}
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
  navbarWrap: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
    maxWidth: 740,
    width: '100%',
    alignSelf: 'center',
  },
  navbarScroll: {
    paddingHorizontal: SPACING.lg,
    gap: 8,
  },
  navTab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    backgroundColor: '#120E0C',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  navText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
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
    paddingBottom: SPACING.xxl,
  },
  profileWrap: {
    gap: SPACING.lg,
  },
  identityCard: {
    borderRadius: RADIUS.xl + 4,
    borderWidth: 1.5,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm + 2,
  },
  username: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 4,
  },
  heroBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  equippedTitlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  equippedTitleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  heroStatsStrip: {
    flexDirection: 'row',
    width: '100%',
    marginTop: SPACING.sm,
    backgroundColor: 'rgba(12, 9, 8, 0.52)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  heroStatVal: {
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: '900',
  },
  heroStatLabel: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  vitrinaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  vitrinaTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 16.5,
    fontWeight: '900',
  },
  vitrinaSub: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
  },
  vitrinaLink: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  vitrinaRow: {
    flexDirection: 'row',
    gap: SPACING.sm + 2,
  },
  vitrinaSlot: {
    flex: 1,
    minHeight: 124,
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
  infoCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.md,
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  infoVal: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  securityCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  securityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  securityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  securityTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 15.5,
    fontWeight: '800',
  },
  pwForm: {
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  input: {
    backgroundColor: 'rgba(12, 9, 8, 0.72)',
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 11,
    color: COLORS.text,
    fontSize: 14,
  },
  primaryBtn: {
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: COLORS.bg,
    fontSize: 14,
    fontWeight: '900',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
  },
  logoutText: {
    color: '#FFB4B0',
    fontSize: 15,
    fontWeight: '800',
  },
  dangerZone: {
    alignItems: 'center',
    paddingTop: SPACING.xs,
    gap: 4,
  },
  dangerLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  deleteAccountText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  gridList: {
    gap: SPACING.sm + 2,
  },
  titleCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  titleName: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 16,
    fontWeight: '800',
  },
  unlockHint: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    marginTop: 2,
  },
  lockedCard: {
    borderColor: COLORS.lockedBorder,
    opacity: 0.78,
  },
  lockedText: {
    color: COLORS.lockedText,
  },
  equippedPill: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  equipPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  equippedTag: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  lockedTag: {
    color: COLORS.lockedText,
    fontSize: 10,
    fontWeight: '800',
  },
  equipActionTag: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '700',
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  iconSlot: {
    width: '48.5%',
    marginBottom: SPACING.md,
  },
  iconCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.md + 2,
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 88,
  },
  cardPreviewBox: {
    width: 72,
    height: 92,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  padlockBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.elevated,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconName: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 13.5,
    fontWeight: '800',
    textAlign: 'center',
    minHeight: 35,
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
    borderColor: COLORS.dangerBorder,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  modalTitle: {
    color: '#FFB4B0',
    fontFamily: FONTS.display,
    fontSize: 19,
    fontWeight: '900',
  },
  modalBody: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  confirmDeleteBtn: {
    flex: 1,
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
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
