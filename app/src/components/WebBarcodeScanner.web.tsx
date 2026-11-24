import { Ionicons } from '@expo/vector-icons';
import type { MultiFormatReader } from '@zxing/library';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, GRADIENTS, RADIUS, SHADOWS, SPACING } from '../theme/tokens';
import type { WebBarcodeScannerProps } from './WebBarcodeScanner';

const EAN_REGEX = /^\d{8}$|^\d{12,14}$/;

type ZxingModule = typeof import('@zxing/library');
let zxingModulePromise: Promise<ZxingModule> | null = null;

function loadZxingModule(): Promise<ZxingModule> {
  if (!zxingModulePromise) {
    zxingModulePromise = import('@zxing/library');
  }
  return zxingModulePromise;
}

interface NativeBarcodeResult {
  rawValue?: string;
}

interface NativeBarcodeDetector {
  detect(source: CanvasImageSource): Promise<NativeBarcodeResult[]>;
}

type NativeBarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => NativeBarcodeDetector;

function createNativeEanDetector(): NativeBarcodeDetector | null {
  if (typeof window === 'undefined') return null;
  const Ctor = (
    window as unknown as { BarcodeDetector?: NativeBarcodeDetectorCtor }
  ).BarcodeDetector;
  if (!Ctor) return null;
  try {
    return new Ctor({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
  } catch {
    return null;
  }
}

function createEanReader(zxing: ZxingModule): MultiFormatReader {
  const hints = new Map<unknown, unknown>();
  hints.set(zxing.DecodeHintType.POSSIBLE_FORMATS, [
    zxing.BarcodeFormat.EAN_13,
    zxing.BarcodeFormat.EAN_8,
    zxing.BarcodeFormat.UPC_A,
    zxing.BarcodeFormat.UPC_E,
  ]);
  hints.set(zxing.DecodeHintType.TRY_HARDER, true);
  const reader = new zxing.MultiFormatReader();
  reader.setHints(hints as never);
  return reader;
}

function tryDecodeCanvas(
  canvas: HTMLCanvasElement,
  reader: MultiFormatReader,
  zxing: ZxingModule
): string | null {
  if (canvas.width < 32 || canvas.height < 32) return null;
  const source = new zxing.HTMLCanvasElementLuminanceSource(canvas);
  const attempts = [source, source.invert()];
  for (const luminance of attempts) {
    try {
      const bitmap = new zxing.BinaryBitmap(new zxing.HybridBinarizer(luminance));
      const result = reader.decodeWithState(bitmap);
      const raw = result?.getText().trim();
      if (raw && EAN_REGEX.test(raw)) {
        return raw;
      }
    } catch {
      // Frame sin código legible; no detener nunca el stream
    } finally {
      reader.reset();
    }
  }
  return null;
}

function playScanBeep(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(60);
    }
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(1280, now);
    osc.frequency.exponentialRampToValueAtTime(1680, now + 0.085);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
    osc.onended = () => {
      ctx.close().catch(() => {});
    };
  } catch {
    // Ignorar restricciones de audio del navegador
  }
}

function captureFullFrameBase64(
  src: HTMLVideoElement | HTMLImageElement,
  maxDim = 768,
  quality = 0.78
): string | undefined {
  try {
    const srcW = src instanceof HTMLVideoElement ? src.videoWidth : src.naturalWidth || src.width;
    const srcH = src instanceof HTMLVideoElement ? src.videoHeight : src.naturalHeight || src.height;
    if (!srcW || !srcH) return undefined;

    const longest = Math.max(srcW, srcH);
    const scale = longest > maxDim ? maxDim / longest : 1;
    const dw = Math.max(1, Math.round(srcW * scale));
    const dh = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    ctx.drawImage(src, 0, 0, srcW, srcH, 0, 0, dw, dh);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return undefined;
  }
}

function stopMediaStream(stream: MediaStream | null) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // Ignorar al liberar pistas
    }
  }
}

function getPermissionErrorMessage(mode: 'barcode' | 'photo'): string {
  if (mode === 'barcode') {
    return 'Permiso de cámara denegado. En iPhone: pulsa "aA" o el icono de ajustes en Safari → Ajustes del sitio web → Cámara → Permitir, o usa el botón de escanear con foto abajo.';
  }
  return 'Permiso de cámara denegado. En iPhone: revisa los ajustes de Safari para permitir la cámara o usa la cámara nativa del teléfono.';
}

