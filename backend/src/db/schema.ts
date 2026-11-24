import { sql } from 'drizzle-orm';
import {
  AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const beerFormatEnum = pgEnum('beer_format', ['lata', 'botellin', 'litrona']);
export const friendshipStatusEnum = pgEnum('friendship_status', [
  'pending',
  'accepted',
  'rejected',
]);
export const cosmeticTypeEnum = pgEnum('cosmetic_type', [
  'frame',
  'card_style',
  'relic',
  'color_theme',
]);

export const icons = pgTable('icons', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  imageUrl: text('image_url').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  source: varchar('source', { length: 20 }).default('achievement').notNull(),
  priceChapas: integer('price_chapas'),
  unlockAchievementId: integer('unlock_achievement_id').references(
    (): AnyPgColumn => achievements.id,
    { onDelete: 'set null' }
  ),
});

export const titles = pgTable('titles', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  isDefault: boolean('is_default').default(false).notNull(),
  source: varchar('source', { length: 20 }).default('achievement').notNull(),
  priceChapas: integer('price_chapas'),
  unlockAchievementId: integer('unlock_achievement_id').references(
    (): AnyPgColumn => achievements.id,
    { onDelete: 'set null' }
  ),
});

export const cosmetics = pgTable('cosmetics', {
  id: integer('id').primaryKey(),
  code: varchar('code', { length: 80 }).notNull().unique(),
  type: cosmeticTypeEnum('type').notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  description: text('description').notNull(),
  previewKey: varchar('preview_key', { length: 120 }).notNull(),
  source: varchar('source', { length: 20 }).default('achievement').notNull(),
  priceChapas: integer('price_chapas'),
  unlockAchievementId: integer('unlock_achievement_id').references(
    (): AnyPgColumn => achievements.id,
    { onDelete: 'set null' }
  ),
  metadataJson: text('metadata_json'),
});

export const achievements = pgTable('achievements', {
  id: integer('id').primaryKey(),
  code: varchar('code', { length: 80 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 60 }).notNull(),
  targetValue: integer('target_value').notNull(),
  rewardChapas: integer('reward_chapas').default(0).notNull(),
  rewardTitleId: integer('reward_title_id').references(() => titles.id, {
    onDelete: 'set null',
  }),
  rewardIconId: integer('reward_icon_id').references(() => icons.id, {
    onDelete: 'set null',
  }),
  rewardCosmeticId: integer('reward_cosmetic_id').references(
    (): AnyPgColumn => cosmetics.id,
    { onDelete: 'set null' }
  ),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 60 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  chapas: integer('chapas').default(0).notNull(),
  chapasBackfilled: boolean('chapas_backfilled').default(false).notNull(),
  equippedIconId: integer('equipped_icon_id')
    .default(1)
    .notNull()
    .references(() => icons.id),
  equippedTitleId: integer('equipped_title_id')
    .default(1)
    .notNull()
    .references(() => titles.id),
  equippedFrameId: integer('equipped_frame_id').references(() => cosmetics.id, {
    onDelete: 'set null',
  }),
  equippedCardStyleId: integer('equipped_card_style_id').references(() => cosmetics.id, {
    onDelete: 'set null',
  }),
  equippedColorThemeId: integer('equipped_color_theme_id').references(() => cosmetics.id, {
    onDelete: 'set null',
  }),
  showcaseSlot1Id: integer('showcase_slot_1_id').references(() => cosmetics.id, {
    onDelete: 'set null',
  }),
  showcaseSlot2Id: integer('showcase_slot_2_id').references(() => cosmetics.id, {
    onDelete: 'set null',
  }),
  showcaseSlot3Id: integer('showcase_slot_3_id').references(() => cosmetics.id, {
    onDelete: 'set null',
  }),
  flipsReadCount: integer('flips_read_count').default(0).notNull(),
  profilesVisitedCount: integer('profiles_visited_count').default(0).notNull(),
  hasChangedIcon: boolean('has_changed_icon').default(false).notNull(),
  hasEquippedUnlockedTitle: boolean('has_equipped_unlocked_title').default(false).notNull(),
  hasRegisteredPack: boolean('has_registered_pack').default(false).notNull(),
  hasSubmittedSuggestion: boolean('has_submitted_suggestion').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const brands = pgTable('brands', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull().unique(),
  logoUrl: text('logo_url'),
  history: text('history'),
});

export const beers = pgTable(
  'beers',
  {
    id: serial('id').primaryKey(),
    brandId: integer('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    format: beerFormatEnum('format').notNull(),
    barcode: varchar('barcode', { length: 13 }).notNull().unique(),
    shortHistory: varchar('short_history', { length: 150 }).notNull(),
    style: varchar('style', { length: 80 }).notNull(),
    abv: numeric('abv', { precision: 4, scale: 2 }).notNull(),
    country: varchar('country', { length: 80 }).notNull(),
  },
  (table) => [index('beers_brand_id_idx').on(table.brandId)]
);

export const userBeers = pgTable(
  'user_beers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    beerId: integer('beer_id')
      .notNull()
      .references(() => beers.id, { onDelete: 'cascade' }),
    photoUrl: text('photo_url').notNull(),
    rating: integer('rating').notNull(),
    registeredAt: timestamp('registered_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('user_beers_user_beer_unique').on(table.userId, table.beerId),
    check('user_beers_rating_check', sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
    index('user_beers_user_id_idx').on(table.userId),
  ]
);

export const userAchievements = pgTable(
  'user_achievements',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    achievementId: integer('achievement_id')
      .notNull()
      .references(() => achievements.id, { onDelete: 'cascade' }),
    currentProgress: integer('current_progress').default(0).notNull(),
    unlocked: boolean('unlocked').default(false).notNull(),
    unlockedAt: timestamp('unlocked_at', { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.achievementId] })]
);

export const friendships = pgTable(
  'friendships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addresseeId: uuid('addressee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: friendshipStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('friendships_requester_addressee_unique').on(table.requesterId, table.addresseeId),
    check('friendships_not_self_check', sql`${table.requesterId} <> ${table.addresseeId}`),
    index('friendships_requester_status_idx').on(table.requesterId, table.status),
    index('friendships_addressee_status_idx').on(table.addresseeId, table.status),
  ]
);

