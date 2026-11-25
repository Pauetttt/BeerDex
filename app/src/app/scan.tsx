import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Redirect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StarRating } from '../components/StarRating';
import { WebBarcodeScanner } from '../components/WebBarcodeScanner';
import { useAppAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { useAchievementToast } from '../context/ToastContext';
import { ApiError, beerdexApi } from '../services/api';
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
import {
  BarcodeLookupBeerItem,
  BarcodeLookupResponse,
  BeerFormat,
} from '../types/api';
import { compressBeerPhoto } from '../utils/imageCompress';

type ScanStep =
  | 'scan'
  | 'validating'
  | 'anti_cheat'
  | 'barcode_error'
  | 'photo'
  | 'preview';

interface AntiCheatBlockInfo {
  message: string;
  motivo?: string;
  tipoDetectado?: string;
  previewUri?: string;
}

function VerifyingBeerAnimation({ verifyingWithAi }: { verifyingWithAi: boolean }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 920, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);

  const outerRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.2 }],
    opacity: 0.72 - pulse.value * 0.42,
  }));

  return (
    <View style={styles.statusCard}>
      <View style={styles.verifyPulseWrap}>
        <Animated.View style={[styles.verifyPulseRing, outerRingStyle]} />
        <View style={styles.verifyPulseCore}>
          <Ionicons
            name={verifyingWithAi ? 'shield-checkmark' : 'barcode-outline'}
            size={30}
            color={COLORS.amberBright}
          />
        </View>
      </View>
      <ActivityIndicator size="small" color={COLORS.amber} />
      <Text style={styles.statusTitle}>Verificando cerveza...</Text>
      <Text style={styles.verifySub}>
        {verifyingWithAi
          ? 'Comprobando que es un envase real (no pantalla ni papel) y validando en BeerDex...'
          : 'Buscando código de barras en el catálogo oficial de BeerDex...'}
      </Text>
    </View>
  );
}

