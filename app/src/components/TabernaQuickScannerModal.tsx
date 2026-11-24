import { Ionicons } from '@expo/vector-icons';
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChapaCoinIcon } from './ChapaCoinIcon';
import { WebBarcodeScanner } from './WebBarcodeScanner';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { useAchievementToast } from '../context/ToastContext';
import { ApiError, tabernasApi } from '../services/api';
import {
  COLORS,
  FONTS,
  FORMAT_LABELS,
  GRADIENTS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../theme/tokens';
import {
  BarcodeLookupBeerItem,
  TabernaMissionDto,
  TabernaScanResponse,
} from '../types/api';

interface Props {
  visible: boolean;
  tabernaId: string;
  tabernaName: string;
  mission: TabernaMissionDto | null;
  onClose: () => void;
  onMissionUpdated: (mission: TabernaMissionDto, tabernaStats?: { level: number; points: number }) => void;
}

type ModalStep = 'scan' | 'validating' | 'variety_confirm' | 'result' | 'error';

function describeMissionGoal(mission: TabernaMissionDto | null): string {
  if (!mission) return 'Escanea una cerveza válida para aportar a la misión del mes.';
  switch (mission.gameType) {
    case 'bingo':
      return `Bingo 3×3: ${mission.completedCount}/${mission.totalTarget} casillas marcadas.`;
    case 'escalera': {
      const idx = mission.progress.currentStepIndex ?? 0;
      const stepLabel = mission.config.steps?.[idx]?.label;
      return stepLabel
        ? `Escalera del Grado: ahora toca ${stepLabel}.`
        : 'Escalera del Grado en progreso.';
    }
    case 'ruta':
      return `Ruta Internacional: ${mission.completedCount}/${mission.totalTarget} países completados.`;
    case 'tridente':
      return 'Tridente de la Peña: completa tus 3 retos personales.';
    case 'cata':
      return `Cata Temática (${mission.config.style ?? 'Estilo'}): ${mission.completedCount}/${mission.totalTarget}.`;
    default:
      return 'Escanea una cerveza para la misión del mes.';
  }
}

export function TabernaQuickScannerModal({
  visible,
  tabernaId,
  tabernaName,
  mission,
  onClose,
  onMissionUpdated,
}: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { refreshMe } = useAuth();
  const { showAchievements } = useAchievementToast();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const scanLockRef = useRef(false);

  const [step, setStep] = useState<ModalStep>('scan');
  const [torchOn, setTorchOn] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<TabernaScanResponse | null>(null);
  const [varietyOptions, setVarietyOptions] = useState<BarcodeLookupBeerItem[]>([]);
  const [varietySearch, setVarietySearch] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isAntiCheatError, setIsAntiCheatError] = useState(false);

  const resetScanner = useCallback(() => {
    scanLockRef.current = false;
    setStep('scan');
    setManualCode('');
    setScanResult(null);
    setVarietyOptions([]);
    setVarietySearch('');
    setErrorMessage('');
    setIsAntiCheatError(false);
  }, []);

  useEffect(() => {
    if (visible) {
      resetScanner();
    }
  }, [visible, resetScanner]);

  const handleScanResponse = useCallback(
    async (res: TabernaScanResponse) => {
      if (res.status === 'needs_variety_confirm') {
        setScanResult(res);
        setVarietyOptions(res.brandBeers || []);
        setStep('variety_confirm');
        return;
      }

      setScanResult(res);
      setStep('result');

      if (res.status === 'valid') {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        onMissionUpdated(res.mission, {
          level: res.taberna.level,
          points: res.taberna.points,
        });
        if (res.newlyUnlocked?.length) {
          showAchievements(res.newlyUnlocked);
        }
        if (res.chapasEarned > 0 || res.newlyUnlocked?.length) {
          await refreshMe();
        }
      }
    },
    [onMissionUpdated, refreshMe, showAchievements]
  );

  const submitScan = useCallback(
    async (payload: { code?: string; beerId?: number; frameBase64?: string }) => {
      if (payload.code !== undefined && !payload.code.trim()) return;
      scanLockRef.current = true;
      setStep('validating');
      setErrorMessage('');
      setIsAntiCheatError(false);

      try {
        const res = await tabernasApi.scan(tabernaId, payload);
        await handleScanResponse(res);
      } catch (err) {
        if (
          err instanceof ApiError &&
          err.status === 422 &&
          (err.data?.antiCheatBlocked || err.data?.es_pantalla)
        ) {
          setIsAntiCheatError(true);
        }
        setErrorMessage(
          err instanceof Error ? err.message : 'No se pudo validar el código de barras.'
        );
        setStep('error');
      }
    },
    [handleScanResponse, tabernaId]
  );

  const handleWebBarcodeDetected = useCallback(
    (code: string, capturedFrameBase64?: string) => {
      void submitScan({ code: code.trim(), frameBase64: capturedFrameBase64 });
    },
    [submitScan]
  );

  const handleNativeBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (scanLockRef.current || step !== 'scan' || !result?.data) return;
    scanLockRef.current = true;

    let capturedFrameBase64: string | undefined;
    try {
      const snap = await cameraRef.current?.takePictureAsync({
        quality: 0.5,
        base64: true,
      });
      if (snap?.base64) {
        capturedFrameBase64 = `data:image/jpeg;base64,${snap.base64}`;
      }
    } catch {
      // Continuar si el dispositivo no admite captura simultánea
    }
    void submitScan({ code: result.data.trim(), frameBase64: capturedFrameBase64 });
  };

  const renderResultView = () => {
    if (!scanResult) return null;
    const isValid = scanResult.status === 'valid';
    const isAlready =
      scanResult.status === 'already_contributed' ||
      scanResult.status === 'mission_completed';

    const statusColor = isValid
      ? COLORS.success
      : isAlready
      ? COLORS.amberBright
      : COLORS.danger;
    const statusIcon = isValid
      ? 'checkmark-circle'
      : isAlready
      ? 'information-circle'
      : 'close-circle';
    const statusTitle = isValid
      ? '¡Cerveza añadida al minijuego!'
      : scanResult.status === 'mission_completed'
      ? 'Misión completada'
      : isAlready
      ? 'Ya registrada'
      : 'No válida para esta misión';

    return (
      <View style={[styles.resultCard, { borderColor: statusColor }]}>
        <Ionicons name={statusIcon} size={54} color={statusColor} />
        <Text style={[styles.resultTitle, { color: statusColor }]}>{statusTitle}</Text>
        <Text style={styles.resultBeerName}>{scanResult.beer.name}</Text>
        <Text style={styles.resultBeerMeta}>
          {scanResult.beer.brandName} · {FORMAT_LABELS[scanResult.beer.format]} ·{' '}
          {scanResult.beer.abv.toFixed(1)}° · {scanResult.beer.style} ·{' '}
          {scanResult.beer.country}
        </Text>
        <Text style={styles.resultMessage}>{scanResult.message}</Text>

        {isValid && scanResult.milestonesReached.length > 0 ? (
          <View style={styles.milestonesBox}>
            {scanResult.milestonesReached.map((ms, idx) => (
              <View key={idx} style={styles.milestoneRow}>
                <Ionicons name="sparkles" size={15} color={COLORS.amberBright} />
                <Text style={styles.milestoneText}>{ms}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {isValid && (scanResult.chapasEarned > 0 || scanResult.pointsAwarded > 0) ? (
          <View style={styles.rewardsPills}>
            {scanResult.chapasEarned > 0 ? (
              <View
                style={[
                  styles.rewardPill,
                  { backgroundColor: theme.tintBg, borderColor: theme.border },
                ]}
              >
                <ChapaCoinIcon size={14} />
                <Text style={[styles.rewardPillText, { color: theme.bright }]}>
                  +{scanResult.chapasEarned} Chapas
                </Text>
              </View>
            ) : null}
            {scanResult.pointsAwarded > 0 ? (
              <View
                style={[
                  styles.rewardPill,
                  { backgroundColor: theme.tintBg, borderColor: theme.border },
                ]}
              >
                <Ionicons name="trophy-outline" size={14} color={theme.bright} />
                <Text style={[styles.rewardPillText, { color: theme.bright }]}>
                  +{scanResult.pointsAwarded} pts Taberna
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.resultActions}>
          <Pressable onPress={resetScanner} style={{ flex: 1 }}>
            <LinearGradient colors={theme.gradientBtn} style={styles.primaryBtn}>
              <Ionicons name="barcode-outline" size={18} color={COLORS.bg} />
              <Text style={styles.primaryBtnText}>Escanear otra</Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={onClose} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Volver a la Taberna</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={[styles.headerOuter, { paddingTop: Math.max(insets.top, 8) + 8 }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.bright} />
              <Text style={[styles.closeText, { color: theme.bright }]}>Cerrar</Text>
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Escanear · {tabernaName}
            </Text>
            <View style={{ width: 64 }} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.missionBanner, { borderColor: theme.border }]}>
            <Ionicons name="shield-half" size={20} color={theme.bright} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.missionBannerTitle, { color: theme.bright }]}>
                Escaneo rápido para la Taberna
              </Text>
              <Text style={styles.missionBannerSub}>
                {describeMissionGoal(mission)} Sin foto ni valoración.
              </Text>
            </View>
          </View>

          {step === 'scan' ? (
            <View style={styles.card}>
              {Platform.OS === 'web' ? (
                <WebBarcodeScanner
                  mode="barcode"
                  onBarcodeDetected={handleWebBarcodeDetected}
                />
              ) : !permission ? (
                <View style={styles.centerBox}>
                  <ActivityIndicator color={theme.primary} />
                </View>
              ) : !permission.granted ? (
                <View style={styles.centerBox}>
                  <Ionicons name="camera-outline" size={40} color={theme.primary} />
                  <Text style={styles.permText}>
                    Permite la cámara para escanear códigos de barras en tu Taberna.
                  </Text>
                  <Pressable onPress={requestPermission}>
                    <LinearGradient colors={theme.gradientBtn} style={styles.primaryBtn}>
                      <Text style={styles.primaryBtnText}>Permitir cámara</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.nativeCamBox}>
                  <CameraView
                    ref={cameraRef}
                    style={styles.nativeCam}
                    facing="back"
                    enableTorch={torchOn}
                    barcodeScannerSettings={{
                      barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
                    }}
                    onBarcodeScanned={handleNativeBarcodeScanned}
                  />
                  <Pressable
                    onPress={() => setTorchOn((v) => !v)}
                    style={[styles.torchBtn, torchOn && styles.torchBtnActive]}
                  >
                    <Ionicons
                      name={torchOn ? 'flashlight' : 'flashlight-outline'}
                      size={17}
                      color={torchOn ? COLORS.bg : COLORS.text}
                    />
                    <Text
                      style={[
                        styles.torchText,
                        torchOn && { color: COLORS.bg },
                      ]}
                    >
                      Linterna
                    </Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.manualBox}>
                <Text style={styles.manualLabel}>
                  ¿Prefieres introducir el código manualmente?
                </Text>
                <View style={styles.manualRow}>
                  <TextInput
                    value={manualCode}
                    onChangeText={setManualCode}
                    placeholder="Ej: 8410521001011"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                    maxLength={14}
                    onSubmitEditing={() => void submitScan({ code: manualCode })}
                    style={styles.manualInput}
                  />
                  <Pressable onPress={() => void submitScan({ code: manualCode })}>
                    <LinearGradient colors={theme.gradientBtn} style={styles.manualBtn}>
                      <Text style={styles.manualBtnText}>Validar</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}

          {step === 'validating' ? (
            <View style={styles.statusCard}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={styles.statusTitle}>Comprobando cerveza en la misión...</Text>
              <Text style={styles.statusSub}>
                Verificando catálogo y reglas de {mission?.title ?? 'la Taberna'}.
              </Text>
            </View>
          ) : null}

          {step === 'variety_confirm' ? (
            <View style={styles.card}>
              <Text style={styles.varietyTitle}>
                Marca detectada: {scanResult?.beer.brandName}
              </Text>
              <Text style={styles.statusSub}>
                Toca la variedad exacta que estás escaneando para registrarla en el minijuego:
              </Text>
              {varietyOptions.length > 8 ? (
                <TextInput
                  value={varietySearch}
                  onChangeText={setVarietySearch}
                  placeholder="Filtrar variedad..."
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.manualInput}
                />
              ) : null}
              <View style={styles.varietyList}>
                {varietyOptions
                  .filter((b) =>
                    !varietySearch.trim()
                      ? true
                      : b.name.toLowerCase().includes(varietySearch.trim().toLowerCase())
                  )
                  .map((b) => (
                    <Pressable
                      key={b.id}
                      onPress={() => void submitScan({ beerId: b.id })}
                      style={styles.varietyRow}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.varietyName}>{b.name}</Text>
                        <Text style={styles.varietyMeta}>
                          {FORMAT_LABELS[b.format]} · {b.abv.toFixed(1)}° · {b.style} · {b.country}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.bright} />
                    </Pressable>
                  ))}
              </View>
              <Pressable onPress={resetScanner} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Cancelar y volver a escanear</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 'result' ? renderResultView() : null}

          {step === 'error' ? (
            <View
              style={[
                styles.resultCard,
                { borderColor: isAntiCheatError ? COLORS.danger : COLORS.borderStrong },
              ]}
            >
              <Ionicons
                name={isAntiCheatError ? 'warning' : 'alert-circle'}
                size={50}
                color={COLORS.danger}
              />
              <Text style={[styles.resultTitle, { color: COLORS.danger }]}>
                {isAntiCheatError ? '¡Aviso antitrampas!' : 'No se pudo completar'}
              </Text>
              <Text style={styles.resultMessage}>{errorMessage}</Text>
              <View style={styles.resultActions}>
                <Pressable onPress={resetScanner} style={{ flex: 1 }}>
                  <LinearGradient colors={theme.gradientBtn} style={styles.primaryBtn}>
                    <Ionicons name="scan-outline" size={18} color={COLORS.bg} />
                    <Text style={styles.primaryBtnText}>Escanear otra</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable onPress={onClose} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Volver a la Taberna</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
  },
  headerOuter: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    maxWidth: 740,
    width: '100%',
    alignSelf: 'center',
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 64,
  },
  closeText: {
    fontWeight: '800',
    fontSize: 13.5,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 16.5,
    fontWeight: '900',
  },
  content: {
    padding: SPACING.lg,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  missionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  missionBannerTitle: {
    fontFamily: FONTS.display,
    fontSize: 14,
    fontWeight: '900',
  },
  missionBannerSub: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  centerBox: {
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  permText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontSize: 13.5,
  },
  nativeCamBox: {
    height: 300,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  nativeCam: {
    flex: 1,
  },
  torchBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(12, 9, 8, 0.78)',
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  torchBtnActive: {
    backgroundColor: COLORS.amberBright,
    borderColor: COLORS.amberBright,
  },
  torchText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  manualBox: {
    gap: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  manualLabel: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  manualRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  manualInput: {
    flex: 1,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14.5,
  },
  manualBtn: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 11,
  },
  manualBtnText: {
    color: COLORS.bg,
    fontFamily: FONTS.display,
    fontWeight: '900',
    fontSize: 13.5,
  },
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  statusTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  statusSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  varietyTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: '900',
  },
  varietyList: {
    gap: SPACING.xs,
  },
  varietyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  varietyName: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 14,
  },
  varietyMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  resultTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  resultBeerName: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  resultBeerMeta: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    textAlign: 'center',
  },
  resultMessage: {
    color: COLORS.text,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  milestonesBox: {
    width: '100%',
    backgroundColor: 'rgba(236, 161, 42, 0.12)',
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 6,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  milestoneText: {
    flex: 1,
    color: COLORS.amberBright,
    fontWeight: '800',
    fontSize: 13,
  },
  rewardsPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  rewardPillText: {
    fontFamily: FONTS.display,
    fontSize: 13,
    fontWeight: '900',
  },
  resultActions: {
    width: '100%',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  primaryBtn: {
    borderRadius: RADIUS.lg,
    paddingVertical: 13,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: COLORS.bg,
    fontFamily: FONTS.display,
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryBtn: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.elevated,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 14,
  },
});
