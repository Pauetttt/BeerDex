import crypto from 'node:crypto';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { getDb, schema } from '../db';
import { authLoginLimiter, authRecoveryLimiter } from '../middleware/rateLimiters';
import { ensureUserAchievements } from '../services/achievementEngine';
import { sendPasswordRecoveryEmail } from '../services/emailService';
import { getFullUserProfile } from '../services/profileService';
import { asyncHandler, HttpError } from '../utils/httpError';
import { hashPassword, verifyPassword } from '../utils/password';

const router = Router();

const registerSchema = z.object({
  email: z.string().trim().email('Correo electrónico no válido.'),
  username: z
    .string()
    .trim()
    .min(3, 'El nombre de usuario debe tener al menos 3 caracteres.')
    .max(30, 'El nombre de usuario no puede superar los 30 caracteres.')
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos.'
    ),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres.')
    .max(100, 'La contraseña es demasiado larga.'),
});

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Introduce tu nombre de usuario.'),
  password: z.string().min(1, 'Introduce tu contraseña.'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido.'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Introduce un correo electrónico válido.'),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(4, 'Introduce el código de recuperación.'),
  newPassword: z
    .string()
    .min(6, 'La nueva contraseña debe tener al menos 6 caracteres.')
    .max(100, 'La contraseña es demasiado larga.'),
});

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateResetCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

async function issueTokens(userId: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const db = getDb();
  const accessToken = jwt.sign({ sub: userId, type: 'access' }, env.jwtSecret, {
    expiresIn: '1h',
  });
  const jti = crypto.randomUUID();
  const refreshToken = jwt.sign({ sub: userId, type: 'refresh', jti }, env.jwtRefreshSecret, {
    expiresIn: '30d',
  });

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(schema.refreshTokens).values({
    userId,
    tokenHash: sha256(refreshToken),
    expiresAt,
  });

  return { accessToken, refreshToken };
}

router.post(
  '/register',
  authLoginLimiter,
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Datos inválidos.');
    }

    const db = getDb();
    const email = parsed.data.email.toLowerCase();
    const username = parsed.data.username;

    const [existingEmail] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(sql`LOWER(${schema.users.email}) = LOWER(${email})`);
    if (existingEmail) {
      throw new HttpError(409, 'Este correo electrónico ya está registrado.');
    }

    const [existingUsername] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(sql`LOWER(${schema.users.username}) = LOWER(${username})`);
    if (existingUsername) {
      throw new HttpError(409, 'Este nombre de usuario ya está en uso.');
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const [createdUser] = await db
      .insert(schema.users)
      .values({
        email,
        username,
        passwordHash,
        equippedIconId: 1,
        equippedTitleId: 1,
        chapasBackfilled: true,
      })
      .returning();

    await ensureUserAchievements(db, createdUser.id);
    const tokens = await issueTokens(createdUser.id);
    const profile = await getFullUserProfile(db, createdUser.id);

    res.status(201).json({
      ...tokens,
      user: profile?.user,
    });
  })
);

