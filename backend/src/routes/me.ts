import { and, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { AppDatabase, getDb, schema } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware';
import { evaluateAchievements } from '../services/achievementEngine';
import { getFullUserProfile } from '../services/profileService';
import { deleteStoredPhoto } from '../services/storageService';
import { asyncHandler, HttpError } from '../utils/httpError';
import { hashPassword, verifyPassword } from '../utils/password';

const router = Router();
router.use(requireAuth);

const patchMeSchema = z.object({
  equippedIconId: z.number().int().positive().optional(),
  equippedTitleId: z.number().int().positive().optional(),
  equippedFrameId: z.number().int().positive().optional(),
  equippedCardStyleId: z.number().int().positive().optional(),
  equippedColorThemeId: z.number().int().positive().optional(),
  showcaseSlot1Id: z.number().int().positive().nullable().optional(),
  showcaseSlot2Id: z.number().int().positive().nullable().optional(),
  showcaseSlot3Id: z.number().int().positive().nullable().optional(),
});

async function assertAchievementOrShopOwnership(
  db: AppDatabase,
  userId: string,
  params: {
    unlockAchievementId: number | null;
    source: string;
    priceChapas: number | null;
    hasPurchased: boolean;
  }
): Promise<void> {
  if (params.hasPurchased) return;

  if (params.unlockAchievementId) {
    const [ach] = await db
      .select()
      .from(schema.achievements)
      .where(eq(schema.achievements.id, params.unlockAchievementId));
    const achName = ach?.name || 'un logro especial';

    const [ua] = await db
      .select()
      .from(schema.userAchievements)
      .where(
        and(
          eq(schema.userAchievements.userId, userId),
          eq(schema.userAchievements.achievementId, params.unlockAchievementId)
        )
      );

    if (ua?.unlocked) return;

    throw new HttpError(403, `Se desbloquea al completar: ${achName}`, {
      unlockAchievementName: achName,
    });
  }

  if (params.source === 'shop') {
    throw new HttpError(
      403,
      `Disponible en La Bodega por ${params.priceChapas ?? 0} Chapas.`
    );
  }

  throw new HttpError(403, 'Aún no has desbloqueado este artículo.');
}

async function verifyCosmeticForUser(
  db: AppDatabase,
  userId: string,
  cosmeticId: number,
  expectedType: 'frame' | 'card_style' | 'relic' | 'color_theme'
) {
  const [cosmetic] = await db
    .select()
    .from(schema.cosmetics)
    .where(eq(schema.cosmetics.id, cosmeticId));

  if (!cosmetic || cosmetic.type !== expectedType) {
    throw new HttpError(404, 'Cosmético no encontrado.');
  }

  if (cosmetic.source === 'default') {
    return cosmetic;
  }

  const [owned] = await db
    .select({ cosmeticId: schema.userCosmetics.cosmeticId })
    .from(schema.userCosmetics)
    .where(
      and(
        eq(schema.userCosmetics.userId, userId),
        eq(schema.userCosmetics.cosmeticId, cosmeticId)
      )
    );

  await assertAchievementOrShopOwnership(db, userId, {
    unlockAchievementId: cosmetic.unlockAchievementId,
    source: cosmetic.source,
    priceChapas: cosmetic.priceChapas,
    hasPurchased: Boolean(owned),
  });

  return cosmetic;
}

router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const profile = await getFullUserProfile(db, req.userId!);
    if (!profile) {
      throw new HttpError(404, 'Usuario no encontrado.');
    }
    res.json(profile);
  })
);