async function acquireStreamWithFallbacks(
  mode: 'barcode' | 'photo',
  isAborted: () => boolean
): Promise<MediaStream> {
  const tiers: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: mode === 'barcode' ? 720 : 960 },
      },
      audio: false,
    },
    {
      video: { facingMode: 'environment' },
      audio: false,
    },
    {
      video: true,
      audio: false,
    },
  ];

  let lastError: unknown;
  for (let i = 0; i < tiers.length; i++) {
    if (isAborted()) {
      throw new Error('Cancelled');
    }
    try {
      return await navigator.mediaDevices.getUserMedia(tiers[i]);
    } catch (err) {
      lastError = err;
      const errName =
        err && typeof err === 'object' && 'name' in err
          ? String((err as { name?: string }).name)
          : '';
      if (
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errName === 'SecurityError'
      ) {
        throw err;
      }
      // Dar un breve respiro si iOS AVFoundation está terminando de liberar la cámara previa
      if ((errName === 'NotReadableError' || errName === 'AbortError') && i === 0) {
        await new Promise((r) => setTimeout(r, 320));
      }
    }
  }
  throw lastError ?? new Error('Unable to acquire camera stream');
}

function isVideoFrameReady(video: HTMLVideoElement): boolean {
  return (
    !video.paused &&
    !video.ended &&
    video.readyState >= 2 &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
  );
}

async function waitForVideoReady(
  video: HTMLVideoElement,
  stream: MediaStream,
  isAborted: () => boolean,
  onNeedTap: () => void
): Promise<void> {
  video.setAttribute('playsinline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  video.setAttribute('muted', 'true');
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.srcObject = stream;

  await video.play().catch(() => {});
  if (isAborted() || isVideoFrameReady(video)) return;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let tapPrompted = false;
    const startedAt = Date.now();

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onVideoEvent);
      video.removeEventListener('loadeddata', onVideoEvent);
      video.removeEventListener('canplay', onVideoEvent);
      video.removeEventListener('playing', onVideoEvent);
      clearInterval(pollId);
    };

    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    };

    const tryAdvance = () => {
      if (isAborted()) {
        finish();
        return;
      }
      const tracks = stream.getVideoTracks();
      if (tracks.length > 0 && tracks.every((t) => t.readyState === 'ended')) {
        finish(new Error('Camera track ended unexpectedly'));
        return;
      }
      if (isVideoFrameReady(video)) {
        finish();
        return;
      }
      if (video.paused) {
        video.play().catch(() => {});
      }
      const elapsed = Date.now() - startedAt;
      if (!tapPrompted && elapsed >= 2200 && video.paused) {
        tapPrompted = true;
        onNeedTap();
      }
      if (elapsed >= 12000 && !video.paused && video.videoWidth === 0) {
        finish(new Error('Camera video frame timeout'));
      }
    };

    const onVideoEvent = () => {
      tryAdvance();
    };

    video.addEventListener('loadedmetadata', onVideoEvent);
    video.addEventListener('loadeddata', onVideoEvent);
    video.addEventListener('canplay', onVideoEvent);
    video.addEventListener('playing', onVideoEvent);

    const pollId = setInterval(tryAdvance, 100);
    tryAdvance();
  });
}

function drawRegionToCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  src: HTMLVideoElement | HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  maxWidth: number,
  rotate90 = false
) {
  if (sw <= 0 || sh <= 0) return;
  const scale = sw > maxWidth ? maxWidth / sw : 1;
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));

  if (!rotate90) {
    canvas.width = dw;
    canvas.height = dh;
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, dw, dh);
    return;
  }

  canvas.width = dh;
  canvas.height = dw;
  ctx.save();
  ctx.translate(dh / 2, dw / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

export function WebBarcodeScanner({
  mode,
  onBarcodeDetected,
  onPhotoCaptured,
  onError,
}: WebBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeFileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef(0);
  const scannedRef = useRef(false);

  const onBarcodeDetectedRef = useRef(onBarcodeDetected);
  const onPhotoCapturedRef = useRef(onPhotoCaptured);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onBarcodeDetectedRef.current = onBarcodeDetected;
    onPhotoCapturedRef.current = onPhotoCaptured;
    onErrorRef.current = onError;
  }, [onBarcodeDetected, onPhotoCaptured, onError]);

  const [retryCount, setRetryCount] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [needsUserTapToPlay, setNeedsUserTapToPlay] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [photoDecoding, setPhotoDecoding] = useState(false);
  const [photoDecodeHint, setPhotoDecodeHint] = useState<string | null>(null);

  const releaseActiveStream = useCallback(() => {
    if (streamRef.current) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // Ignorar
      }
      videoRef.current.srcObject = null;
    }
  }, []);

  // 1) Adquirir cámara y esperar frames reales (sin depender de callbacks del padre)
  useEffect(() => {
    const mySession = ++sessionIdRef.current;
    let cancelled = false;
    scannedRef.current = false;

    setCameraError(null);
    setCameraReady(false);
    setNeedsUserTapToPlay(false);
    setTorchSupported(false);
    setTorchOn(false);
    setPhotoDecodeHint(null);

    const isAborted = () => cancelled || sessionIdRef.current !== mySession;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const msg = 'Tu navegador no permite acceso directo a la cámara.';
      setCameraError(msg);
      onErrorRef.current?.(msg);
      return () => {
        cancelled = true;
        releaseActiveStream();
      };
    }

    const startCamera = async () => {
      try {
        const stream = await acquireStreamWithFallbacks(mode, isAborted);
        if (isAborted()) {
          stopMediaStream(stream);
          return;
        }

        // Liberar cualquier stream previo solo de forma segura antes de asignar el nuevo
        if (streamRef.current && streamRef.current !== stream) {
          stopMediaStream(streamRef.current);
        }
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          stopMediaStream(stream);
          streamRef.current = null;
          return;
        }

        // Detectar soporte de linterna (torch) de forma segura en iOS/Chrome
        const videoTrack = stream.getVideoTracks()[0];
        try {
          const caps = videoTrack?.getCapabilities?.() as
            | (MediaTrackCapabilities & { torch?: boolean })
            | undefined;
          setTorchSupported(Boolean(caps && 'torch' in caps && caps.torch));
        } catch {
          setTorchSupported(false);
        }

        await waitForVideoReady(video, stream, isAborted, () => {
          if (!isAborted()) {
            setNeedsUserTapToPlay(true);
          }
        });

        if (isAborted()) {
          stopMediaStream(stream);
          if (streamRef.current === stream) {
            streamRef.current = null;
          }
          return;
        }

        setNeedsUserTapToPlay(false);
        setCameraReady(true);
      } catch (err) {
        if (isAborted()) return;
        const errName =
          err && typeof err === 'object' && 'name' in err
            ? String((err as { name?: string }).name)
            : '';
        const isDenied =
          errName === 'NotAllowedError' ||
          errName === 'PermissionDeniedError' ||
          errName === 'SecurityError';
        const msg = isDenied
          ? getPermissionErrorMessage(mode)
          : mode === 'barcode'
          ? 'No pudimos abrir la cámara en directo. Pulsa "Reiniciar cámara", usa escanear con foto o escribe el EAN abajo.'
          : 'No pudimos abrir la cámara en directo. Usa el botón de hacer foto con tu dispositivo.';
        setCameraError(msg);
        onErrorRef.current?.(msg);
      }
    };

    startCamera();

    const handleVisibilityChange = () => {
      if (isAborted() || scannedRef.current) return;
      if (document.visibilityState !== 'visible') return;
      const stream = streamRef.current;
      const video = videoRef.current;
      const tracks = stream?.getVideoTracks() ?? [];
      if (!stream || tracks.length === 0 || tracks.some((t) => t.readyState === 'ended')) {
        setRetryCount((c) => c + 1);
        return;
      }
      if (video && video.paused) {
        video.play().catch(() => {
          if (!isAborted()) setNeedsUserTapToPlay(true);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseActiveStream();
    };
  }, [mode, retryCount, releaseActiveStream]);

  // 2) Bucle continuo de decodificación EAN a 30 FPS con captura instantánea en el mismo milisegundo
  useEffect(() => {
    if (!cameraReady || cameraError || mode !== 'barcode') return;

    let scanCancelled = false;
    let isDecoding = false;
    let tickCount = 0;
    let lastTickAt = 0;
    let rafId = 0;
    const FRAME_INTERVAL_MS = 33; // ~30 FPS reales

    let zxingMod: ZxingModule | null = null;
    let reader: MultiFormatReader | null = null;
    void loadZxingModule()
      .then((mod) => {
        if (!scanCancelled) {
          zxingMod = mod;
          reader = createEanReader(mod);
        }
      })
      .catch(() => {});
    const nativeDetector = createNativeEanDetector();
    const scanCanvas = document.createElement('canvas');
    const scanCtx =
      scanCanvas.getContext('2d', { willReadFrequently: true }) ||
      scanCanvas.getContext('2d');

    const handleDetected = (code: string) => {
      if (scanCancelled || scannedRef.current) return;
      scannedRef.current = true;
      scanCancelled = true;
      if (rafId) cancelAnimationFrame(rafId);

      // Capturar el fotograma completo ANTES de cerrar el stream de la cámara
      const capturedFrameBase64 = videoRef.current
        ? captureFullFrameBase64(videoRef.current, 768, 0.78)
        : undefined;

      playScanBeep();
      releaseActiveStream();
      onBarcodeDetectedRef.current?.(code, capturedFrameBase64);
    };

    const scanFrame = async () => {
      if (scanCancelled || scannedRef.current || isDecoding) return;
      const video = videoRef.current;
      if (!video) return;

      if (video.paused && !video.ended) {
        video.play().catch(() => {});
        return;
      }
      if (video.readyState < 2 || video.videoWidth < 32 || video.videoHeight < 32) {
        return;
      }

      isDecoding = true;
      tickCount += 1;
      try {
        // Pasada 1: BarcodeDetector nativo del navegador a 30 FPS
        if (nativeDetector) {
          try {
            const detections = await nativeDetector.detect(video);
            for (const d of detections) {
              const raw = d.rawValue?.trim();
              if (raw && EAN_REGEX.test(raw)) {
                handleDetected(raw);
                return;
              }
            }
          } catch {
            // Ignorar fallo puntual del detector nativo y respaldar con ZXing
          }
        }

        if (scanCancelled || scannedRef.current || !scanCtx || !zxingMod || !reader) return;

        // Si el navegador tiene BarcodeDetector nativo, respaldamos con ZXing cada 4 ticks (~7.5 FPS)
        // para no sobrecargar la CPU; sin detector nativo (iOS/Firefox) ZXing corre a 30 FPS.
        if (nativeDetector && tickCount % 4 !== 1) {
          return;
        }

        const vw = video.videoWidth;
        const vh = video.videoHeight;

        // Pasada 2: banda horizontal central enfocada al recuadro guía (84% × 48%)
        const bandW = Math.round(vw * 0.84);
        const bandH = Math.round(vh * 0.48);
        const bandX = Math.round((vw - bandW) / 2);
        const bandY = Math.round((vh - bandH) / 2);
        drawRegionToCanvas(scanCanvas, scanCtx, video, bandX, bandY, bandW, bandH, 640);
        const bandCode = tryDecodeCanvas(scanCanvas, reader, zxingMod);
        if (bandCode) {
          handleDetected(bandCode);
          return;
        }

        // Pasada 3: fotograma completo alternado para códigos alejados o descentrados
        if (tickCount % 2 === 1) {
          drawRegionToCanvas(scanCanvas, scanCtx, video, 0, 0, vw, vh, 720);
          const fullCode = tryDecodeCanvas(scanCanvas, reader, zxingMod);
          if (fullCode) {
            handleDetected(fullCode);
          }
        }
      } finally {
        isDecoding = false;
      }
    };

    const loop = (now: number) => {
      if (scanCancelled || scannedRef.current) return;
      if (now - lastTickAt >= FRAME_INTERVAL_MS) {
        lastTickAt = now;
        void scanFrame();
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      scanCancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [cameraReady, cameraError, mode, releaseActiveStream]);

  const handleManualPlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      setRetryCount((c) => c + 1);
      return;
    }
    if (!video.srcObject && streamRef.current) {
      video.srcObject = streamRef.current;
    }
    try {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      await video.play();
      if (isVideoFrameReady(video)) {
        setNeedsUserTapToPlay(false);
        setCameraReady(true);
        return;
      }
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 100));
        if (isVideoFrameReady(video)) {
          setNeedsUserTapToPlay(false);
          setCameraReady(true);
          return;
        }
      }
      setRetryCount((c) => c + 1);
    } catch {
      setRetryCount((c) => c + 1);
    }
  }, []);

  const handleToggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next }] as unknown as MediaTrackConstraintSet[],
      });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  };

  const handleCaptureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onPhotoCapturedRef.current?.(dataUrl);
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onPhotoCapturedRef.current?.(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBarcodePhotoPicked = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhotoDecoding(true);
    setPhotoDecodeHint(null);
    const objectUrl = URL.createObjectURL(file);

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('No se pudo cargar la imagen'));
        el.src = objectUrl;
      });

      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (iw < 32 || ih < 32) {
        setPhotoDecodeHint('La imagen es demasiado pequeña. Intenta acercar más el código.');
        return;
      }

      const nativeDetector = createNativeEanDetector();
      if (nativeDetector) {
        try {
          const hits = await nativeDetector.detect(img);
          for (const h of hits) {
            const raw = h.rawValue?.trim();
            if (raw && EAN_REGEX.test(raw)) {
              const capturedFrameBase64 = captureFullFrameBase64(img, 768, 0.78);
              playScanBeep();
              scannedRef.current = true;
              releaseActiveStream();
              onBarcodeDetectedRef.current?.(raw, capturedFrameBase64);
              return;
            }
          }
        } catch {
          // Seguir con ZXing
        }
      }

      const canvas = document.createElement('canvas');
      const ctx =
        canvas.getContext('2d', { willReadFrequently: true }) ||
        canvas.getContext('2d');
      if (!ctx) {
        setPhotoDecodeHint('No pudimos analizar la foto en este navegador.');
        return;
      }

      const zxingMod = await loadZxingModule();
      const reader = createEanReader(zxingMod);
      const regions: Array<{
        sx: number;
        sy: number;
        sw: number;
        sh: number;
        maxW: number;
        rotate90?: boolean;
      }> = [
        { sx: 0, sy: 0, sw: iw, sh: ih, maxW: 1200 },
        {
          sx: Math.round(iw * 0.1),
          sy: Math.round(ih * 0.25),
          sw: Math.round(iw * 0.8),
          sh: Math.round(ih * 0.5),
          maxW: 1000,
        },
        { sx: 0, sy: 0, sw: iw, sh: ih, maxW: 800 },
        { sx: 0, sy: 0, sw: iw, sh: ih, maxW: 1000, rotate90: true },
      ];

      for (const r of regions) {
        drawRegionToCanvas(canvas, ctx, img, r.sx, r.sy, r.sw, r.sh, r.maxW, r.rotate90);
        const found = tryDecodeCanvas(canvas, reader, zxingMod);
        if (found) {
          const capturedFrameBase64 = captureFullFrameBase64(img, 768, 0.78);
          playScanBeep();
          scannedRef.current = true;
          releaseActiveStream();
          onBarcodeDetectedRef.current?.(found, capturedFrameBase64);
          return;
        }
      }

      setPhotoDecodeHint(
        'No detectamos un código EAN/UPC de envase o pack nítido en esa foto. Acércate más al código con buena luz o escríbelo abajo.'
      );
    } catch {
      setPhotoDecodeHint('No se pudo procesar la foto seleccionada.');
    } finally {
      URL.revokeObjectURL(objectUrl);
      setPhotoDecoding(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.cameraBox}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: cameraError ? 'none' : 'block',
          }}
        />

        {cameraError ? (
          <View style={styles.errorOverlay}>
            <Ionicons name="videocam-off-outline" size={32} color={COLORS.amber} />
            <Text style={styles.errorText}>{cameraError}</Text>
            <Pressable
              onPress={() => setRetryCount((c) => c + 1)}
              style={styles.inlineRetryBtn}
            >
              <Ionicons name="refresh" size={16} color={COLORS.bg} />
              <Text style={styles.inlineRetryText}>Reiniciar cámara</Text>
            </Pressable>
          </View>
        ) : null}

        {!cameraError && needsUserTapToPlay && !cameraReady ? (
          <View style={styles.tapPlayOverlay}>
            <Pressable onPress={handleManualPlay}>
              <LinearGradient
                colors={GRADIENTS.amberBtn}
                style={[styles.tapPlayBtn, SHADOWS.amberGlow]}
              >
                <Ionicons name="play" size={18} color={COLORS.bg} />
                <Text style={styles.tapPlayText}>
                  Pulsa aquí para iniciar la cámara
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : null}

        {!cameraError && !cameraReady && !needsUserTapToPlay ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator color={COLORS.amberBright} size="large" />
            <Text style={styles.loadingLabel}>Iniciando cámara...</Text>
          </View>
        ) : null}

        {!cameraError && cameraReady && mode === 'barcode' ? (
          <View style={styles.aimFrame} pointerEvents="none">
            <View style={styles.aimCorner} />
            <Text style={styles.aimLabel}>
              Apunta al código de barras real (botella, lata, litrona o pack)
            </Text>
          </View>
        ) : null}

        {!cameraError && cameraReady && torchSupported ? (
          <Pressable
            onPress={handleToggleTorch}
            style={[styles.torchBtn, torchOn && styles.torchBtnActive]}
          >
            <Ionicons
              name={torchOn ? 'flashlight' : 'flashlight-outline'}
              size={16}
              color={torchOn ? COLORS.bg : COLORS.text}
            />
            <Text style={[styles.torchText, torchOn && styles.torchTextActive]}>
              Linterna
            </Text>
          </Pressable>
        ) : null}
      </View>

      {mode === 'barcode' ? (
        <View style={styles.photoControls}>
          <Pressable
            onPress={() => barcodeFileInputRef.current?.click()}
            disabled={photoDecoding}
            style={[styles.fileFallbackBtn, photoDecoding && styles.btnDisabled]}
          >
            {photoDecoding ? (
              <ActivityIndicator color={COLORS.amberBright} size="small" />
            ) : (
              <Ionicons name="camera-outline" size={18} color={COLORS.amberBright} />
            )}
            <Text style={styles.fileFallbackText}>
              {photoDecoding
                ? 'Analizando código en la foto...'
                : 'Escanear código con foto (cámara iPhone)'}
            </Text>
          </Pressable>

          {!cameraError ? (
            <Pressable
              onPress={() => setRetryCount((c) => c + 1)}
              style={styles.restartLinkBtn}
            >
              <Ionicons name="refresh-outline" size={15} color={COLORS.textSecondary} />
              <Text style={styles.restartLinkText}>Reiniciar cámara en directo</Text>
            </Pressable>
          ) : null}

          {photoDecodeHint ? (
            <Text style={styles.hintErrorText}>{photoDecodeHint}</Text>
          ) : null}

          <input
            ref={barcodeFileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleBarcodePhotoPicked}
          />
        </View>
      ) : null}

      {mode === 'photo' ? (
        <View style={styles.photoControls}>
          {!cameraError ? (
            <Pressable onPress={handleCaptureFrame} disabled={!cameraReady}>
              <LinearGradient
                colors={GRADIENTS.amberBtn}
                style={[
                  styles.shutterBtn,
                  SHADOWS.amberGlow,
                  !cameraReady && styles.btnDisabled,
                ]}
              >
                <Text style={styles.shutterText}>Hacer Foto</Text>
              </LinearGradient>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => fileInputRef.current?.click()}
            style={styles.fileFallbackBtn}
          >
            <Ionicons name="camera-outline" size={18} color={COLORS.amberBright} />
            <Text style={styles.fileFallbackText}>
              Usar cámara nativa / galería del teléfono
            </Text>
          </Pressable>

          {!cameraError ? (
            <Pressable
              onPress={() => setRetryCount((c) => c + 1)}
              style={styles.restartLinkBtn}
            >
              <Ionicons name="refresh-outline" size={15} color={COLORS.textSecondary} />
              <Text style={styles.restartLinkText}>Reiniciar cámara</Text>
            </Pressable>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFilePicked}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    gap: SPACING.md,
  },
  cameraBox: {
    width: '100%',
    height: 300,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: '#0A0806',
    borderWidth: 1,
    borderColor: COLORS.amber,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorOverlay: {
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  errorText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
  },
  inlineRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.amber,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.pill,
  },
  inlineRetryText: {
    color: COLORS.bg,
    fontFamily: FONTS.display,
    fontSize: 13,
    fontWeight: '800',
  },
  tapPlayOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(12, 9, 8, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  tapPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: RADIUS.pill,
  },
  tapPlayText: {
    color: COLORS.bg,
    fontFamily: FONTS.display,
    fontSize: 14,
    fontWeight: '900',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(10, 8, 6, 0.55)',
  },
  loadingLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  aimFrame: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  aimCorner: {
    width: 220,
    height: 110,
    borderWidth: 2,
    borderColor: COLORS.amberBright,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(229, 169, 60, 0.06)',
  },
  aimLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(18, 14, 11, 0.78)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  torchBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(18, 14, 11, 0.84)',
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
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
  photoControls: {
    gap: SPACING.sm,
  },
  shutterBtn: {
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  shutterText: {
    color: COLORS.bg,
    fontFamily: FONTS.display,
    fontSize: 16,
    fontWeight: '900',
  },
  fileFallbackBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  fileFallbackText: {
    color: COLORS.amberBright,
    fontSize: 14,
    fontWeight: '700',
  },
  restartLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  restartLinkText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  hintErrorText: {
    color: COLORS.amberBright,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: SPACING.sm,
  },
});
