import dotenv from 'dotenv';
import {
  getAiBinding,
  getR2Bucket,
  getRuntimeEnvValue,
  isWorkersRuntime,
} from './runtimeBindings';

if (!isWorkersRuntime() && process.env.NODE_ENV !== 'test') {
  try {
    dotenv.config({ path: '.env.local' });
    dotenv.config();
  } catch {
    // En entornos serverless/edge sin acceso a FS puede omitirse dotenv
  }
}

function readEnv(key: string): string | undefined {
  const runtimeVal = getRuntimeEnvValue(key);
  if (runtimeVal !== undefined) return runtimeVal;
  return process.env[key];
}

let geminiApiKeyOverride: string | undefined;

export const env = {
  get port(): number {
    return Number(readEnv('PORT') || 3001);
  },
  get nodeEnv(): string {
    return readEnv('NODE_ENV') || 'development';
  },
  get databaseUrl(): string {
    return (readEnv('DATABASE_URL') || '').trim();
  },
  get dbDriverOverride(): string {
    return (readEnv('DB_DRIVER') || '').trim().toLowerCase();
  },
  get jwtSecret(): string {
    return readEnv('JWT_SECRET') || 'dev_beerdex_access_secret_change_me';
  },
  get jwtRefreshSecret(): string {
    return readEnv('JWT_REFRESH_SECRET') || 'dev_beerdex_refresh_secret_change_me';
  },
  get frontendUrl(): string {
    return (readEnv('FRONTEND_URL') || '*').trim();
  },
  get blobToken(): string {
    return (readEnv('BLOB_READ_WRITE_TOKEN') || '').trim();
  },
  cloudinary: {
    get cloudName(): string {
      return (readEnv('CLOUDINARY_CLOUD_NAME') || '').trim();
    },
    get apiKey(): string {
      return (readEnv('CLOUDINARY_API_KEY') || '').trim();
    },
    get apiSecret(): string {
      return (readEnv('CLOUDINARY_API_SECRET') || '').trim();
    },
  },
  resend: {
    get apiKey(): string {
      return (readEnv('RESEND_API_KEY') || '').trim();
    },
    get emailFrom(): string {
      return (readEnv('EMAIL_FROM') || 'BeerDex <onboarding@resend.dev>').trim();
    },
  },
  gemini: {
    get apiKey(): string {
      if (geminiApiKeyOverride !== undefined) return geminiApiKeyOverride;
      return (readEnv('GEMINI_API_KEY') || readEnv('GOOGLE_AI_API_KEY') || '').trim();
    },
    set apiKey(value: string) {
      geminiApiKeyOverride = value;
    },
    get model(): string {
      return (readEnv('GEMINI_MODEL') || 'gemini-2.5-flash').trim();
    },
    get strict(): boolean {
      return readEnv('ANTI_CHEAT_STRICT') === 'true';
    },
  },
  workersAi: {
    get model(): string {
      return (readEnv('WORKERS_AI_VISION_MODEL') || '@cf/google/gemma-4-26b-a4b-it').trim();
    },
  },
};

export function isWorkersAiConfigured(): boolean {
  return Boolean(getAiBinding());
}

export function isR2Configured(): boolean {
  return Boolean(getR2Bucket());
}

export function isBlobConfigured(): boolean {
  return Boolean(env.blobToken);
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret
  );
}

export function isResendConfigured(): boolean {
  return Boolean(env.resend.apiKey);
}

export function isGeminiConfigured(): boolean {
  return Boolean(env.gemini.apiKey);
}
