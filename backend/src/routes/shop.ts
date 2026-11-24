import { and, asc, eq, gte, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { getDb, schema } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/authMiddleware';
import { backfillUserChapasIfNeeded, parseCosmeticMetadata } from '../services/profileService';
import { asyncHandler, HttpError } from '../utils/httpError';

const router = Router();
router.use(requireAuth);

export type ShopItemType =
  | 'icon'
  | 'title'
  | 'frame'
  | 'card_style'
  | 'relic'
  | 'color_theme';

export interface ShopCatalogItemDto {
  id: number;
  itemType: ShopItemType;
  code: string;
  name: string;
  description: string;
  previewKey: string;
  priceChapas: number;
  owned: boolean;
  equipped: boolean;
  metadata: Record<string, unknown> | null;
}

const buySchema = z
  .object({
    itemType: z
      .enum(['icon', 'title', 'frame', 'card_style', 'relic', 'color_theme'])
      .optional(),
    itemId: z.number().int().positive().optional(),
    cosmeticId: z.number().int().positive().optional(),
  })
  .refine(
    (d) =>
      (d.itemType !== undefined && d.itemId !== undefined) ||
      d.cosmeticId !== undefined,
    { message: 'Debes indicar el artículo a comprar.' }
  );

router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const userId = req.userId!;

    let [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    if (!user) {
      throw new HttpError(404, 'Usuario no encontrado.');
    }

    if (!user.chapasBackfilled) {
      await backfillUserChapasIfNeeded(db, userId);
      const [refreshed] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId));
      if (refreshed) user = refreshed;
    }

    const [
      shopIcons,
      shopTitles,
      shopCosmetics,
      ownedIcons,
      ownedTitles,
      ownedCosmetics,
    ] = await Promise.all([
      db
        .select()
        .from(schema.icons)
        .where(eq(schema.icons.source, 'shop'))
        .orderBy(asc(schema.icons.priceChapas), asc(schema.icons.id)),
      db
        .select()
        .from(schema.titles)
        .where(eq(schema.titles.source, 'shop'))
        .orderBy(asc(schema.titles.priceChapas), asc(schema.titles.id)),
      db
        .select()
        .from(schema.cosmetics)
        .where(eq(schema.cosmetics.source, 'shop'))
        .orderBy(asc(schema.cosmetics.priceChapas), asc(schema.cosmetics.id)),
      db
        .select({ iconId: schema.userIcons.iconId })
        .from(schema.userIcons)
        .where(eq(schema.userIcons.userId, userId)),
      db
        .select({ titleId: schema.userTitles.titleId })
        .from(schema.userTitles)
        .where(eq(schema.userTitles.userId, userId)),
      db
        .select({ cosmeticId: schema.userCosmetics.cosmeticId })
        .from(schema.userCosmetics)
        .where(eq(schema.userCosmetics.userId, userId)),
    ]);

    const ownedIconSet = new Set(ownedIcons.map((r) => r.iconId));
    const ownedTitleSet = new Set(ownedTitles.map((r) => r.titleId));
    const ownedCosmeticSet = new Set(ownedCosmetics.map((r) => r.cosmeticId));
    const showcaseIds = [user.showcaseSlot1Id, user.showcaseSlot2Id, user.showcaseSlot3Id];

    const iconItems: ShopCatalogItemDto[] = shopIcons.map((icon) => ({
      id: icon.id,
      itemType: 'icon',
      code: `icon_${icon.id}`,
      name: icon.name,
      description: 'Icono exclusivo de La Bodega para tu avatar.',
      previewKey: icon.imageUrl,
      priceChapas: icon.priceChapas ?? 0,
      owned: ownedIconSet.has(icon.id),
      equipped: user.equippedIconId === icon.id,
      metadata: null,
    }));

    const titleItems: ShopCatalogItemDto[] = shopTitles.map((title) => ({
      id: title.id,
      itemType: 'title',
      code: `title_${title.id}`,
      name: title.name,
      description: 'Título de honor exclusivo de La Bodega.',
      previewKey: title.name,
      priceChapas: title.priceChapas ?? 0,
      owned: ownedTitleSet.has(title.id),
      equipped: user.equippedTitleId === title.id,
      metadata: null,
    }));

    const mapCosmetic = (c: typeof shopCosmetics[number]): ShopCatalogItemDto => ({
      id: c.id,
      itemType: c.type,
      code: c.code,
      name: c.name,
      description: c.description,
      previewKey: c.previewKey,
      priceChapas: c.priceChapas ?? 0,
      owned: ownedCosmeticSet.has(c.id),
      equipped:
        (c.type === 'frame' && user.equippedFrameId === c.id) ||
        (c.type === 'card_style' && user.equippedCardStyleId === c.id) ||
        (c.type === 'color_theme' && user.equippedColorThemeId === c.id) ||
        (c.type === 'relic' && showcaseIds.includes(c.id)),
      metadata: parseCosmeticMetadata(c.metadataJson),
    });

    const mappedCosmetics = shopCosmetics.map(mapCosmetic);

    res.json({
      chapas: user.chapas,
      categories: {
        icons: iconItems,
        titles: titleItems,
        frames: mappedCosmetics.filter((c) => c.itemType === 'frame'),
        cardStyles: mappedCosmetics.filter((c) => c.itemType === 'card_style'),
        relics: mappedCosmetics.filter((c) => c.itemType === 'relic'),
        colorThemes: mappedCosmetics.filter((c) => c.itemType === 'color_theme'),
      },
    });
  })
);

