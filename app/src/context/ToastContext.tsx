import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChapaCoinIcon } from '../components/ChapaCoinIcon';
import {
  COLORS,
  FONTS,
  GRADIENTS,
  RADIUS,
  SHADOWS,
  SPACING,
  WEB_GLASS,
} from '../theme/tokens';
import { NewlyUnlockedItem } from '../types/api';

interface ChapasToastData {
  title: string;
  subtitle: string;
  chapasEarned: number;
}

interface ToastContextValue {
  showAchievements: (items: NewlyUnlockedItem[] | undefined) => void;
  showChapasToast: (data: ChapasToastData) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<NewlyUnlockedItem[]>([]);
  const [chapasBanner, setChapasBanner] = useState<ChapasToastData | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideNow = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setQueue([]);
      setChapasBanner(null);
    });
  }, [opacity]);

  const animateIn = useCallback(
    (durationMs = 4500) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }).start();
      timerRef.current = setTimeout(hideNow, durationMs);
    },
    [hideNow, opacity]
  );

  const showAchievements = useCallback(
    (items: NewlyUnlockedItem[] | undefined) => {
      if (!items || items.length === 0) return;
      setChapasBanner(null);
      setQueue(items);
      animateIn(5000);
    },
    [animateIn]
  );

  const showChapasToast = useCallback(
    (data: ChapasToastData) => {
      setQueue([]);
      setChapasBanner(data);
      animateIn(4200);
    },
    [animateIn]
  );

  const first = queue[0];
  const extraCount = queue.length > 1 ? queue.length - 1 : 0;

  const formatRewardLine = (item: NewlyUnlockedItem): string => {
    const parts: string[] = [];
    if (item.rewardChapas && item.rewardChapas > 0) {
      parts.push(`+${item.rewardChapas} Chapas`);
    }
    if (item.rewardTitle) {
      parts.push(`Título: "${item.rewardTitle.name}"`);
    }
    if (item.rewardIcon) {
      parts.push(`Icono: ${item.rewardIcon.name}`);
    }
    if (item.rewardCosmetic) {
      parts.push(item.rewardCosmetic.name);
    }
    return parts.length > 0 ? parts.join(' · ') : item.description;
  };

  return (
    <ToastContext.Provider value={{ showAchievements, showChapasToast }}>
      {children}
      {first ? (
        <Animated.View
          style={[
            styles.container,
            { top: Math.max(insets.top + 8, 16), opacity },
          ]}
        >
          <Pressable onPress={hideNow} style={[styles.banner, SHADOWS.amberGlow]}>
            <LinearGradient colors={GRADIENTS.amberBtn} style={styles.badge}>
              <Ionicons name="trophy" size={14} color={COLORS.bg} />
              <Text style={styles.badgeText}>LOGRO</Text>
            </LinearGradient>
            <View style={styles.textCol}>
              <Text style={styles.title} numberOfLines={1}>
                {first.name}
                {extraCount > 0 ? ` (+${extraCount} más)` : ''}
              </Text>
              <Text style={styles.sub} numberOfLines={2}>
                {formatRewardLine(first)}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      ) : chapasBanner ? (
        <Animated.View
          style={[
            styles.container,
            { top: Math.max(insets.top + 8, 16), opacity },
          ]}
        >
          <Pressable onPress={hideNow} style={[styles.banner, SHADOWS.amberGlow]}>
            <LinearGradient colors={GRADIENTS.amberBtn} style={styles.badge}>
              <ChapaCoinIcon size={16} />
              <Text style={styles.badgeText}>+{chapasBanner.chapasEarned}</Text>
            </LinearGradient>
            <View style={styles.textCol}>
              <Text style={styles.title} numberOfLines={1}>
                {chapasBanner.title}
              </Text>
              <Text style={styles.sub} numberOfLines={2}>
                {chapasBanner.subtitle}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useAchievementToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useAchievementToast debe usarse dentro de ToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 9999,
    alignItems: 'center',
  },
  banner: {
    width: '100%',
    maxWidth: 460,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 20, 14, 0.96)',
    borderColor: COLORS.gold,
    borderWidth: 1.5,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    gap: SPACING.md,
    ...WEB_GLASS,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  badgeText: {
    color: COLORS.bg,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  textCol: {
    flex: 1,
  },
  title: {
    color: COLORS.amberBright,
    fontFamily: FONTS.display,
    fontWeight: '900',
    fontSize: 15.5,
  },
  sub: {
    color: COLORS.text,
    fontSize: 13,
    marginTop: 2,
  },
});