export default function ScanRegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading, refreshMe } = useAuth();
  const { showAlert } = useAppAlert();
  const { showAchievements, showChapasToast } = useAchievementToast();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const scanLockRef = useRef(false);

  const [step, setStep] = useState<ScanStep>('scan');
  const [torchOn, setTorchOn] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [scannedViaPack, setScannedViaPack] = useState(false);
  const [barcodeNotFound, setBarcodeNotFound] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string>('');
  const [validatedBeer, setValidatedBeer] = useState<
    BarcodeLookupResponse['beer'] | null
  >(null);
  const [brandBeersList, setBrandBeersList] = useState<BarcodeLookupBeerItem[]>([]);
  const [needsVarietyConfirm, setNeedsVarietyConfirm] = useState(false);
  const [showVarietyPicker, setShowVarietyPicker] = useState(false);
  const [varietySearch, setVarietySearch] = useState('');
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [scanVerificationToken, setScanVerificationToken] = useState<string | null>(null);
  const [verifyingWithAi, setVerifyingWithAi] = useState(false);
  const [antiCheatInfo, setAntiCheatInfo] = useState<AntiCheatBlockInfo | null>(null);

  // Estado para sugerir cerveza cuando el EAN devuelve 404
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [sugBrand, setSugBrand] = useState('');
  const [sugName, setSugName] = useState('');
  const [sugFormat, setSugFormat] = useState<BeerFormat>('botellin');
  const [sugNotes, setSugNotes] = useState('');
  const [sugSubmitting, setSugSubmitting] = useState(false);
  const [sugSent, setSugSent] = useState(false);

  if (!authLoading && !user) {
    return <Redirect href="/auth/login" />;
  }

  const triggerAntiCheatBlock = useCallback(
    (err: ApiError, previewUri?: string) => {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
      setAntiCheatInfo({
        message: err.message,
        motivo: typeof err.data?.motivo === 'string' ? err.data.motivo : undefined,
        tipoDetectado:
          typeof err.data?.tipo_detectado === 'string'
            ? err.data.tipo_detectado
            : undefined,
        previewUri,
      });
      setStep('anti_cheat');
    },
    []
  );

  const validateCode = useCallback(
    async (rawCode: string, fromCamera = false, capturedFrameBase64?: string) => {
      const clean = rawCode.trim();
      if (!clean) return;
      scanLockRef.current = true;
      setLastScannedCode(clean);
      setBarcodeNotFound(false);
      setShowSuggestForm(false);
      setSugSent(false);
      setVarietySearch('');
      setScanVerificationToken(null);
      setAntiCheatInfo(null);
      setVerifyingWithAi(Boolean(capturedFrameBase64));
      setStep('validating');
      setBarcodeError('');

      if (fromCamera && Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      try {
        const res = capturedFrameBase64
          ? await beerdexApi.verifyScan({
              code: clean,
              frameBase64: capturedFrameBase64,
            })
          : await beerdexApi.lookupBarcode(clean);

        setValidatedBeer(res.beer);
        setBrandBeersList(res.brandBeers || []);
        setScannedViaPack(Boolean(res.isPack));
        setScanVerificationToken(res.scanVerificationToken ?? null);
        const shouldConfirm = Boolean(res.needsVarietyConfirm);
        setNeedsVarietyConfirm(shouldConfirm);
        setShowVarietyPicker(shouldConfirm);
        setStep('photo');
      } catch (err) {
        if (
          err instanceof ApiError &&
          err.status === 422 &&
          (err.data?.antiCheatBlocked || err.data?.es_pantalla)
        ) {
          triggerAntiCheatBlock(err, capturedFrameBase64);
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setBarcodeNotFound(true);
        }
        setBarcodeError(
          err instanceof Error
            ? err.message
            : 'No pudimos validar el código de barras.'
        );
        setStep('barcode_error');
      } finally {
        setVerifyingWithAi(false);
      }
    },
    [triggerAntiCheatBlock]
  );

  const handleWebBarcodeDetected = useCallback(
    (code: string, capturedFrameBase64?: string) => {
      void validateCode(code, true, capturedFrameBase64);
    },
    [validateCode]
  );

  const handleWebPhotoCaptured = useCallback((uri: string) => {
    setCapturedPhotoUri(uri);
    setStep('preview');
  }, []);

  const handleNativeBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (scanLockRef.current || step !== 'scan') return;
    if (!result?.data) return;

    scanLockRef.current = true;
    let capturedFrameBase64: string | undefined;
    try {
      const snap = await cameraRef.current?.takePictureAsync({
        quality: 0.55,
        base64: true,
      });
      if (snap?.base64) {
        capturedFrameBase64 = `data:image/jpeg;base64,${snap.base64}`;
      }
    } catch {
      // Continuar de forma segura si un dispositivo no permite captura simultánea
    }
    void validateCode(result.data, true, capturedFrameBase64);
  };

  const handleNativeTakePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const pic = await cameraRef.current.takePictureAsync({
        quality: 0.85,
      });
      if (pic?.uri) {
        setCapturedPhotoUri(pic.uri);
        setStep('preview');
      }
    } catch {
      showAlert('Error de cámara', 'No se pudo capturar la foto. Inténtalo de nuevo.');
    }
  };

  const handleResetToScan = () => {
    scanLockRef.current = false;
    setValidatedBeer(null);
    setBrandBeersList([]);
    setScannedViaPack(false);
    setNeedsVarietyConfirm(false);
    setShowVarietyPicker(false);
    setVarietySearch('');
    setCapturedPhotoUri(null);
    setRating(0);
    setBarcodeError('');
    setBarcodeNotFound(false);
    setScanVerificationToken(null);
    setVerifyingWithAi(false);
    setAntiCheatInfo(null);
    setShowSuggestForm(false);
    setSugSent(false);
    setStep('scan');
  };

  const handleSubmitSuggestion = async () => {
    if (!sugBrand.trim() || !sugName.trim()) {
      showAlert('Faltan datos', 'Indica la marca y el nombre de la cerveza.');
      return;
    }
    setSugSubmitting(true);
    try {
      const res = await beerdexApi.createSuggestion({
        barcode: lastScannedCode,
        brandName: sugBrand.trim(),
        beerName: sugName.trim(),
        format: sugFormat,
        notes: sugNotes.trim() || undefined,
      });
      setSugSent(true);
      setShowSuggestForm(false);
      setSugBrand('');
      setSugName('');
      setSugNotes('');
      if (res.newlyUnlocked?.length) {
        showAchievements(res.newlyUnlocked);
        await refreshMe();
      }
      showAlert(
        '¡Sugerencia enviada!',
        'Hemos guardado el código EAN y tu propuesta para añadirla al catálogo.'
      );
    } catch (err) {
      showAlert(
        'No se pudo enviar',
        err instanceof Error ? err.message : 'Error al enviar la sugerencia.'
      );
    } finally {
      setSugSubmitting(false);
    }
  };

  const handleRegisterBeer = async () => {
    if (!validatedBeer || !capturedPhotoUri) return;
    if (rating < 1 || rating > 5) {
      showAlert(
        'Valoración obligatoria',
        'Selecciona de 1 a 5 estrellas antes de registrar tu cerveza.'
      );
      return;
    }

    setSubmitting(true);
    try {
      // Compresión obligatoria: ancho máx 600px, JPEG calidad 0.7
      const compressed = await compressBeerPhoto(capturedPhotoUri);

      const res = await beerdexApi.registerBeer({
        beerId: validatedBeer.id,
        rating,
        photoBase64: compressed.base64,
        photoUri: compressed.uri,
        scannedViaPack,
        scanVerificationToken: scanVerificationToken ?? undefined,
      });

      const earnedTotal = res.chapasEarned ?? 10;
      const parts = ['+10 Chapas por registro'];
      if (res.completedBrandBonus && res.completedBrandBonus > 0) {
        parts.push(`+${res.completedBrandBonus} ¡Marca completada!`);
      }
      if (res.relicBonusChapas && res.relicBonusChapas > 0) {
        parts.push(`+${res.relicBonusChapas} por reliquias`);
      }
      if (res.achievementChapas && res.achievementChapas > 0) {
        parts.push(`+${res.achievementChapas} por logros`);
      }
      if (res.tabernaUpdates?.length) {
        const names = res.tabernaUpdates.map((t) => t.tabernaName).join(', ');
        parts.push(`Aportada a Taberna: ${names}`);
      }
      if (res.communityRating) {
        parts.push(
          `Media global: ★ ${res.communityRating.average.toFixed(1).replace('.', ',')} (${res.communityRating.count})`
        );
      }

      if (res.newlyUnlocked?.length) {
        showAchievements(res.newlyUnlocked);
      } else {
        showChapasToast({
          title: `¡${validatedBeer.name} registrada!`,
          subtitle: parts.join(' · '),
          chapasEarned: earnedTotal,
        });
      }
      await refreshMe();
      router.replace('/(tabs)/beerdex');
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 422 &&
        (err.data?.antiCheatBlocked || err.data?.es_pantalla)
      ) {
        triggerAntiCheatBlock(err, capturedPhotoUri);
        return;
      }
      showAlert(
        'Error al registrar',
        err instanceof Error ? err.message : 'No se pudo guardar tu cerveza.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderNativeCameraPermissionGate = () => {
    if (Platform.OS === 'web') return null;
    if (!permission) {
      return (
        <View style={styles.permissionBox}>
          <ActivityIndicator color={COLORS.amber} />
        </View>
      );
    }
    if (!permission.granted) {
      return (
        <View style={styles.permissionBox}>
          <Ionicons name="camera-outline" size={44} color={COLORS.amber} />
          <Text style={styles.permTitle}>Permiso de cámara necesario</Text>
          <Text style={styles.permBody}>
            Necesitamos la cámara para escanear el código de barras de tu cerveza y hacer tu foto personal.
          </Text>
          <Pressable onPress={requestPermission} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Permitir cámara</Text>
          </Pressable>
        </View>
      );
    }
    return null;
  };

  const nativePermissionGate = renderNativeCameraPermissionGate();

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.topHeaderOuter, { paddingTop: Math.max(insets.top, 8) + 8 }]}>
        <View style={styles.topHeader}>
          <Pressable
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/(tabs)/beerdex')
            }
            style={styles.backBtn}
          >
            <Ionicons name="close" size={22} color={COLORS.amberBright} />
            <Text style={styles.backText}>Cancelar</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Registrar Cerveza</Text>
          <View style={styles.backPlaceholder} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Indicador de pasos */}
        <View style={styles.stepsBar}>
          {[
            {
              id: 1,
              label: '1. Escáner',
              active:
                step === 'scan' ||
                step === 'validating' ||
                step === 'anti_cheat' ||
                step === 'barcode_error',
            },
            { id: 2, label: '2. Foto', active: step === 'photo' },
            { id: 3, label: '3. Valorar', active: step === 'preview' },
          ].map((s) => (
            <View
              key={s.id}
              style={[styles.stepChip, s.active && styles.stepChipActive]}
            >
              <Text style={[styles.stepText, s.active && styles.stepTextActive]}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {step === 'scan' ? (
          <View style={styles.card}>
            <Text style={styles.title}>Escanea el código de barras</Text>
            <Text style={styles.subtitle}>
              Escanea el envase individual (lata, botellín o litrona) o el código de barras de su pack/caja oficial (EAN-13, EAN-8 o UPC).
            </Text>

            {Platform.OS === 'web' ? (
              <WebBarcodeScanner
                mode="barcode"
                onBarcodeDetected={handleWebBarcodeDetected}
              />
            ) : nativePermissionGate ? (
              nativePermissionGate
            ) : (
              <View style={styles.nativeCamBox}>
                <CameraView
                  ref={cameraRef}
                  style={styles.nativeCamera}
                  facing="back"
                  enableTorch={torchOn}
                  barcodeScannerSettings={{
                    barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
                  }}
                  onBarcodeScanned={handleNativeBarcodeScanned}
                />
                <View style={styles.nativeAimOverlay} pointerEvents="none">
                  <View style={styles.aimBox} />
                </View>
                <Pressable
                  onPress={() => setTorchOn((v) => !v)}
                  style={[styles.torchBtn, torchOn && styles.torchBtnActive]}
                >
                  <Ionicons
                    name={torchOn ? 'flashlight' : 'flashlight-outline'}
                    size={18}
                    color={torchOn ? COLORS.bg : COLORS.text}
                  />
                  <Text
                    style={[
                      styles.torchText,
                      torchOn && styles.torchTextActive,
                    ]}
                  >
                    Linterna
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : null}

        {step === 'validating' ? (
          <VerifyingBeerAnimation verifyingWithAi={verifyingWithAi} />
        ) : null}

        {step === 'anti_cheat' && antiCheatInfo ? (
          <View style={styles.antiCheatCard}>
            <View style={styles.antiCheatBadge}>
              <Ionicons name="shield-half" size={16} color="#FCA5A5" />
              <Text style={styles.antiCheatBadgeText}>
                {antiCheatInfo.tipoDetectado === 'papel_plano'
                  ? 'FOLIO / PAPEL PLANO DETECTADO'
                  : 'PANTALLA DETECTADA'}
              </Text>
            </View>

            <Ionicons name="warning" size={50} color={COLORS.danger} />
            <Text style={styles.antiCheatTitle}>¡Aviso antitrampas!</Text>
            <Text style={styles.errorDetail}>{antiCheatInfo.message}</Text>

            {antiCheatInfo.previewUri ? (
              <View style={styles.antiCheatPreviewWrap}>
                <Image
                  source={{ uri: antiCheatInfo.previewUri }}
                  style={styles.antiCheatPreviewImg}
                  resizeMode="cover"
                />
                <View style={styles.antiCheatStamp}>
                  <Text style={styles.antiCheatStampText}>BLOQUEADO</Text>
                </View>
              </View>
            ) : null}

            {antiCheatInfo.motivo ? (
              <View style={styles.antiCheatMotivoBox}>
                <Text style={styles.antiCheatMotivoLabel}>DETALLE DE VERIFICACIÓN</Text>
                <Text style={styles.antiCheatMotivoText}>{antiCheatInfo.motivo}</Text>
              </View>
            ) : null}

            <Text style={styles.antiCheatAllowedNote}>
              Se aceptan botellas, latas, litronas, cajas o packs reales.
            </Text>

            <Pressable onPress={handleResetToScan} style={styles.primaryBtn}>
              <Ionicons name="scan-outline" size={18} color={COLORS.bg} />
              <Text style={styles.primaryBtnText}>Escanear una cerveza real</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 'barcode_error' ? (
          <View style={styles.statusCard}>
            <Ionicons name="alert-circle" size={52} color={COLORS.danger} />
            <Text style={styles.statusTitle}>No se puede registrar</Text>
            <Text style={styles.errorDetail}>{barcodeError}</Text>

            <Pressable onPress={handleResetToScan} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Volver a escanear</Text>
            </Pressable>

            {barcodeNotFound && !sugSent ? (
              <View style={styles.suggestSection}>
                {!showSuggestForm ? (
                  <Pressable
                    onPress={() => setShowSuggestForm(true)}
                    style={styles.suggestToggleBtn}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color={COLORS.amberBright}
                    />
                    <Text style={styles.suggestToggleText}>
                      Sugerir esta cerveza al catálogo ({lastScannedCode})
                    </Text>
                  </Pressable>
                ) : (
                  <View style={styles.suggestForm}>
                    <Text style={styles.suggestFormTitle}>
                      Sugerir código {lastScannedCode}
                    </Text>
                    <TextInput
                      value={sugBrand}
                      onChangeText={setSugBrand}
                      placeholder="Marca (ej: Estrella Galicia)"
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.suggestInput}
                    />
                    <TextInput
                      value={sugName}
                      onChangeText={setSugName}
                      placeholder="Nombre de la cerveza"
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.suggestInput}
                    />
                    <View style={styles.formatPickerRow}>
                      {(['botellin', 'lata', 'litrona'] as const).map((fmt) => {
                        const active = sugFormat === fmt;
                        return (
                          <Pressable
                            key={fmt}
                            onPress={() => setSugFormat(fmt)}
                            style={[
                              styles.formatChip,
                              active && styles.formatChipActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.formatChipText,
                                active && styles.formatChipTextActive,
                              ]}
                            >
                              {FORMAT_LABELS[fmt]}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <TextInput
                      value={sugNotes}
                      onChangeText={setSugNotes}
                      placeholder="Notas opcionales (estilo, % alcohol...)"
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.suggestInput}
                    />
                    <Pressable
                      onPress={handleSubmitSuggestion}
                      disabled={sugSubmitting}
                      style={[
                        styles.primaryBtn,
                        sugSubmitting && styles.btnDisabled,
                      ]}
                    >
                      {sugSubmitting ? (
                        <ActivityIndicator color={COLORS.bg} />
                      ) : (
                        <Text style={styles.primaryBtnText}>Enviar sugerencia</Text>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
            ) : sugSent ? (
              <View style={styles.sugSuccessBox}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={styles.sugSuccessText}>
                  Sugerencia registrada para {lastScannedCode}. ¡Gracias!
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {step === 'photo' && validatedBeer ? (
          <View style={styles.card}>
            <View style={styles.foundBanner}>
              <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.foundName}>{validatedBeer.name}</Text>
                <Text style={styles.foundMeta}>
                  {validatedBeer.brandName} · {FORMAT_LABELS[validatedBeer.format]} ·{' '}
                  {validatedBeer.abv.toFixed(1)}% · {validatedBeer.style}
                </Text>
              </View>
              {brandBeersList.length > 1 ? (
                <Pressable
                  onPress={() => setShowVarietyPicker((v) => !v)}
                  style={styles.switchVarietyBtn}
                >
                  <Ionicons
                    name={showVarietyPicker ? 'chevron-up' : 'swap-horizontal'}
                    size={15}
                    color={COLORS.amberBright}
                  />
                  <Text style={styles.switchVarietyBtnText}>
                    {showVarietyPicker ? 'Cerrar' : 'Cambiar'}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {showVarietyPicker && brandBeersList.length > 1 ? (() => {
              const hasMultipleBrands =
                new Set(brandBeersList.map((b) => b.brandName)).size > 1;
              const normQuery = varietySearch
                .trim()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
              const filteredBrandBeers = normQuery
                ? brandBeersList.filter((b) => {
                    const hay = `${b.name} ${b.brandName}`
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '');
                    return hay.includes(normQuery);
                  })
                : brandBeersList;
              return (
                <View style={styles.varietyPickerBox}>
                  <Text style={styles.varietyPickerTitle}>
                    {needsVarietyConfirm
                      ? `Confirma qué variedad o formato de ${validatedBeer.brandName} has escaneado:`
                      : `¿Es otra variedad o formato de ${validatedBeer.brandName}? Elígela aquí:`}
                  </Text>
                  {brandBeersList.length > 10 ? (
                    <TextInput
                      value={varietySearch}
                      onChangeText={setVarietySearch}
                      placeholder="Buscar variedad o marca..."
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.varietySearchInput}
                    />
                  ) : null}
                  <ScrollView
                    style={styles.varietyListScroll}
                    nestedScrollEnabled
                  >
                    {filteredBrandBeers.map((item) => {
                      const isSelected = item.id === validatedBeer.id;
                      const isRegistered = Boolean(item.alreadyRegistered);
                      return (
                        <Pressable
                          key={item.id}
                          disabled={isRegistered}
                          onPress={() => {
                            setValidatedBeer(item);
                            setNeedsVarietyConfirm(false);
                            setShowVarietyPicker(false);
                            setVarietySearch('');
                          }}
                          style={[
                            styles.varietyOptionRow,
                            isSelected && styles.varietyOptionRowSelected,
                            isRegistered && styles.varietyOptionRowDisabled,
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.varietyOptionName,
                                isSelected && styles.varietyOptionNameSelected,
                              ]}
                            >
                              {item.name}
                            </Text>
                            <Text style={styles.varietyOptionMeta}>
                              {hasMultipleBrands ? `${item.brandName} · ` : ''}
                              {FORMAT_LABELS[item.format]} · {item.style} ·{' '}
                              {item.abv.toFixed(1)}%
                            </Text>
                          </View>
                          {isRegistered ? (
                            <View style={styles.varietyRegisteredBadge}>
                              <Text style={styles.varietyRegisteredText}>Ya registrada</Text>
                            </View>
                          ) : isSelected ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color={COLORS.amberBright}
                            />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              );
            })() : null}

            <Text style={styles.title}>Haz tu foto personal</Text>
            <Text style={styles.subtitle}>
              Inmortaliza esta cerveza con una foto libre para tu carta de BeerDex.
            </Text>

            {Platform.OS === 'web' ? (
              <WebBarcodeScanner
                mode="photo"
                onPhotoCaptured={handleWebPhotoCaptured}
              />
            ) : nativePermissionGate ? (
              nativePermissionGate
            ) : (
              <>
                <View style={styles.nativeCamBox}>
                  <CameraView
                    ref={cameraRef}
                    style={styles.nativeCamera}
                    facing="back"
                    enableTorch={torchOn}
                  />
                  <Pressable
                    onPress={() => setTorchOn((v) => !v)}
                    style={[styles.torchBtn, torchOn && styles.torchBtnActive]}
                  >
                    <Ionicons
                      name={torchOn ? 'flashlight' : 'flashlight-outline'}
                      size={18}
                      color={torchOn ? COLORS.bg : COLORS.text}
                    />
                    <Text
                      style={[
                        styles.torchText,
                        torchOn && styles.torchTextActive,
                      ]}
                    >
                      Linterna
                    </Text>
                  </Pressable>
                </View>
                <Pressable onPress={handleNativeTakePhoto} style={styles.primaryBtn}>
                  <Ionicons name="camera" size={20} color={COLORS.bg} />
                  <Text style={styles.primaryBtnText}>Capturar foto</Text>
                </Pressable>
              </>
            )}

            <Pressable onPress={handleResetToScan} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Escanear otra cerveza</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 'preview' && validatedBeer && capturedPhotoUri ? (
          <View style={styles.card}>
            <Text style={styles.title}>Previsualización y valoración</Text>
            <Text style={styles.foundName}>{validatedBeer.name}</Text>

            <View style={styles.previewBox}>
              <Image
                source={{ uri: capturedPhotoUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            </View>

            <View style={styles.ratingBox}>
              <Text style={styles.ratingLabel}>
                Valora esta cerveza (obligatorio de 1 a 5 estrellas):
              </Text>
              <StarRating
                rating={rating}
                size={34}
                readonly={false}
                onChange={setRating}
              />
              <Text style={styles.ratingHint}>
                {rating > 0
                  ? `Has seleccionado ${rating} ${rating === 1 ? 'estrella' : 'estrellas'}`
                  : 'Pulsa las estrellas para puntuar'}
              </Text>
            </View>

            <Pressable
              onPress={handleRegisterBeer}
              disabled={submitting || rating === 0}
              style={{ width: '100%' }}
            >
              <LinearGradient
                colors={GRADIENTS.amberBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.primaryBtn,
                  SHADOWS.amberGlow,
                  (submitting || rating === 0) && styles.btnDisabled,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.bg} />
                ) : (
                  <Text style={styles.primaryBtnText}>Registrar en BeerDex</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => {
                setCapturedPhotoUri(null);
                setStep('photo');
              }}
              disabled={submitting}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>Repetir foto</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
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
    gap: 4,
    minWidth: 84,
  },
  backText: {
    color: COLORS.amberBright,
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: '800',
  },
  backPlaceholder: {
    minWidth: 84,
  },
  content: {
    padding: SPACING.lg,
    maxWidth: 580,
    width: '100%',
    alignSelf: 'center',
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  stepsBar: {
    flexDirection: 'row',
    backgroundColor: '#120E0C',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    padding: 4,
    gap: 4,
  },
  stepChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
  },
  stepChipActive: {
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
  },
  stepText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  stepTextActive: {
    color: COLORS.amberBright,
    fontWeight: '800',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl + 4,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.lg + 2,
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  title: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 21,
    fontWeight: '900',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  nativeCamBox: {
    width: '100%',
    height: 310,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.amber,
    position: 'relative',
  },
  nativeCamera: {
    flex: 1,
  },
  nativeAimOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aimBox: {
    width: 230,
    height: 115,
    borderWidth: 2,
    borderColor: COLORS.amberBright,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(229, 169, 60, 0.08)',
  },
  torchBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(18, 14, 11, 0.84)',
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  torchBtnActive: {
    backgroundColor: COLORS.amber,
    borderColor: COLORS.amberBright,
  },
  torchText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  torchTextActive: {
    color: COLORS.bg,
  },
  permissionBox: {
    padding: SPACING.xl,
    backgroundColor: COLORS.elevated,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    gap: SPACING.md,
  },
  permTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  permBody: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  statusTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  verifyPulseWrap: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  verifyPulseRing: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: COLORS.amberBright,
    backgroundColor: 'rgba(229, 169, 60, 0.14)',
  },
  verifyPulseCore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.elevated,
    borderWidth: 1.5,
    borderColor: COLORS.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifySub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 360,
  },
  antiCheatCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl + 2,
    borderWidth: 1.5,
    borderColor: COLORS.dangerBorder,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  antiCheatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  antiCheatBadgeText: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  antiCheatTitle: {
    color: '#FEE2E2',
    fontFamily: FONTS.display,
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  antiCheatPreviewWrap: {
    width: '100%',
    maxWidth: 260,
    height: 160,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.dangerBorder,
    position: 'relative',
    backgroundColor: '#0A0806',
  },
  antiCheatPreviewImg: {
    width: '100%',
    height: '100%',
    opacity: 0.78,
  },
  antiCheatStamp: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(185, 28, 28, 0.92)',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  antiCheatStampText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  antiCheatMotivoBox: {
    width: '100%',
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 4,
  },
  antiCheatMotivoLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  antiCheatMotivoText: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
  },
  antiCheatAllowedNote: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    textAlign: 'center',
  },
  errorDetail: {
    color: '#FFB4B0',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  suggestSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  suggestToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.amber,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
  },
  suggestToggleText: {
    color: COLORS.amberBright,
    fontSize: 13,
    fontWeight: '800',
  },
  suggestForm: {
    gap: SPACING.sm,
  },
  suggestFormTitle: {
    color: COLORS.amberBright,
    fontSize: 14,
    fontWeight: '800',
  },
  suggestInput: {
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  formatPickerRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  formatChip: {
    flex: 1,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 9,
    alignItems: 'center',
  },
  formatChipActive: {
    backgroundColor: COLORS.amberBg,
    borderColor: COLORS.amber,
  },
  formatChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  formatChipTextActive: {
    color: COLORS.amberBright,
  },
  sugSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: COLORS.success,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  sugSuccessText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  foundBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: COLORS.success,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  foundName: {
    color: COLORS.amberBright,
    fontSize: 16,
    fontWeight: '800',
  },
  foundMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  switchVarietyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(18, 14, 11, 0.72)',
    borderWidth: 1,
    borderColor: COLORS.amber,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  switchVarietyBtnText: {
    color: COLORS.amberBright,
    fontSize: 12,
    fontWeight: '800',
  },
  varietyPickerBox: {
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.amber,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  varietyPickerTitle: {
    color: COLORS.amberBright,
    fontSize: 13,
    fontWeight: '800',
  },
  varietySearchInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: COLORS.text,
    fontSize: 13,
  },
  varietyListScroll: {
    maxHeight: 240,
  },
  varietyOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginBottom: 6,
  },
  varietyOptionRowSelected: {
    borderColor: COLORS.amberBright,
    backgroundColor: COLORS.amberBg,
  },
  varietyOptionRowDisabled: {
    opacity: 0.45,
  },
  varietyOptionName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  varietyOptionNameSelected: {
    color: COLORS.amberBright,
    fontWeight: '900',
  },
  varietyOptionMeta: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  varietyRegisteredBadge: {
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  varietyRegisteredText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  previewBox: {
    width: '100%',
    height: 260,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.amber,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  ratingBox: {
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.elevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  ratingHint: {
    color: COLORS.amber,
    fontSize: 12,
    fontWeight: '600',
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: COLORS.amber,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    color: COLORS.bg,
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryBtn: {
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
});
