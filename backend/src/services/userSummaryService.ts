import { inArray, sql } from 'drizzle-orm';
import { AppDatabase, schema } from '../db';
import {
  getCachedCosmetics,
  getCachedIcons,
  getCachedTitles,
} from './catalogCache';

export interface UserFrameSummaryDto {
  id: number;
  code: string;
  name: string;
  previewKey: string;
  metadata: Record<string, unknown> | null;
}

export interface SharedUserSummaryDto {
  id: string;
  username: string;
  equippedIcon: { id: number; name: string; imageUrl: string };
  equippedTitle: { id: number; name: string };
  equippedFrame: UserFrameSummaryDto | null;
  beersCount: number;
}

export function parseMetadataJsonSafe(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function buildSharedUserSummaryMap(
  db: AppDatabase,
  userIds: string[]
): Promise<Map<string, SharedUserSummaryDto>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const [userRows, allIcons, allTitles, allCosmetics, beerCountRows] = await Promise.all([
    db.select().from(schema.users).where(inArray(schema.users.id, uniqueIds)),
    getCachedIcons(db),
    getCachedTitles(db),
    getCachedCosmetics(db),
    db
      .select({
        userId: schema.userBeers.userId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.userBeers)
      .where(inArray(schema.userBeers.userId, uniqueIds))
      .groupBy(schema.userBeers.userId),
  ]);

  const iconMap = new Map(allIcons.map((i) => [i.id, i]));
  const titleMap = new Map(allTitles.map((t) => [t.id, t]));
  const cosmeticMap = new Map(allCosmetics.map((c) => [c.id, c]));
  const defaultFrame = allCosmetics.find((c) => c.type === 'frame' && c.source === 'default');

  const beerCounts = new Map<string, number>();
  for (const row of beerCountRows) {
    beerCounts.set(row.userId, Number(row.count) || 0);
  }

  const result = new Map<string, SharedUserSummaryDto>();

  for (const u of userRows) {
    const icon = iconMap.get(u.equippedIconId) ?? {
      id: 1,
      name: 'Jarra Clásica',
      imageUrl: 'icon://mug-classic',
    };
    const title = titleMap.get(u.equippedTitleId) ?? {
      id: 1,
      name: 'Cervecero Novato',
    };
    const frameRow =
      (u.equippedFrameId ? cosmeticMap.get(u.equippedFrameId) : undefined) ?? defaultFrame;

    result.set(u.id, {
      id: u.id,
      username: u.username,
      equippedIcon: { id: icon.id, name: icon.name, imageUrl: icon.imageUrl },
      equippedTitle: { id: title.id, name: title.name },
      equippedFrame: frameRow
        ? {
            id: frameRow.id,
            code: frameRow.code,
            name: frameRow.name,
            previewKey: frameRow.previewKey,
            metadata: parseMetadataJsonSafe(frameRow.metadataJson),
          }
        : null,
      beersCount: beerCounts.get(u.id) || 0,
    });
  }

  return result;
}
