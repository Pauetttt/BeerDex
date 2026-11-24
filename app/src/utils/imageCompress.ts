import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

export interface CompressedImageResult {
  uri: string;
  base64: string;
  width: number;
  height: number;
}

const MAX_WIDTH = 600;
const JPEG_QUALITY = 0.7;

function compressOnWeb(uri: string): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const targetWidth = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
      const scale = targetWidth / img.width;
      const targetHeight = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo inicializar el lienzo de compresión.'));
        return;
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      resolve({
        uri: dataUrl,
        base64: dataUrl,
        width: targetWidth,
        height: targetHeight,
      });
    };
    img.onerror = () => reject(new Error('No se pudo cargar la imagen para comprimirla.'));
    img.src = uri;
  });
}

export async function compressBeerPhoto(uri: string): Promise<CompressedImageResult> {
  if (Platform.OS === 'web') {
    return compressOnWeb(uri);
  }

  const context = ImageManipulator.manipulate(uri, { maxWidth: MAX_WIDTH });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
    base64: true,
  });

  const base64DataUri = saved.base64
    ? `data:image/jpeg;base64,${saved.base64}`
    : saved.uri;

  return {
    uri: saved.uri,
    base64: base64DataUri,
    width: saved.width,
    height: saved.height,
  };
}