router.post(
  '/buy',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = buySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || 'Datos inválidos.');
    }

    const db = getDb();
    const userId = req.userId!;

    const itemType: ShopItemType | undefined = parsed.data.itemType;
    const targetId = parsed.data.itemId ?? parsed.data.cosmeticId!;

    if (itemType === 'icon') {
      const [icon] = await db
        .select()
        .from(schema.icons)
        .where(eq(schema.icons.id, targetId));

      if (!icon || icon.source !== 'shop' || !icon.priceChapas || icon.priceChapas <= 0) {
        throw new HttpError(404, 'Artículo no disponible en La Bodega.');
      }

      const [existing] = await db
        .select({ iconId: schema.userIcons.iconId })
        .from(schema.userIcons)
        .where(
          and(eq(schema.userIcons.userId, userId), eq(schema.userIcons.iconId, icon.id))
        );

      if (existing) {
        throw new HttpError(409, 'Ya tienes este icono en propiedad.');
      }

      const deducted = await db
        .update(schema.users)
        .set({ chapas: sql`${schema.users.chapas} - ${icon.priceChapas}` })
        .where(
          and(
            eq(schema.users.id, userId),
            gte(schema.users.chapas, icon.priceChapas)
          )
        )
        .returning({ chapas: schema.users.chapas });

      if (deducted.length === 0) {
        throw new HttpError(400, 'No tienes suficientes Chapas para comprar este icono.');
      }

      const inserted = await db
        .insert(schema.userIcons)
        .values({ userId, iconId: icon.id })
        .onConflictDoNothing()
        .returning({ iconId: schema.userIcons.iconId });

      if (inserted.length === 0) {
        await db
          .update(schema.users)
          .set({ chapas: sql`${schema.users.chapas} + ${icon.priceChapas}` })
          .where(eq(schema.users.id, userId));
        throw new HttpError(409, 'Ya tienes este icono en propiedad.');
      }

      res.json({
        newBalance: deducted[0].chapas,
        item: {
          id: icon.id,
          itemType: 'icon' as const,
          code: `icon_${icon.id}`,
          name: icon.name,
          description: 'Icono exclusivo de La Bodega para tu avatar.',
          previewKey: icon.imageUrl,
          priceChapas: icon.priceChapas,
          owned: true,
          equipped: false,
          metadata: null,
        },
      });
      return;
    }

    if (itemType === 'title') {
      const [title] = await db
        .select()
        .from(schema.titles)
        .where(eq(schema.titles.id, targetId));

      if (!title || title.source !== 'shop' || !title.priceChapas || title.priceChapas <= 0) {
        throw new HttpError(404, 'Artículo no disponible en La Bodega.');
      }

      const [existing] = await db
        .select({ titleId: schema.userTitles.titleId })
        .from(schema.userTitles)
        .where(
          and(eq(schema.userTitles.userId, userId), eq(schema.userTitles.titleId, title.id))
        );

      if (existing) {
        throw new HttpError(409, 'Ya tienes este título en propiedad.');
      }

      const deducted = await db
        .update(schema.users)
        .set({ chapas: sql`${schema.users.chapas} - ${title.priceChapas}` })
        .where(
          and(
            eq(schema.users.id, userId),
            gte(schema.users.chapas, title.priceChapas)
          )
        )
        .returning({ chapas: schema.users.chapas });

      if (deducted.length === 0) {
        throw new HttpError(400, 'No tienes suficientes Chapas para comprar este título.');
      }

      const inserted = await db
        .insert(schema.userTitles)
        .values({ userId, titleId: title.id })
        .onConflictDoNothing()
        .returning({ titleId: schema.userTitles.titleId });

      if (inserted.length === 0) {
        await db
          .update(schema.users)
          .set({ chapas: sql`${schema.users.chapas} + ${title.priceChapas}` })
          .where(eq(schema.users.id, userId));
        throw new HttpError(409, 'Ya tienes este título en propiedad.');
      }

      res.json({
        newBalance: deducted[0].chapas,
        item: {
          id: title.id,
          itemType: 'title' as const,
          code: `title_${title.id}`,
          name: title.name,
          description: 'Título de honor exclusivo de La Bodega.',
          previewKey: title.name,
          priceChapas: title.priceChapas,
          owned: true,
          equipped: false,
          metadata: null,
        },
      });
      return;
    }

    // Cosmético (frame, card_style, relic, color_theme)
    const [cosmetic] = await db
      .select()
      .from(schema.cosmetics)
      .where(eq(schema.cosmetics.id, targetId));

    if (
      !cosmetic ||
      (itemType && cosmetic.type !== itemType) ||
      cosmetic.source !== 'shop' ||
      !cosmetic.priceChapas ||
      cosmetic.priceChapas <= 0
    ) {
      throw new HttpError(404, 'Artículo no disponible en La Bodega.');
    }

    const [existing] = await db
      .select({ cosmeticId: schema.userCosmetics.cosmeticId })
      .from(schema.userCosmetics)
      .where(
        and(
          eq(schema.userCosmetics.userId, userId),
          eq(schema.userCosmetics.cosmeticId, cosmetic.id)
        )
      );

    if (existing) {
      throw new HttpError(409, 'Ya tienes este artículo en propiedad.');
    }

    const deducted = await db
      .update(schema.users)
      .set({ chapas: sql`${schema.users.chapas} - ${cosmetic.priceChapas}` })
      .where(
        and(
          eq(schema.users.id, userId),
          gte(schema.users.chapas, cosmetic.priceChapas)
        )
      )
      .returning({ chapas: schema.users.chapas });

    if (deducted.length === 0) {
      throw new HttpError(
        400,
        'No tienes suficientes Chapas para comprar este artículo.'
      );
    }

    const inserted = await db
      .insert(schema.userCosmetics)
      .values({ userId, cosmeticId: cosmetic.id, source: 'shop' })
      .onConflictDoNothing()
      .returning({ cosmeticId: schema.userCosmetics.cosmeticId });

    if (inserted.length === 0) {
      await db
        .update(schema.users)
        .set({ chapas: sql`${schema.users.chapas} + ${cosmetic.priceChapas}` })
        .where(eq(schema.users.id, userId));
      throw new HttpError(409, 'Ya tienes este artículo en propiedad.');
    }

    res.json({
      newBalance: deducted[0].chapas,
      item: {
        id: cosmetic.id,
        itemType: cosmetic.type,
        code: cosmetic.code,
        name: cosmetic.name,
        description: cosmetic.description,
        previewKey: cosmetic.previewKey,
        priceChapas: cosmetic.priceChapas,
        owned: true,
        equipped: false,
        metadata: parseCosmeticMetadata(cosmetic.metadataJson),
      },
    });
  })
);

export default router;