export const userBeerFlips = pgTable(
  'user_beer_flips',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    beerId: integer('beer_id')
      .notNull()
      .references(() => beers.id, { onDelete: 'cascade' }),
    flippedAt: timestamp('flipped_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.beerId] })]
);

export const userProfileVisits = pgTable(
  'user_profile_visits',
  {
    visitorId: uuid('visitor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    visitedUserId: uuid('visited_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    visitedAt: timestamp('visited_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.visitorId, table.visitedUserId] })]
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('refresh_tokens_user_id_idx').on(table.userId)]
);

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const beerSuggestions = pgTable(
  'beer_suggestions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    barcode: varchar('barcode', { length: 13 }).notNull(),
    brandName: varchar('brand_name', { length: 120 }).notNull(),
    beerName: varchar('beer_name', { length: 150 }).notNull(),
    format: beerFormatEnum('format').notNull(),
    notes: text('notes'),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('beer_suggestions_barcode_idx').on(table.barcode),
    index('beer_suggestions_user_id_idx').on(table.userId),
  ]
);

export const userCosmetics = pgTable(
  'user_cosmetics',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    cosmeticId: integer('cosmetic_id')
      .notNull()
      .references(() => cosmetics.id, { onDelete: 'cascade' }),
    source: varchar('source', { length: 20 }).default('shop').notNull(),
    acquiredAt: timestamp('acquired_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.cosmeticId] })]
);

export const userIcons = pgTable(
  'user_icons',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    iconId: integer('icon_id')
      .notNull()
      .references(() => icons.id, { onDelete: 'cascade' }),
    acquiredAt: timestamp('acquired_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.iconId] })]
);

export const userTitles = pgTable(
  'user_titles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    titleId: integer('title_id')
      .notNull()
      .references(() => titles.id, { onDelete: 'cascade' }),
    acquiredAt: timestamp('acquired_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.titleId] })]
);

export const userCompletedBrands = pgTable(
  'user_completed_brands',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    brandId: integer('brand_id')
      .notNull()
      .references(() => brands.id, { onDelete: 'cascade' }),
    rewardedAt: timestamp('rewarded_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.brandId] })]
);
