import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl } from '../services/api';
import {
  COLORS,
  FONTS,
  FORMAT_LABELS,
  GRADIENTS,
  RADIUS,
  SHADOWS,
  SPACING,
  WEB_GLASS,
} from '../theme/tokens';
import { BeerDexItem } from '../types/api';
import { formatDateDDMMYYYY } from '../utils/dateFormat';
import { BeerSilhouette } from './BeerSilhouette';
import { MedievalCardOrnament } from './MedievalCardOrnament';
import { StarRating } from './StarRating';

interface Props {
  beer: BeerDexItem;
  onFlipToBack?: (beerId: number) => void;
  cardStyleMetadata?: Record<string, unknown> | null;
}

const CARD_HEIGHT = 296;

export const BeerCard = React.memo(function BeerCard({
  beer,
  onFlipToBack,
  cardStyleMetadata,
}: Props) {
  const { user } = useAuth();
  const [isFlipped, setIsFlipped] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);
  const reportedFlipRef = useRef(false);
  const flipProgress = useSharedValue(0);

  const activeMeta = cardStyleMetadata ?? user?.equippedCardStyle?.metadata ?? null;
  const frontColors =
    Array.isArray(activeMeta?.frontColors) && activeMeta.frontColors.length >= 2
      ? ([String(activeMeta.frontColors[0]), String(activeMeta.frontColors[1])] as const)
      : GRADIENTS.unlocked;
  const backColors =
    Array.isArray(activeMeta?.backColors) && activeMeta.backColors.length >= 2
      ? ([String(activeMeta.backColors[0]), String(activeMeta.backColors[1])] as const)
      : GRADIENTS.backFace;
  const cardBorderColor =
    typeof activeMeta?.borderColor === 'string' ? activeMeta.borderColor : COLORS.borderGold;
  const cardAccentColor =
    typeof activeMeta?.accentColor === 'string' ? activeMeta.accentColor : COLORS.amberBright;

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 180], [0, 180]);
    const opacity = interpolate(flipProgress.value, [0, 89, 90, 180], [1, 1, 0, 0]);
    return {
      opacity,
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 180], [180, 360]);
    const opacity = interpolate(flipProgress.value, [0, 89, 90, 180], [0, 0, 1, 1]);
    return {
      opacity,
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
    };
  });

  if (!beer.unlocked) {
    return (
      <View style={styles.cardSlot}>
        <LinearGradient
          colors={GRADIENTS.locked}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.cardBase, styles.lockedCard]}
        >
          <MedievalCardOrnament
            variant="locked"
            borderColor={COLORS.lockedBorder}
            accentColor={COLORS.lockedText}
          />
          <View style={styles.lockedHeader}>
            <Text style={styles.lockedName} numberOfLines={2}>
              {beer.name}
            </Text>
            <View style={styles.lockMicroBadge}>
              <Ionicons name="lock-closed" size={11} color={COLORS.lockedText} />
            </View>
          </View>
          <View style={styles.silhouetteCenter}>
            <View style={styles.lockedCrestRing}>
              <BeerSilhouette format={beer.format} size={66} />
            </View>
          </View>
          <View style={styles.lockedFooter}>
            <View style={styles.lockedBadge}>
              <Text style={styles.lockedBadgeText}>{FORMAT_LABELS[beer.format]}</Text>
            </View>
            {beer.style ? (
              <Text style={styles.lockedStyleText} numberOfLines={1}>
                {beer.style}
              </Text>
            ) : null}
          </View>
        </LinearGradient>
      </View>
    );
  }

  const handleToggleFlip = () => {
    const next = !isFlipped;
    setIsFlipped(next);
    flipProgress.value = withTiming(next ? 180 : 0, { duration: 480 });
    if (next && !reportedFlipRef.current) {
      reportedFlipRef.current = true;
      onFlipToBack?.(beer.id);
    }
  };

  const photoUri = resolveMediaUrl(beer.userBeer.photoUrl);

  return (
    <View style={styles.cardSlot}>
      <Pressable
        onPress={handleToggleFlip}
        style={styles.flipContainer}
        accessibilityLabel={`${beer.name}. Toca para girar la ficha`}
      >
        {/* Cara delantera */}
        <Animated.View
          pointerEvents={isFlipped ? 'none' : 'auto'}
          style={[styles.cardFace, frontAnimatedStyle]}
        >
          <LinearGradient
            colors={frontColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.cardBase, styles.unlockedFront, { borderColor: cardBorderColor }, SHADOWS.card]}
          >
            <MedievalCardOrnament
              variant="front"
              borderColor={cardBorderColor}
              accentColor={cardAccentColor}
            />
            <View style={styles.frontHeader}>
              <View style={styles.headerTopRow}>
                <Text style={styles.beerName} numberOfLines={2}>
                  {beer.name}
                </Text>
                <View style={[styles.flipHintBadge, { borderColor: cardBorderColor }]}>
                  <Text style={[styles.flipHintText, { color: cardAccentColor }]}>↻</Text>
                </View>
              </View>
              <Text style={styles.dateText}>
                {formatDateDDMMYYYY(beer.userBeer.registeredAt)}
              </Text>
            </View>

            <View style={[styles.photoBox, { borderColor: cardBorderColor }]}>
              <View style={styles.photoFrameInner}>
                <Image
                  source={{ uri: photoUri }}
                  style={styles.photo}
                  resizeMode="cover"
                />
                <Pressable
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    setZoomVisible(true);
                  }}
                  style={styles.zoomBtn}
                  hitSlop={6}
                  accessibilityLabel={`Ampliar foto de ${beer.name}`}
                >
                  <Ionicons name="expand-outline" size={14} color={COLORS.text} />
                </Pressable>
              </View>
            </View>

            <View style={styles.frontFooter}>
              <StarRating rating={beer.userBeer.rating} size={13} readonly />
              <View style={[styles.formatBadge, { borderColor: cardBorderColor }]}>
                <Text style={[styles.formatBadgeText, { color: cardAccentColor }]}>
                  {FORMAT_LABELS[beer.format]}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Cara trasera */}
        <Animated.View
          pointerEvents={isFlipped ? 'auto' : 'none'}
          style={[styles.cardFace, backAnimatedStyle]}
        >
          <LinearGradient
            colors={backColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.cardBase, styles.unlockedBack, { borderColor: cardBorderColor }, SHADOWS.card]}
          >
            <MedievalCardOrnament
              variant="back"
              borderColor={cardBorderColor}
              accentColor={cardAccentColor}
            />
            <View style={styles.backHeader}>
              <View style={styles.headerTopRow}>
                <Text style={[styles.backTitle, { color: cardAccentColor }]} numberOfLines={1}>
                  {beer.name}
                </Text>
                <View style={[styles.flipHintBadge, { borderColor: cardBorderColor }]}>
                  <Text style={[styles.flipHintText, { color: cardAccentColor }]}>↻</Text>
                </View>
              </View>
              <Text style={styles.backHint}>Códice BeerDex · Crónica</Text>
            </View>

            <View style={styles.codexDividerRow}>
              <View style={[styles.codexHairline, { backgroundColor: cardBorderColor }]} />
              <Text style={[styles.codexDiamond, { color: cardAccentColor }]}>◆</Text>
              <View style={[styles.codexHairline, { backgroundColor: cardBorderColor }]} />
            </View>

            <Text style={styles.shortHistory} numberOfLines={5}>
              {beer.shortHistory}
            </Text>

            <View style={styles.codexDividerRow}>
              <View style={[styles.codexHairline, { backgroundColor: cardBorderColor }]} />
              <Text style={[styles.codexDiamond, { color: cardAccentColor }]}>◆</Text>
              <View style={[styles.codexHairline, { backgroundColor: cardBorderColor }]} />
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statBox, { borderColor: cardBorderColor }]}>
                <Text style={styles.statLabel}>ESTILO</Text>
                <Text style={[styles.statVal, { color: cardAccentColor }]} numberOfLines={1}>
                  {beer.style}
                </Text>
              </View>
              <View style={[styles.statBox, { borderColor: cardBorderColor }]}>
                <Text style={styles.statLabel}>ABV</Text>
                <Text style={[styles.statVal, { color: cardAccentColor }]}>{beer.abv.toFixed(1)}%</Text>
              </View>
              <View style={[styles.statBox, { borderColor: cardBorderColor }]}>
                <Text style={styles.statLabel}>PAÍS</Text>
                <Text style={[styles.statVal, { color: cardAccentColor }]} numberOfLines={1}>
                  {beer.country}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>

      {/* Modal de zoom de foto */}
      <Modal
        visible={zoomVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomVisible(false)}
      >
        <View style={styles.zoomBackdrop}>
          <View style={[styles.zoomCard, SHADOWS.card]}>
            <View style={styles.zoomHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.zoomTitle} numberOfLines={2}>
                  {beer.name}
                </Text>
                <Text style={styles.zoomMeta}>
                  {formatDateDDMMYYYY(beer.userBeer.registeredAt)} ·{' '}
                  {FORMAT_LABELS[beer.format]}
                </Text>
              </View>
              <Pressable
                onPress={() => setZoomVisible(false)}
                style={styles.zoomCloseBtn}
                accessibilityLabel="Cerrar zoom"
              >
                <Ionicons name="close" size={22} color={COLORS.text} />
              </Pressable>
            </View>

            <View style={styles.zoomImageBox}>
              <Image
                source={{ uri: photoUri }}
                style={styles.zoomImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.zoomFooter}>
              <StarRating rating={beer.userBeer.rating} size={22} readonly />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  cardSlot: {
    width: '48.5%',
    height: CARD_HEIGHT,
    marginBottom: SPACING.md,
  },
  flipContainer: {
    flex: 1,
    position: 'relative',
  },
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: 'hidden',
  },
  cardBase: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: RADIUS.lg + 2,
    padding: 13,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  lockedCard: {
    borderColor: COLORS.lockedBorder,
    borderStyle: 'dashed',
  },
  lockedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  lockMicroBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 224, 180, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedName: {
    flex: 1,
    color: COLORS.lockedText,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    minHeight: 34,
  },
  silhouetteCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedCrestRing: {
    width: 102,
    height: 102,
    borderRadius: 51,
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 180, 0.12)',
    backgroundColor: 'rgba(8, 6, 4, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  lockedBadge: {
    backgroundColor: 'rgba(255, 224, 180, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  lockedBadgeText: {
    color: COLORS.lockedText,
    fontSize: 10,
    fontWeight: '700',
  },
  lockedStyleText: {
    color: COLORS.lockedText,
    fontSize: 10,
    fontWeight: '600',
    flexShrink: 1,
  },
  unlockedFront: {
    borderColor: COLORS.borderGold,
    borderWidth: 1.5,
  },
  unlockedBack: {
    borderColor: COLORS.copper,
    borderWidth: 1.5,
  },
  frontHeader: {
    gap: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  beerName: {
    flex: 1,
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 13.5,
    fontWeight: '800',
    lineHeight: 16.5,
    minHeight: 33,
  },
  flipHintBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(18, 12, 8, 0.88)',
    borderWidth: 1.5,
    borderColor: COLORS.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipHintText: {
    color: COLORS.amberBright,
    fontSize: 12.5,
    fontWeight: '900',
  },
  dateText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  photoBox: {
    width: '100%',
    height: 138,
    borderRadius: RADIUS.md + 2,
    backgroundColor: 'rgba(10, 8, 6, 0.86)',
    borderWidth: 1.5,
    borderColor: COLORS.borderGold,
    padding: 3,
  },
  photoFrameInner: {
    flex: 1,
    width: '100%',
    borderRadius: RADIUS.md - 1,
    overflow: 'hidden',
    backgroundColor: '#0B0907',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  zoomBtn: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(12, 9, 8, 0.82)',
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    ...WEB_GLASS,
  },
  frontFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  formatBadge: {
    backgroundColor: 'rgba(18, 12, 8, 0.72)',
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  formatBadgeText: {
    color: COLORS.amberBright,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  backHeader: {
    paddingBottom: 4,
  },
  backTitle: {
    flex: 1,
    color: COLORS.amberBright,
    fontFamily: FONTS.display,
    fontSize: 13.5,
    fontWeight: '800',
  },
  backHint: {
    color: COLORS.textMuted,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  codexDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  codexHairline: {
    flex: 1,
    height: 1,
    opacity: 0.48,
  },
  codexDiamond: {
    fontSize: 8.5,
    lineHeight: 10,
  },
  shortHistory: {
    color: '#F6E8CF',
    fontSize: 11.5,
    fontStyle: 'italic',
    lineHeight: 16,
    flex: 1,
    paddingVertical: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 5,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(10, 7, 5, 0.64)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderTopWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  statVal: {
    color: COLORS.amberBright,
    fontSize: 10.5,
    fontWeight: '800',
    marginTop: 1,
  },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 6, 4, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    ...WEB_GLASS,
  },
  zoomCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl + 2,
    borderWidth: 1.5,
    borderColor: COLORS.borderGold,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  zoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  zoomTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 19,
    fontWeight: '800',
  },
  zoomMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  zoomCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomImageBox: {
    width: '100%',
    height: 340,
    borderRadius: RADIUS.lg,
    backgroundColor: '#0A0807',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  zoomImage: {
    width: '100%',
    height: '100%',
  },
  zoomFooter: {
    alignItems: 'center',
  },
});
