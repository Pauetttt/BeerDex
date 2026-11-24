import { sql } from 'drizzle-orm';
import {
  AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
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
  (table) => [
    primaryKey({ columns: [table.userId, table.achievementId] }),
    index('user_achievements_user_unlocked_idx').on(table.userId, table.unlocked),
  ]
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
    level: integer('level').default(1).notNull(),
    acquiredAt: timestamp('acquired_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.cosmeticId] }),
    check('user_cosmetics_level_check', sql`${table.level} >= 1 AND ${table.level} <= 5`),
  ]
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

// ======================= TABERNAS (multijugador) =======================

export const tabernaVisibilityEnum = pgEnum('taberna_visibility', ['public', 'private']);
export const tabernaRoleEnum = pgEnum('taberna_role', ['leader', 'member']);
export const tabernaRequestStatusEnum = pgEnum('taberna_request_status', [
  'pending',
  'accepted',
  'rejected',
]);
export const tabernaGameTypeEnum = pgEnum('taberna_game_type', [
  'bingo',
  'escalera',
  'ruta',
  'tridente',
  'cata',
]);
export const tabernaMissionStatusEnum = pgEnum('taberna_mission_status', [
  'active',
  'completed',
  'expired',
]);

export const tabernas = pgTable(
  'tabernas',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 30 }).notNull(),
    description: varchar('description', { length: 200 }).default('').notNull(),
    visibility: tabernaVisibilityEnum('visibility').default('public').notNull(),
    minBeers: integer('min_beers').default(0).notNull(),
    leaderId: uuid('leader_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    founderId: uuid('founder_id').references(() => users.id, { onDelete: 'set null' }),
    level: integer('level').default(1).notNull(),
    points: integer('points').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('tabernas_name_lower_unique').on(sql`lower(${table.name})`),
    index('tabernas_ranking_idx').on(table.level, table.points),
    check('tabernas_min_beers_check', sql`${table.minBeers} >= 0`),
    check('tabernas_level_check', sql`${table.level} >= 1 AND ${table.level} <= 20`),
  ]
);

export const tabernaMembers = pgTable(
  'taberna_members',
  {
    tabernaId: uuid('taberna_id')
      .notNull()
      .references(() => tabernas.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: tabernaRoleEnum('role').default('member').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.tabernaId, table.userId] }),
    index('taberna_members_user_id_idx').on(table.userId),
  ]
);

export const tabernaRequests = pgTable(
  'taberna_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tabernaId: uuid('taberna_id')
      .notNull()
      .references(() => tabernas.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: tabernaRequestStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('taberna_requests_pending_unique')
      .on(table.tabernaId, table.userId)
      .where(sql`${table.status} = 'pending'`),
    index('taberna_requests_taberna_status_idx').on(table.tabernaId, table.status),
  ]
);

export const tabernaCooldowns = pgTable(
  'taberna_cooldowns',
  {
    tabernaId: uuid('taberna_id')
      .notNull()
      .references(() => tabernas.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    until: timestamp('until', { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.tabernaId, table.userId] })]
);

export const tabernaMissions = pgTable(
  'taberna_missions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tabernaId: uuid('taberna_id')
      .notNull()
      .references(() => tabernas.id, { onDelete: 'cascade' }),
    month: varchar('month', { length: 7 }).notNull(),
    gameType: tabernaGameTypeEnum('game_type').notNull(),
    config: jsonb('config').$type<Record<string, unknown>>().default({}).notNull(),
    status: tabernaMissionStatusEnum('status').default('active').notNull(),
    progress: jsonb('progress').$type<Record<string, unknown>>().default({}).notNull(),
    pointsAwarded: integer('points_awarded').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    unique('taberna_missions_taberna_month_unique').on(table.tabernaId, table.month),
    index('taberna_missions_month_idx').on(table.month),
  ]
);

export const tabernaContributions = pgTable(
  'taberna_contributions',
  {
    id: serial('id').primaryKey(),
    missionId: uuid('mission_id')
      .notNull()
      .references(() => tabernaMissions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    beerId: integer('beer_id')
      .notNull()
      .references(() => beers.id, { onDelete: 'cascade' }),
    slotKey: varchar('slot_key', { length: 80 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('taberna_contributions_mission_user_beer_unique').on(
      table.missionId,
      table.userId,
      table.beerId
    ),
    index('taberna_contributions_mission_idx').on(table.missionId),
    index('taberna_contributions_mission_user_idx').on(table.missionId, table.userId),
  ]
);

export const tabernaMissionMilestones = pgTable(
  'taberna_mission_milestones',
  {
    missionId: uuid('mission_id')
      .notNull()
      .references(() => tabernaMissions.id, { onDelete: 'cascade' }),
    milestoneKey: varchar('milestone_key', { length: 40 }).notNull(),
    reachedAt: timestamp('reached_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      name: 'taberna_mission_milestones_pk',
      columns: [table.missionId, table.milestoneKey],
    }),
  ]
);

export const tabernaRewardsClaimed = pgTable(
  'taberna_rewards_claimed',
  {
    missionId: uuid('mission_id')
      .notNull()
      .references(() => tabernaMissions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    milestoneKey: varchar('milestone_key', { length: 40 }).notNull(),
    chapas: integer('chapas').default(0).notNull(),
    claimedAt: timestamp('claimed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      name: 'taberna_rewards_claimed_pk',
      columns: [table.missionId, table.userId, table.milestoneKey],
    }),
  ]
);

export const tabernaLevelRewards = pgTable(
  'taberna_level_rewards',
  {
    tabernaId: uuid('taberna_id')
      .notNull()
      .references(() => tabernas.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    level: integer('level').notNull(),
    chapas: integer('chapas').default(0).notNull(),
    claimedAt: timestamp('claimed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      name: 'taberna_level_rewards_pk',
      columns: [table.tabernaId, table.userId, table.level],
    }),
  ]
);

export const tabernaMonthClosures = pgTable('taberna_month_closures', {
  month: varchar('month', { length: 7 }).primaryKey(),
  closedAt: timestamp('closed_at', { withTimezone: true }).defaultNow().notNull(),
});
