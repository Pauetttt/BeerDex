import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { ChapaCoinIcon } from '../../components/ChapaCoinIcon';
import { MedievalCardOrnament } from '../../components/MedievalCardOrnament';
import { ProfileIcon } from '../../components/ProfileIcon';
import { RelicIcon } from '../../components/RelicIcon';
import { useAppAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { meApi, shopApi } from '../../services/api';
import {
  COLORS,
  FONTS,
  GRADIENTS,
  RADIUS,
  SHADOWS,
  SPACING,
  WEB_GLASS,
} from '../../theme/tokens';
import { ShopItem, ShopResponse } from '../../types/api';

type ShopCategoryKey =
  | 'all'
  | 'icons'
  | 'titles'
  | 'frames'
  | 'cardStyles'
  | 'relics'
  | 'colorThemes';

const SHOP_CATEGORIES: Array<{ key: ShopCategoryKey; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'icons', label: 'Iconos' },
  { key: 'titles', label: 'Títulos' },
  { key: 'frames', label: 'Marcos' },
  { key: 'cardStyles', label: 'Cartas 3D' },
  { key: 'relics', label: 'Vitrina' },
  { key: 'colorThemes', label: 'Colores' },
];

const TYPE_LABEL: Record<ShopItem['itemType'], string> = {
  icon: 'ICONO',
  title: 'TÍTULO',
  frame: 'MARCO',
  card_style: 'CARTA 3D',
  relic: 'RELIQUIA',
  color_theme: 'TEMA COLOR',
};