router.patch(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = patchMeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Datos inválidos.');
    }

    const {
      equippedIconId,
      equippedTitleId,
      equippedFrameId,
      equippedCardStyleId,
      equippedColorThemeId,
      showcaseSlot1Id,
      showcaseSlot2Id,
      showcaseSlot3Id,
    } = parsed.data;

    if (
      equippedIconId === undefined &&
      equippedTitleId === undefined &&
      equippedFrameId === undefined &&
      equippedCardStyleId === undefined &&
      equippedColorThemeId === undefined &&
      showcaseSlot1Id === undefined &&
      showcaseSlot2Id === undefined &&
      showcaseSlot3Id === undefined
    ) {
      throw new HttpError(400, 'Debes indicar al menos un cosmético o ajuste para equipar.');
    }

    const db = getDb();
    const userId = req.userId!;
    await evaluateAchievements(db, userId);

    const [currentUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    if (!currentUser) {
      throw new HttpError(404, 'Usuario no encontrado.');
    }

    const updates: Partial<typeof schema.users.$inferInsert> = {};

    if (equippedIconId !== undefined) {
      const [icon] = await db
        .select()
        .from(schema.icons)
        .where(eq(schema.icons.id, equippedIconId));

      if (!icon) {
        throw new HttpError(404, 'Icono no encontrado.');
      }

      if (!icon.isDefault) {
        const [ownedIcon] = await db
          .select({ iconId: schema.userIcons.iconId })
          .from(schema.userIcons)
          .where(
            and(
              eq(schema.userIcons.userId, userId),
              eq(schema.userIcons.iconId, icon.id)
            )
          );

        await assertAchievementOrShopOwnership(db, userId, {
          unlockAchievementId: icon.unlockAchievementId,
          source: icon.source,
          priceChapas: icon.priceChapas,
          hasPurchased: Boolean(ownedIcon),
        });
      }

      updates.equippedIconId = icon.id;
      if (icon.id !== 1) {
        updates.hasChangedIcon = true;
      }
    }

    if (equippedTitleId !== undefined) {
      const [title] = await db
        .select()
        .from(schema.titles)
        .where(eq(schema.titles.id, equippedTitleId));

      if (!title) {
        throw new HttpError(404, 'Título no encontrado.');
      }

      if (!title.isDefault) {
        const [ownedTitle] = await db
          .select({ titleId: schema.userTitles.titleId })
          .from(schema.userTitles)
          .where(
            and(
              eq(schema.userTitles.userId, userId),
              eq(schema.userTitles.titleId, title.id)
            )
          );

        await assertAchievementOrShopOwnership(db, userId, {
          unlockAchievementId: title.unlockAchievementId,
          source: title.source,
          priceChapas: title.priceChapas,
          hasPurchased: Boolean(ownedTitle),
        });

        updates.hasEquippedUnlockedTitle = true;
      }

      updates.equippedTitleId = title.id;
    }

    if (equippedFrameId !== undefined) {
      const frame = await verifyCosmeticForUser(db, userId, equippedFrameId, 'frame');
      updates.equippedFrameId = frame.id;
    }

    if (equippedCardStyleId !== undefined) {
      const cardStyle = await verifyCosmeticForUser(
        db,
        userId,
        equippedCardStyleId,
        'card_style'
      );
      updates.equippedCardStyleId = cardStyle.id;
    }

    if (equippedColorThemeId !== undefined) {
      const colorTheme = await verifyCosmeticForUser(
        db,
        userId,
        equippedColorThemeId,
        'color_theme'
      );
      updates.equippedColorThemeId = colorTheme.id;
    }

    // Gestión de vitrina de 3 huecos evitando duplicados
    const slotUpdates = [
      { key: 'showcaseSlot1Id' as const, val: showcaseSlot1Id },
      { key: 'showcaseSlot2Id' as const, val: showcaseSlot2Id },
      { key: 'showcaseSlot3Id' as const, val: showcaseSlot3Id },
    ];

    let slotsState = {
      showcaseSlot1Id: currentUser.showcaseSlot1Id,
      showcaseSlot2Id: currentUser.showcaseSlot2Id,
      showcaseSlot3Id: currentUser.showcaseSlot3Id,
    };

    let touchedSlots = false;
    for (const slot of slotUpdates) {
      if (slot.val === undefined) continue;
      touchedSlots = true;
      if (slot.val === null) {
        slotsState[slot.key] = null;
      } else {
        const relic = await verifyCosmeticForUser(db, userId, slot.val, 'relic');
        // Si esta reliquia ya estaba en otro hueco, limpiarla de allí
        if (slotsState.showcaseSlot1Id === relic.id) slotsState.showcaseSlot1Id = null;
        if (slotsState.showcaseSlot2Id === relic.id) slotsState.showcaseSlot2Id = null;
        if (slotsState.showcaseSlot3Id === relic.id) slotsState.showcaseSlot3Id = null;
        slotsState[slot.key] = relic.id;
      }
    }

    if (touchedSlots) {
      updates.showcaseSlot1Id = slotsState.showcaseSlot1Id;
      updates.showcaseSlot2Id = slotsState.showcaseSlot2Id;
      updates.showcaseSlot3Id = slotsState.showcaseSlot3Id;
    }

    await db.update(schema.users).set(updates).where(eq(schema.users.id, userId));

    const newlyUnlocked = await evaluateAchievements(db, userId);
    const profile = await getFullUserProfile(db, userId);

    res.json({
      ...profile,
      newlyUnlocked,
    });
  })
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Introduce tu contraseña actual.'),
  newPassword: z
    .string()
    .min(6, 'La nueva contraseña debe tener al menos 6 caracteres.')
    .max(100, 'La contraseña es demasiado larga.'),
});

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Introduce tu contraseña para confirmar el borrado.'),
});

router.patch(
  '/password',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Datos inválidos.');
    }

    const db = getDb();
    const userId = req.userId!;

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));
    if (!user) {
      throw new HttpError(404, 'Usuario no encontrado.');
    }

    const { valid: passwordOk } = await verifyPassword(
      parsed.data.currentPassword,
      user.passwordHash,
      db
    );
    if (!passwordOk) {
      throw new HttpError(401, 'La contraseña actual es incorrecta.');
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await db
      .update(schema.users)
      .set({ passwordHash })
      .where(eq(schema.users.id, userId));

    await db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(schema.refreshTokens.userId, userId));

    res.json({
      ok: true,
      message: 'Contraseña actualizada correctamente.',
    });
  })
);

router.delete(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = deleteAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Contraseña requerida.');
    }

    const db = getDb();
    const userId = req.userId!;

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));
    if (!user) {
      throw new HttpError(404, 'Usuario no encontrado.');
    }

    const { valid: passwordOk } = await verifyPassword(
      parsed.data.password,
      user.passwordHash,
      db
    );
    if (!passwordOk) {
      throw new HttpError(401, 'La contraseña introducida es incorrecta.');
    }

    const photos = await db
      .select({ photoUrl: schema.userBeers.photoUrl })
      .from(schema.userBeers)
      .where(eq(schema.userBeers.userId, userId));

    await db.delete(schema.users).where(eq(schema.users.id, userId));

    await Promise.all(photos.map((p) => deleteStoredPhoto(p.photoUrl)));

    res.json({ ok: true });
  })
);

export default router;
