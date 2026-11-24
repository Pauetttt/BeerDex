import {
  env,
  isBlobConfigured,
  isCloudinaryConfigured,
  isGeminiConfigured,
  isR2Configured,
  isResendConfigured,
} from '../config/env';

interface CheckRow {
  label: string;
  ok: boolean;
  detail: string;
  requiredInProd: boolean;
}

function runCheck(): void {
  const strict = process.argv.includes('--strict');
  const r2Configured = isR2Configured();
  const cloudinaryConfigured = isCloudinaryConfigured();
  const blobConfigured = isBlobConfigured();
  const resendConfigured = isResendConfigured();
  const geminiConfigured = isGeminiConfigured();
  const hasCloudPhotoStorage = r2Configured || cloudinaryConfigured || blobConfigured;

  const checks: CheckRow[] = [
    {
      label: 'DATABASE_URL (Neon PostgreSQL)',
      ok: env.databaseUrl.startsWith('postgres://') || env.databaseUrl.startsWith('postgresql://'),
      detail: env.databaseUrl
        ? env.databaseUrl.includes('neon.tech')
          ? 'Conectado a Neon PostgreSQL'
          : 'Conectado a PostgreSQL externo'
        : 'Vacío (usando fallback local PGlite)',
      requiredInProd: true,
    },
    {
      label: 'JWT_SECRET',
      ok:
        env.jwtSecret.length >= 32 &&
        !env.jwtSecret.includes('change_me') &&
        !env.jwtSecret.includes('dev_beerdex'),
      detail:
        env.jwtSecret.includes('change_me') || env.jwtSecret.includes('dev_beerdex')
          ? 'Usa secreto de desarrollo — ejecuta "npm run secrets:generate"'
          : `Configurado (${env.jwtSecret.length} chars)`,
      requiredInProd: true,
    },
    {
      label: 'JWT_REFRESH_SECRET',
      ok:
        env.jwtRefreshSecret.length >= 32 &&
        !env.jwtRefreshSecret.includes('change_me') &&
        !env.jwtRefreshSecret.includes('dev_beerdex'),
      detail:
        env.jwtRefreshSecret.includes('change_me') ||
        env.jwtRefreshSecret.includes('dev_beerdex')
          ? 'Usa secreto de desarrollo — ejecuta "npm run secrets:generate"'
          : `Configurado (${env.jwtRefreshSecret.length} chars)`,
      requiredInProd: true,
    },
    {
      label: 'Almacenamiento de fotos en la nube (Cloudflare R2 / Vercel Blob / Cloudinary)',
      ok: hasCloudPhotoStorage,
      detail: r2Configured
        ? 'Cloudflare R2 configurado'
        : cloudinaryConfigured
          ? `Cloudinary (${env.cloudinary.cloudName})`
          : blobConfigured
            ? 'Vercel Blob configurado'
            : 'No configurado (fallback local en /uploads)',
      requiredInProd: true,
    },
    {
      label: 'Resend (emails de recuperación)',
      ok: resendConfigured,
      detail: resendConfigured
        ? `Remitente: ${env.resend.emailFrom}`
        : 'No configurado (código mostrado en consola en desarrollo)',
      requiredInProd: true,
    },
    {
      label: 'GEMINI_API_KEY (Google AI Studio Antitrampas)',
      ok: geminiConfigured,
      detail: geminiConfigured
        ? `Configurado (${env.gemini.model}, estricto=${env.gemini.strict})`
        : 'No configurado (escáner antitrampas omitido hasta configurar GEMINI_API_KEY)',
      requiredInProd: false,
    },
    {
      label: 'FRONTEND_URL (CORS)',
      ok: env.frontendUrl !== '*' && env.frontendUrl.startsWith('http'),
      detail:
        env.frontendUrl === '*'
          ? 'Abierto (*) — fija el dominio de tu PWA en producción'
          : env.frontendUrl,
      requiredInProd: false,
    },
  ];

  console.log('\n[BeerDex Env Check]');
  let failedRequired = false;
  for (const row of checks) {
    const icon = row.ok ? 'OK  ' : row.requiredInProd ? 'PEND' : 'WARN';
    console.log(`- [${icon}] ${row.label}: ${row.detail}`);
    if (!row.ok && row.requiredInProd) {
      failedRequired = true;
    }
  }
  console.log('');

  if (strict && failedRequired) {
    console.error('Faltan variables de producción obligatorias (--strict).');
    process.exit(1);
  }
}

runCheck();