export default function ShopScreen() {
  const { width } = useWindowDimensions();
  const { user, applyMeProfile, refreshMe } = useAuth();
  const { showAlert } = useAppAlert();
  const theme = useAppTheme();

  const [data, setData] = useState<ShopResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<ShopCategoryKey>('all');

  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [buying, setBuying] = useState(false);
  const [equippingId, setEquippingId] = useState<string | null>(null);
  const [relicSlotTarget, setRelicSlotTarget] = useState<ShopItem | null>(null);

  const loadShop = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await shopApi.getShop();
      setData(res);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadShop();
    }, [loadShop])
  );

  const visibleItems = useMemo(() => {
    if (!data) return [];
    const c = data.categories;
    if (category === 'all') {
      return [
        ...c.icons,
        ...c.titles,
        ...c.frames,
        ...c.cardStyles,
        ...c.relics,
        ...c.colorThemes,
      ];
    }
    return c[category];
  }, [category, data]);

  const balance = data?.chapas ?? user?.chapas ?? 0;
  const isThreeCol = width >= 680;

  const handleOpenBuy = (item: ShopItem) => {
    if (balance < item.priceChapas) {
      const missing = item.priceChapas - balance;
      showAlert(
        'Chapas insuficientes',
        `Necesitas ${missing.toLocaleString('es-ES')} Chapas más para comprar "${item.name}".`
      );
      return;
    }
    setConfirmItem(item);
  };

  const handleConfirmBuy = async () => {
    if (!confirmItem || buying) return;
    setBuying(true);
    try {
      await shopApi.buy({
        itemType: confirmItem.itemType,
        itemId: confirmItem.id,
      });
      setConfirmItem(null);
      await Promise.all([loadShop(), refreshMe()]);
      showAlert(
        '¡Compra realizada!',
        `"${confirmItem.name}" ya está en tu colección. Puedes equiparlo cuando quieras.`
      );
    } catch (err) {
      showAlert(
        'No se pudo comprar',
        err instanceof Error ? err.message : 'Error en la compra.'
      );
    } finally {
      setBuying(false);
    }
  };

  const handleEquipItem = async (item: ShopItem, slotIndex?: 1 | 2 | 3) => {
    if (item.itemType === 'relic' && !slotIndex) {
      setRelicSlotTarget(item);
      return;
    }

    const key = `${item.itemType}-${item.id}`;
    setEquippingId(key);
    try {
      let payload: Parameters<typeof meApi.equip>[0] = {};
      if (item.itemType === 'icon') payload = { equippedIconId: item.id };
      else if (item.itemType === 'title') payload = { equippedTitleId: item.id };
      else if (item.itemType === 'frame') payload = { equippedFrameId: item.id };
      else if (item.itemType === 'card_style') payload = { equippedCardStyleId: item.id };
      else if (item.itemType === 'color_theme') payload = { equippedColorThemeId: item.id };
      else if (item.itemType === 'relic') {
        if (slotIndex === 1) payload = { showcaseSlot1Id: item.id };
        else if (slotIndex === 2) payload = { showcaseSlot2Id: item.id };
        else payload = { showcaseSlot3Id: item.id };
      }

      const updated = await meApi.equip(payload);
      applyMeProfile(updated);
      setRelicSlotTarget(null);
      await loadShop();
    } catch (err) {
      showAlert('Error al equipar', err instanceof Error ? err.message : 'No se pudo equipar.');
    } finally {
      setEquippingId(null);
    }
  };

  const renderPreview = (item: ShopItem) => {
    if (item.itemType === 'icon') {
      return (
        <ProfileIcon
          imageUrl={item.previewKey}
          size={64}
          highlight={item.equipped}
        />
      );
    }

    if (item.itemType === 'frame') {
      return (
        <ProfileIcon
          imageUrl={user?.equippedIcon?.imageUrl}
          size={56}
          frameCode={item.code}
          frameMetadata={item.metadata}
        />
      );
    }

    if (item.itemType === 'relic') {
      return <RelicIcon previewKey={item.previewKey} size={84} pedestal />;
    }

    if (item.itemType === 'title') {
      return (
        <View
          style={[
            styles.titlePreviewPill,
            { backgroundColor: theme.tintBg, borderColor: theme.border },
          ]}
        >
          <Ionicons name="ribbon" size={16} color={theme.bright} />
          <Text style={[styles.titlePreviewText, { color: theme.bright }]} numberOfLines={2}>
            {item.name}
          </Text>
        </View>
      );
    }

    if (item.itemType === 'card_style') {
      const meta = item.metadata;
      const frontColors =
        Array.isArray(meta?.frontColors) && meta.frontColors.length >= 2
          ? ([String(meta.frontColors[0]), String(meta.frontColors[1])] as const)
          : GRADIENTS.unlocked;
      const borderColor =
        typeof meta?.borderColor === 'string' ? meta.borderColor : COLORS.borderGold;
      const accent = typeof meta?.accentColor === 'string' ? meta.accentColor : COLORS.amberBright;

      return (
        <LinearGradient
          colors={frontColors}
          style={[styles.cardMiniPreview, { borderColor }]}
        >
          <MedievalCardOrnament compact borderColor={borderColor} accentColor={accent} />
          <View style={[styles.cardMiniLine, { backgroundColor: accent }]} />
          <Ionicons name="beer" size={22} color={accent} />
          <View style={[styles.cardMiniBar, { backgroundColor: borderColor }]} />
        </LinearGradient>
      );
    }

    // color_theme
    const primary = typeof item.metadata?.primary === 'string' ? item.metadata.primary : theme.primary;
    const bright = typeof item.metadata?.bright === 'string' ? item.metadata.bright : theme.bright;
    const grad =
      Array.isArray(item.metadata?.gradientBtn) && item.metadata.gradientBtn.length >= 3
        ? ([
            String(item.metadata.gradientBtn[0]),
            String(item.metadata.gradientBtn[1]),
            String(item.metadata.gradientBtn[2]),
          ] as const)
        : theme.gradientBtn;

    return (
      <View style={styles.themePreviewWrap}>
        <LinearGradient colors={grad} style={styles.themeSwatchCircle}>
          <Ionicons name="color-palette" size={24} color={COLORS.bg} />
        </LinearGradient>
        <View style={styles.themeDotsRow}>
          <View style={[styles.themeDot, { backgroundColor: primary }]} />
          <View style={[styles.themeDot, { backgroundColor: bright }]} />
        </View>
      </View>
    );
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadShop(true)}
            tintColor={theme.primary}
          />
        }
      >
        {/* Cabecera de La Bodega */}
        <LinearGradient
          colors={GRADIENTS.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { borderColor: theme.border }, SHADOWS.card]}
        >
          <View style={styles.heroRow}>
            <View style={styles.heroTextCol}>
              <Text style={[styles.heroEyebrow, { color: theme.primary }]}>
                TIENDA CERVECERA
              </Text>
              <Text style={styles.heroTitle}>La Bodega</Text>
              <Text style={styles.heroSub}>
                Canjea tus Chapas por cosméticos exclusivos y reliquias para tu vitrina
              </Text>
            </View>
            <View
              style={[
                styles.balanceBox,
                { backgroundColor: theme.tintBg, borderColor: theme.border },
              ]}
            >
              <ChapaCoinIcon size={24} />
              <View>
                <Text style={styles.balanceLabel}>SALDO</Text>
                <Text style={[styles.balanceVal, { color: theme.bright }]}>
                  {balance.toLocaleString('es-ES')}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Filtros por categoría */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catsScroll}
        >
          {SHOP_CATEGORIES.map((cat) => {
            const active = category === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => setCategory(cat.key)}
                style={[
                  styles.catChip,
                  active && {
                    backgroundColor: theme.tintBg,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.catChipText,
                    active && { color: theme.bright },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Grid uniforme de artículos */}
        <View style={styles.grid}>
          {visibleItems.map((item) => {
            const canAfford = balance >= item.priceChapas;
            const isEquipping = equippingId === `${item.itemType}-${item.id}`;

            return (
              <View
                key={`${item.itemType}-${item.id}`}
                style={isThreeCol ? styles.colThree : styles.colTwo}
              >
                <LinearGradient
                  colors={
                    item.equipped
                      ? GRADIENTS.unlocked
                      : GRADIENTS.card
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.itemCard,
                    SHADOWS.card,
                    item.equipped && { borderColor: theme.border, borderWidth: 1.5 },
                  ]}
                >
                  <View style={styles.cardTopMeta}>
                    <Text style={styles.typePill}>{TYPE_LABEL[item.itemType]}</Text>
                    {item.owned ? (
                      <View
                        style={[
                          styles.ownedBadge,
                          item.equipped && {
                            backgroundColor: theme.tintBg,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.ownedText,
                            item.equipped && { color: theme.bright },
                          ]}
                        >
                          {item.equipped ? 'Equipado' : 'En propiedad'}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.previewBox}>{renderPreview(item)}</View>

                  <View style={styles.infoBlock}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </View>

                  <View style={styles.actionArea}>
                    {item.owned ? (
                      <Pressable
                        onPress={() => handleEquipItem(item)}
                        disabled={(item.equipped && item.itemType !== 'relic') || isEquipping}
                        style={[
                          styles.equipBtn,
                          item.equipped && item.itemType !== 'relic'
                            ? styles.equippedDoneBtn
                            : {
                                backgroundColor: theme.tintBg,
                                borderColor: theme.border,
                              },
                        ]}
                      >
                        {isEquipping ? (
                          <ActivityIndicator size="small" color={theme.bright} />
                        ) : (
                          <Text
                            style={[
                              styles.equipBtnText,
                              {
                                color:
                                  item.equipped && item.itemType !== 'relic'
                                    ? COLORS.success
                                    : theme.bright,
                              },
                            ]}
                          >
                            {item.equipped
                              ? item.itemType === 'relic'
                                ? 'Cambiar hueco'
                                : 'Equipado ✓'
                              : 'Equipar'}
                          </Text>
                        )}
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => handleOpenBuy(item)}
                        style={({ pressed }) => [pressed && styles.pressed]}
                      >
                        <LinearGradient
                          colors={
                            canAfford
                              ? theme.gradientBtn
                              : (['#2C2520', '#201B17'] as const)
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.buyBtn}
                        >
                          <ChapaCoinIcon size={15} />
                          <Text
                            style={[
                              styles.buyBtnText,
                              !canAfford && styles.buyBtnTextMuted,
                            ]}
                            numberOfLines={1}
                          >
                            {item.priceChapas.toLocaleString('es-ES')} Chapas
                          </Text>
                        </LinearGradient>
                      </Pressable>
                    )}
                  </View>
                </LinearGradient>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal de confirmación de compra Sí / No */}
      <Modal
        visible={Boolean(confirmItem)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!buying) setConfirmItem(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { borderColor: theme.border }, SHADOWS.card]}>
            {confirmItem ? (
              <>
                <Text style={styles.modalEyebrow}>CONFIRMAR COMPRA</Text>
                <View style={styles.modalPreviewWrap}>{renderPreview(confirmItem)}</View>
                <Text style={styles.modalTitle}>
                  ¿Seguro que quieres comprar "{confirmItem.name}"?
                </Text>
                <View style={styles.modalSummaryBox}>
                  <View style={styles.modalSummaryRow}>
                    <Text style={styles.modalSummaryLabel}>Coste:</Text>
                    <View style={styles.modalCoinRow}>
                      <ChapaCoinIcon size={15} />
                      <Text style={[styles.modalSummaryVal, { color: theme.bright }]}>
                        {confirmItem.priceChapas.toLocaleString('es-ES')} Chapas
                      </Text>
                    </View>
                  </View>
                  <View style={styles.modalSummaryRow}>
                    <Text style={styles.modalSummaryLabel}>Saldo tras la compra:</Text>
                    <Text style={styles.modalSummaryAfter}>
                      {(balance - confirmItem.priceChapas).toLocaleString('es-ES')} Chapas
                    </Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => setConfirmItem(null)}
                    disabled={buying}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelBtnText}>No, cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirmBuy}
                    disabled={buying}
                    style={styles.confirmBtnWrap}
                  >
                    <LinearGradient
                      colors={theme.gradientBtn}
                      style={styles.confirmBtn}
                    >
                      {buying ? (
                        <ActivityIndicator size="small" color={COLORS.bg} />
                      ) : (
                        <Text style={styles.confirmBtnText}>Sí, comprar</Text>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Modal selector de hueco en Vitrina para reliquias */}
      <Modal
        visible={Boolean(relicSlotTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setRelicSlotTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { borderColor: theme.border }, SHADOWS.card]}>
            <Text style={styles.modalEyebrow}>VITRINA DE PERFIL</Text>
            <Text style={styles.modalTitle}>
              ¿En qué hueco quieres exponer "{relicSlotTarget?.name}"?
            </Text>
            <View style={styles.slotsChoiceRow}>
              {([1, 2, 3] as const).map((slotNum) => {
                const currentInSlot = user?.showcaseRelics?.[slotNum - 1];
                return (
                  <Pressable
                    key={slotNum}
                    onPress={() => relicSlotTarget && handleEquipItem(relicSlotTarget, slotNum)}
                    style={[
                      styles.slotChoiceBtn,
                      { borderColor: theme.border, backgroundColor: theme.tintBg },
                    ]}
                  >
                    <Text style={[styles.slotChoiceTitle, { color: theme.bright }]}>
                      Hueco {slotNum}
                    </Text>
                    <Text style={styles.slotChoiceSub} numberOfLines={1}>
                      {currentInSlot ? currentInSlot.name : 'Vacío'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setRelicSlotTarget(null)}
              style={[styles.cancelBtn, { width: '100%' }]}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.screenBg,
  },
  content: {
    padding: SPACING.lg,
    maxWidth: 820,
    width: '100%',
    alignSelf: 'center',
    gap: SPACING.md,
    paddingBottom: SPACING.xxl + 16,
  },
  heroCard: {
    borderRadius: RADIUS.xl + 2,
    borderWidth: 1.5,
    padding: SPACING.lg,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  heroTextCol: {
    flex: 1,
    gap: 3,
  },
  heroEyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 25,
    fontWeight: '900',
  },
  heroSub: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    lineHeight: 17,
  },
  balanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexShrink: 0,
  },
  balanceLabel: {
    color: COLORS.textMuted,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  balanceVal: {
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: '900',
  },
  catsScroll: {
    gap: SPACING.sm,
    paddingVertical: 2,
  },
  catChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catChipText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: SPACING.md,
  },
  colTwo: {
    width: '48.2%',
  },
  colThree: {
    width: '31.8%',
  },
  itemCard: {
    borderRadius: RADIUS.lg + 2,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.md,
    justifyContent: 'space-between',
    gap: SPACING.sm,
    minHeight: 268,
  },
  cardTopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    minHeight: 20,
  },
  typePill: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  ownedBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.35)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  ownedText: {
    color: COLORS.success,
    fontSize: 9.5,
    fontWeight: '800',
  },
  previewBox: {
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12, 9, 8, 0.52)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
  },
  titlePreviewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  titlePreviewText: {
    fontFamily: FONTS.display,
    fontSize: 12.5,
    fontWeight: '900',
    textAlign: 'center',
    flexShrink: 1,
  },
  cardMiniPreview: {
    width: 68,
    height: 88,
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  cardMiniLine: {
    width: '80%',
    height: 3,
    borderRadius: 2,
  },
  cardMiniBar: {
    width: '65%',
    height: 4,
    borderRadius: 2,
  },
  themePreviewWrap: {
    alignItems: 'center',
    gap: 6,
  },
  themeSwatchCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeDotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  themeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  infoBlock: {
    gap: 3,
  },
  itemName: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
    minHeight: 36,
  },
  itemDesc: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    minHeight: 30,
  },
  actionArea: {
    marginTop: 2,
  },
  pressed: {
    opacity: 0.88,
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  buyBtnText: {
    color: COLORS.bg,
    fontFamily: FONTS.display,
    fontSize: 13,
    fontWeight: '900',
  },
  buyBtnTextMuted: {
    color: COLORS.textSecondary,
  },
  equipBtn: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equippedDoneBtn: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
  },
  equipBtnText: {
    fontFamily: FONTS.display,
    fontSize: 12.5,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
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
    ...WEB_GLASS,
  },
  modalEyebrow: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  modalPreviewWrap: {
    width: '100%',
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12, 9, 8, 0.55)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalSummaryBox: {
    width: '100%',
    backgroundColor: 'rgba(12, 9, 8, 0.5)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: 8,
  },
  modalSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalSummaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
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
    fontSize: 13.5,
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
