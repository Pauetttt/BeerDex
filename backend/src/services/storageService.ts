import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  env,
  isBlobConfigured,
  isCloudinaryConfigured,
  isR2Configured,
} from '../config/env';
import { getR2Bucket, isWorkersRuntime } from '../config/runtimeBindings';
import { HttpError } from '../utils/httpError';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB máximo tras compresión cliente
const ALLOWED_MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const R2_KEY_REGEX = /^photos\/[a-zA-Z0-9._-]+$/;

function detectMimeFromBuffer(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export function getActiveStorageProvider(): 'r2' | 'cloudinary' | 'blob' | 'local' {
  if (isR2Configured()) return 'r2';
  if (isCloudinaryConfigured()) return 'cloudinary';
  if (isBlobConfigured()) return 'blob';
  return 'local';
}

export function parseImageInput(input: {
  buffer?: Buffer;
  mimetype?: string;
  base64?: string;
}): { buffer: Buffer; mimeType: string; ext: string } {
  let buffer: Buffer;
  let declaredMime: string | undefined;

  if (input.buffer && input.buffer.length > 0) {
    buffer = input.buffer;
    declaredMime = input.mimetype?.toLowerCase();
  } else if (input.base64) {
    const dataUriMatch = input.base64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (dataUriMatch) {
      declaredMime = dataUriMatch[1].toLowerCase();
      buffer = Buffer.from(dataUriMatch[2], 'base64');
    } else {
      buffer = Buffer.from(input.base64, 'base64');
      declaredMime = 'image/jpeg';
    }
  } else {
    throw new HttpError(400, 'La foto de la cerveza es obligatoria.');
  }

  if (buffer.length === 0) {
    throw new HttpError(400, 'La imagen enviada está vacía.');
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new HttpError(
      400,
      'La imagen supera el máximo permitido de 2 MB. Comprímela antes de subirla.'
    );
  }

  const sniffedMime = detectMimeFromBuffer(buffer);
  const resolvedMime = sniffedMime || declaredMime || '';
  const ext = ALLOWED_MIME_EXT[resolvedMime];
  if (!ext) {
    throw new HttpError(400, 'Formato de imagen no soportado. Usa JPEG, PNG o WebP.');
  }

  return { buffer, mimeType: resolvedMime, ext };
}

export async function uploadBeerPhoto(input: {
  buffer?: Buffer;
  mimetype?: string;
  base64?: string;
}): Promise<string> {
  const { buffer, mimeType, ext } = parseImageInput(input);

  // 1) Cloudflare R2 binding (producción en Workers)
  const r2Bucket = getR2Bucket();
  if (r2Bucket) {
    const key = `photos/${crypto.randomUUID()}.${ext}`;
    await r2Bucket.put(key, buffer, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });
    return `/media/${key}`;
  }

  // 2) Cloudinary (opcional vía import dinámico para no acoplar Workers)
  if (isCloudinaryConfigured()) {
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
    });
    const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'beerdex/photos',
      resource_type: 'image',
      transformation: [
        { width: 600, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
      ],
    });
    return result.secure_url;
  }

  // 3) Vercel Blob (fallback opcional)
  if (isBlobConfigured()) {
    const { put } = await import('@vercel/blob');
    const blob = await put(`beerdex/photos/${crypto.randomUUID()}.${ext}`, buffer, {
      access: 'public',
      contentType: mimeType,
      token: env.blobToken,
    });
    return blob.url;
  }

  // 4) Fallback local en desarrollo/tests Node: guardar en /uploads/<uuid>.<ext>
  if (typeof __dirname === 'string' && !isWorkersRuntime()) {
    const uploadsDir = path.resolve(__dirname, '../../uploads');
    const fileName = `${crypto.randomUUID()}.${ext}`;
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(path.join(uploadsDir, fileName), buffer);
      return `/uploads/${fileName}`;
    } catch {
      // En entornos serverless con FS de solo lectura sin almacenamiento configurado
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    }
  }

  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

export async function deleteStoredPhoto(photoUrl: string): Promise<void> {
  if (!photoUrl) return;

  if (photoUrl.startsWith('/media/')) {
    const key = photoUrl.slice('/media/'.length);
    if (!R2_KEY_REGEX.test(key)) return;
    const r2Bucket = getR2Bucket();
    if (r2Bucket) {
      await r2Bucket.delete(key).catch(() => {});
    }
    return;
  }

  if (photoUrl.startsWith('/uploads/') && typeof __dirname === 'string' && !isWorkersRuntime()) {
    const safeName = path.basename(photoUrl);
    if (!safeName || safeName === '.gitkeep') return;
    const target = path.resolve(__dirname, '../../uploads', safeName);
    await fs.unlink(target).catch(() => {});
    return;
  }

  if (isCloudinaryConfigured() && photoUrl.includes('cloudinary.com')) {
    const match = photoUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
    if (match?.[1]) {
      const { v2: cloudinary } = await import('cloudinary');
      cloudinary.config({
        cloud_name: env.cloudinary.cloudName,
        api_key: env.cloudinary.apiKey,
        api_secret: env.cloudinary.apiSecret,
      });
      await cloudinary.uploader.destroy(match[1]).catch(() => {});
    }
    return;
  }

  if (isBlobConfigured() && photoUrl.includes('blob.vercel-storage.com')) {
    const { del } = await import('@vercel/blob');
    await del(photoUrl, { token: env.blobToken }).catch(() => {});
  }
}
