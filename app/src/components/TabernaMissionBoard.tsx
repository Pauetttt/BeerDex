import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppThemeValue } from '../context/ThemeContext';
import { COLORS, FONTS, RADIUS, SPACING } from '../theme/tokens';
import { TabernaMissionDto } from '../types/api';

interface Props {
  mission: TabernaMissionDto;
  isMember: boolean;
  currentUserId?: string;
  theme: AppThemeValue;
}

export const TabernaMissionBoard = React.memo(function TabernaMissionBoard({
  mission,
  isMember,
  currentUserId,
  theme,
}: Props) {
  if (mission.gameType === 'bingo') {
    const cells = mission.config.cells || [];
    const marked = mission.progress.markedCells || {};
    const lines = mission.progress.completedLines || [];
    return (
      <View style={styles.gameBoard}>
        <View style={styles.bingoGrid}>
          {cells.map((cell) => {
            const mark = marked[String(cell.index)];
            const done = Boolean(mark);
            return (
              <View
                key={cell.index}
                style={[
                  styles.bingoCell,
                  done && {
                    backgroundColor: 'rgba(74, 222, 128, 0.14)',
                    borderColor: COLORS.successBorder,
                  },
                ]}
              >
                <View style={styles.bingoCellTop}>
                  <Text style={styles.bingoBrand} numberOfLines={1}>
                    {cell.brandName}
                  </Text>
                  {done ? (
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  ) : (
                    <View style={styles.bingoEmptyDot} />
                  )}
                </View>
                <Text style={styles.bingoBeerName} numberOfLines={2}>
                  {cell.beerName}
                </Text>
                <Text style={styles.bingoMeta} numberOfLines={1}>
                  {done ? `@${mark.username}` : `${cell.abv.toFixed(1)}° · ${cell.style}`}
                </Text>
              </View>
            );
          })}
        </View>
        {lines.length > 0 ? (
          <Text style={styles.lineNotice}>
            Líneas completadas: {lines.length} (+100 Ch. a los aportadores · +150 pts)
          </Text>
        ) : (
          <Text style={styles.hintText}>
            Línea (fila/col/diag): +100 Ch. y +150 pts · Cartón completo: +500 Ch. a todos y +500 pts.
          </Text>
        )}
      </View>
    );
  }

  if (mission.gameType === 'escalera') {
    const steps = mission.config.steps || [];
    const completedSteps = mission.progress.completedSteps || {};
    const currentIdx = mission.progress.currentStepIndex ?? 0;
    return (
      <View style={styles.gameBoard}>
        {steps.map((s) => {
          const done = completedSteps[s.key];
          const isCurrent = mission.status === 'active' && s.index === currentIdx;
          return (
            <View
              key={s.key}
              style={[
                styles.stepRow,
                done && {
                  backgroundColor: 'rgba(74, 222, 128, 0.12)',
                  borderColor: COLORS.successBorder,
                },
                isCurrent && {
                  borderColor: theme.bright,
                  backgroundColor: theme.tintBg,
                },
              ]}
            >
              <View style={styles.stepBadge}>
                <Text style={styles.stepNum}>{s.index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepLabel}>{s.label}</Text>
                <Text style={styles.stepSub}>
                  {done
                    ? `${done.beerName} (${done.abv.toFixed(1)}°) · @${done.username}`
                    : isCurrent
                    ? 'Peldaño activo ahora — escanea una cerveza de este tramo'
                    : 'Bloqueado hasta completar el peldaño anterior'}
                </Text>
              </View>
              <Ionicons
                name={
                  done
                    ? 'checkmark-circle'
                    : isCurrent
                    ? 'arrow-forward-circle'
                    : 'lock-closed-outline'
                }
                size={20}
                color={
                  done
                    ? COLORS.success
                    : isCurrent
                    ? theme.bright
                    : COLORS.textMuted
                }
              />
            </View>
          );
        })}
      </View>
    );
  }

  if (mission.gameType === 'ruta') {
    const countries = mission.config.countries || [];
    const doneMap = mission.progress.completedCountries || {};
    return (
      <View style={styles.gameBoard}>
        <View style={styles.countryGrid}>
          {countries.map((c) => {
            const done = doneMap[c.key];
            return (
              <View
                key={c.key}
                style={[
                  styles.countryChip,
                  done && {
                    backgroundColor: 'rgba(74, 222, 128, 0.14)',
                    borderColor: COLORS.successBorder,
                  },
                ]}
              >
                <View style={styles.countryTop}>
                  <Text style={styles.countryName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Ionicons
                    name={done ? 'checkmark-circle' : 'airplane-outline'}
                    size={15}
                    color={done ? COLORS.success : COLORS.textMuted}
                  />
                </View>
                <Text style={styles.countryMeta} numberOfLines={1}>
                  {done ? `${done.beerName} (@${done.username})` : 'Pendiente'}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.hintText}>
          50 % de países: +150 Ch. · 100 %: +400 Ch. a todos y +350 pts.
        </Text>
      </View>
    );
  }

  if (mission.gameType === 'tridente') {
    const challenges = mission.config.challenges || [];
    const myProg = currentUserId ? mission.progress.memberProgress?.[currentUserId] : undefined;
    const myDoneSet = new Set(myProg?.completedChallengeIds || []);
    return (
      <View style={styles.gameBoard}>
        {isMember ? (
          <Text style={[styles.subSectionTitle, { color: theme.bright }]}>
            Tus 3 retos personales ({myDoneSet.size}/{challenges.length})
          </Text>
        ) : null}
        {challenges.map((ch) => {
          const done = myDoneSet.has(ch.id);
          const doneInfo = myProg?.beersByChallenge?.[ch.id];
          return (
            <View
              key={ch.id}
              style={[
                styles.stepRow,
                done && {
                  backgroundColor: 'rgba(74, 222, 128, 0.12)',
                  borderColor: COLORS.successBorder,
                },
              ]}
            >
              <Ionicons
                name={done ? 'checkmark-circle' : 'ellipse-outline'}
                size={21}
                color={done ? COLORS.success : theme.bright}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.stepLabel}>{ch.title}</Text>
                <Text style={styles.stepSub}>
                  {done && doneInfo
                    ? `Completado con ${doneInfo.beerName}`
                    : ch.description}
                </Text>
              </View>
            </View>
          );
        })}
        <Text style={styles.hintText}>
          Miembros con Tridente completo: {mission.completedCount}/{mission.totalTarget}. Mitad: +150 Ch. · Todos: +400 Ch. y +350 pts.
        </Text>
      </View>
    );
  }

  // cata
  const lbEntries = Object.entries(mission.progress.leaderboard || {}).sort(
    (a, b) => b[1].count - a[1].count
  );
  return (
    <View style={styles.gameBoard}>
      <View style={[styles.cataTargetBanner, { borderColor: theme.border, backgroundColor: theme.tintBg }]}>
        <Ionicons name="wine-outline" size={20} color={theme.bright} />
        <Text style={[styles.cataTargetText, { color: theme.bright }]}>
          Estilo sorteado: {mission.config.style} · Meta conjunta: {mission.completedCount}/{mission.totalTarget}
        </Text>
      </View>
      {lbEntries.length === 0 ? (
        <Text style={styles.hintText}>
          Aún nadie ha aportado cervezas de estilo {mission.config.style}. ¡Sé el primero!
        </Text>
      ) : (
        <View style={styles.cataList}>
          {lbEntries.map(([uid, entry], idx) => (
            <View key={uid} style={styles.cataRow}>
              <Text style={styles.cataRank}>
                {idx === 0 ? '👑 #1' : `#${idx + 1}`}
              </Text>
              <Text style={styles.cataUser}>{entry.username}</Text>
              <Text style={[styles.cataCount, { color: theme.bright }]}>
                {entry.count} {entry.count === 1 ? 'cerveza' : 'cervezas'}
              </Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.hintText}>
        Al cumplir la meta: +400 Ch. a todos con ≥1 aportación y +350 pts · Top 1 individual: +200 Ch. extra.
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  gameBoard: {
    gap: SPACING.sm,
  },
  bingoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  bingoCell: {
    width: '31.5%',
    minHeight: 88,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 8,
    justifyContent: 'space-between',
    gap: 4,
  },
  bingoCellTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  bingoBrand: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },
  bingoEmptyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.textMuted,
  },
  bingoBeerName: {
    color: COLORS.text,
    fontSize: 11.5,
    fontWeight: '800',
    lineHeight: 14,
  },
  bingoMeta: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  lineNotice: {
    color: COLORS.amberBright,
    fontSize: 12,
    fontWeight: '800',
  },
  hintText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    color: COLORS.amberBright,
    fontFamily: FONTS.display,
    fontWeight: '900',
    fontSize: 13,
  },
  stepLabel: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 14,
  },
  stepSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  countryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  countryChip: {
    width: '48.5%',
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: 3,
  },
  countryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countryName: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 13.5,
    flex: 1,
  },
  countryMeta: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
  },
  subSectionTitle: {
    fontFamily: FONTS.display,
    fontSize: 14,
    fontWeight: '900',
  },
  cataTargetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  cataTargetText: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 14,
    fontWeight: '900',
  },
  cataList: {
    gap: 6,
  },
  cataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.elevated,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  cataRank: {
    color: COLORS.amberBright,
    fontFamily: FONTS.display,
    fontWeight: '900',
    fontSize: 13,
    width: 48,
  },
  cataUser: {
    flex: 1,
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 13.5,
  },
  cataCount: {
    fontFamily: FONTS.display,
    fontWeight: '900',
    fontSize: 13,
  },
});