router.post(
  '/login',
  authLoginLimiter,
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Credenciales inválidas.');
    }

    const db = getDb();
    const [user] = await db
      .select()
      .from(schema.users)
      .where(sql`LOWER(${schema.users.username}) = LOWER(${parsed.data.username})`);

    if (!user) {
      throw new HttpError(401, 'Usuario o contraseña incorrectos.');
    }

    const { valid: passwordOk, needsRehash } = await verifyPassword(
      parsed.data.password,
      user.passwordHash,
      db
    );
    if (!passwordOk) {
      throw new HttpError(401, 'Usuario o contraseña incorrectos.');
    }

    if (needsRehash) {
      const upgradedHash = await hashPassword(parsed.data.password);
      await db
        .update(schema.users)
        .set({ passwordHash: upgradedHash })
        .where(eq(schema.users.id, user.id));
    }

    const tokens = await issueTokens(user.id);
    const profile = await getFullUserProfile(db, user.id);

    res.json({
      ...tokens,
      user: profile?.user,
    });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Refresh token requerido.');
    }

    let decoded: { sub?: string; type?: string };
    try {
      decoded = jwt.verify(parsed.data.refreshToken, env.jwtRefreshSecret) as {
        sub?: string;
        type?: string;
      };
    } catch {
      throw new HttpError(401, 'Refresh token inválido o expirado.');
    }

    if (!decoded.sub || decoded.type !== 'refresh') {
      throw new HttpError(401, 'Refresh token inválido.');
    }

    const db = getDb();
    const tokenHash = sha256(parsed.data.refreshToken);
    const now = new Date();

    const [stored] = await db
      .select()
      .from(schema.refreshTokens)
      .where(
        and(
          eq(schema.refreshTokens.tokenHash, tokenHash),
          isNull(schema.refreshTokens.revokedAt),
          gt(schema.refreshTokens.expiresAt, now)
        )
      );

    if (!stored) {
      throw new HttpError(401, 'Refresh token revocado o caducado.');
    }

    await db
      .update(schema.refreshTokens)
      .set({ revokedAt: now })
      .where(eq(schema.refreshTokens.id, stored.id));

    const tokens = await issueTokens(stored.userId);
    res.json(tokens);
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const refreshToken =
      typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';

    if (refreshToken) {
      const db = getDb();
      await db
        .update(schema.refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(schema.refreshTokens.tokenHash, sha256(refreshToken)));
    }

    res.json({ ok: true });
  })
);

router.post(
  '/forgot-password',
  authRecoveryLimiter,
  asyncHandler(async (req, res) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Correo inválido.');
    }

    const db = getDb();
    const email = parsed.data.email.toLowerCase();
    const [user] = await db
      .select()
      .from(schema.users)
      .where(sql`LOWER(${schema.users.email}) = LOWER(${email})`);

    if (!user) {
      res.json({
        ok: true,
        message:
          'Si el correo existe en BeerDex, recibirás tu usuario y un código de recuperación.',
      });
      return;
    }

    const resetCode = generateResetCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await db.insert(schema.passwordResetTokens).values({
      userId: user.id,
      tokenHash: sha256(resetCode),
      expiresAt,
    });

    const emailResult = await sendPasswordRecoveryEmail({
      to: user.email,
      username: user.username,
      resetCode,
    });

    res.json({
      ok: true,
      message:
        'Si el correo existe en BeerDex, recibirás tu usuario y un código de recuperación.',
      ...(emailResult.devResetCode
        ? { devResetCode: emailResult.devResetCode, devUsername: user.username }
        : {}),
    });
  })
);

router.post(
  '/reset-password',
  authRecoveryLimiter,
  asyncHandler(async (req, res) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Datos inválidos.');
    }

    const db = getDb();
    const normalizedCode = parsed.data.token.trim().toUpperCase();
    const now = new Date();

    const [resetRow] = await db
      .select()
      .from(schema.passwordResetTokens)
      .where(
        and(
          eq(schema.passwordResetTokens.tokenHash, sha256(normalizedCode)),
          isNull(schema.passwordResetTokens.usedAt),
          gt(schema.passwordResetTokens.expiresAt, now)
        )
      );

    if (!resetRow) {
      throw new HttpError(400, 'El código de recuperación es inválido o ha expirado.');
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);

    await db
      .update(schema.users)
      .set({ passwordHash })
      .where(eq(schema.users.id, resetRow.userId));

    await db
      .update(schema.passwordResetTokens)
      .set({ usedAt: now })
      .where(eq(schema.passwordResetTokens.id, resetRow.id));

    await db
      .update(schema.refreshTokens)
      .set({ revokedAt: now })
      .where(eq(schema.refreshTokens.userId, resetRow.userId));

    res.json({
      ok: true,
      message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
    });
  })
);

export default router;
