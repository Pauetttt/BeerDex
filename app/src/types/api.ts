export type BeerFormat = 'lata' | 'botellin' | 'litrona';
export type CosmeticType = 'frame' | 'card_style' | 'relic' | 'color_theme';
export type ShopItemType = 'icon' | 'title' | CosmeticType;

export interface IconItem {
  id: number;
  name: string;
  imageUrl: string;
  isDefault: boolean;
  source?: string;
  priceChapas?: number | null;
  unlocked: boolean;
  equipped: boolean;
  unlockAchievementId: number | null;
  unlockAchievementName: string | null;
}

export interface TitleItem {
  id: number;
  name: string;
  isDefault: boolean;
  source?: string;
  priceChapas?: number | null;
  unlocked: boolean;
  equipped: boolean;
  unlockAchievementId: number | null;
  unlockAchievementName: string | null;
}

export type RelicTier = 'merit' | 'common' | 'epic' | 'legendary';

export interface RelicLevelEntry {
  level: number;
  value: number;
  shortTag: string;
  effectSummary: string;
  upgradeCost: number | null;
}

export interface RelicPower {
  tier: RelicTier;
  tierLabel: string;
  level: number;
  maxLevel: number;
  shortTag: string;
  effectSummary: string;
  nextLevelEffectSummary: string | null;
  nextUpgradeCost: number | null;
  requiresFullShowcase: boolean;
  levels: RelicLevelEntry[];
}

export interface ActiveRelicEffectItem {
  slot: 1 | 2 | 3;
  relicId: number;
  code: string;
  name: string;
  tier: RelicTier;
  level: number;
  shortTag: string;
  effectSummary: string;
  active: boolean;
}

export interface ActiveRelicsSummary {
  activeCount: number;
  maxSlots: number;
  fullShowcaseActive: boolean;
  shopDiscountPct: number;
  effects: ActiveRelicEffectItem[];
}

export interface CosmeticItem {
  id: number;
  code: string;
  type: CosmeticType;
  name: string;
  description: string;
  previewKey: string;
  source: string;
  priceChapas: number | null;
  unlocked: boolean;
  equipped: boolean;
  unlockAchievementId: number | null;
  unlockAchievementName: string | null;
  metadata: Record<string, unknown> | null;
  relicPower?: RelicPower | null;
}

export interface ShopItem {
  id: number;
  itemType: ShopItemType;
  code: string;
  name: string;
  description: string;
  previewKey: string;
  priceChapas: number;
  basePriceChapas?: number;
  discountPct?: number;
  owned: boolean;
  equipped: boolean;
  metadata: Record<string, unknown> | null;
  relicPower?: RelicPower | null;
}

export interface ShopResponse {
  chapas: number;
  shopDiscountPct?: number;
  categories: {
    icons: ShopItem[];
    titles: ShopItem[];
    frames: ShopItem[];
    cardStyles: ShopItem[];
    relics: ShopItem[];
    colorThemes: ShopItem[];
  };
}

export interface ShopBuyResponse {
  newBalance: number;
  item: ShopItem;
}

export interface RelicUpgradeResponse {
  newBalance: number;
  relicId: number;
  newLevel: number;
  upgradeCostPaid: number;
  profile: MeProfileResponse;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  chapas: number;
  equippedIconId: number;
  equippedTitleId: number;
  equippedFrameId?: number | null;
  equippedCardStyleId?: number | null;
  equippedColorThemeId?: number | null;
  equippedIcon: {
    id: number;
    name: string;
    imageUrl: string;
  };
  equippedTitle: {
    id: number;
    name: string;
  };
  equippedFrame?: CosmeticItem | null;
  equippedCardStyle?: CosmeticItem | null;
  equippedColorTheme?: CosmeticItem | null;
  showcaseRelics?: Array<CosmeticItem | null>;
  flipsReadCount: number;
  profilesVisitedCount: number;
}

export interface NewlyUnlockedItem {
  id: number;
  code: string;
  name: string;
  description: string;
  rewardChapas?: number;
  rewardTitle: { id: number; name: string } | null;
  rewardIcon: { id: number; name: string; imageUrl: string } | null;
  rewardCosmetic?: {
    id: number;
    code: string;
    type: CosmeticType;
    name: string;
    previewKey: string;
  } | null;
}

export interface MeProfileResponse {
  user: AuthUser;
  stats: {
    beersRegistered: number;
    beersTotal: number;
    achievementsUnlocked: number;
    achievementsTotal: number;
  };
  activeRelicsSummary?: ActiveRelicsSummary;
  icons: IconItem[];
  titles: TitleItem[];
  cosmetics: {
    frames: CosmeticItem[];
    cardStyles: CosmeticItem[];
    relics: CosmeticItem[];
    colorThemes: CosmeticItem[];
  };
  newlyUnlocked?: NewlyUnlockedItem[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface BeerDexBeerLocked {
  id: number;
  brandId: number;
  name: string;
  format: BeerFormat;
  style?: string;
  unlocked: false;
}

export interface CommunityBeerRating {
  average: number;
  count: number;
}

export interface BeerDexBeerUnlocked {
  id: number;
  brandId: number;
  name: string;
  format: BeerFormat;
  unlocked: true;
  shortHistory: string;
  style: string;
  abv: number;
  country: string;
  userBeer: {
    id: string;
    photoUrl: string;
    rating: number;
    registeredAt: string;
  };
  communityRating?: CommunityBeerRating;
}

export type BeerDexItem = BeerDexBeerLocked | BeerDexBeerUnlocked;

export interface BrandDexItem {
  id: number;
  name: string;
  logoUrl: string | null;
  history: string | null;
  registeredCount: number;
  totalCount: number;
  beers: BeerDexItem[];
}

export interface BeerDexResponse {
  global: {
    registeredCount: number;
    totalCount: number;
  };
  brands: BrandDexItem[];
}

export interface BarcodeLookupBeerItem {
  id: number;
  brandId: number;
  brandName: string;
  name: string;
  format: BeerFormat;
  barcode: string;
  style: string;
  abv: number;
  country: string;
  alreadyRegistered?: boolean;
}

export interface BarcodeLookupResponse {
  valid: boolean;
  needsVarietyConfirm?: boolean;
  isPack?: boolean;
  scanVerificationToken?: string;
  antiCheat?: {
    verified: boolean;
    skipped?: boolean;
    es_pantalla: boolean;
    tipo_detectado: string;
    motivo?: string;
  };
  beer: BarcodeLookupBeerItem;
  brandBeers?: BarcodeLookupBeerItem[];
}

export interface RegisterBeerTabernaUpdate {
  tabernaId: string;
  tabernaName: string;
  slotLabel: string | null;
  milestonesReached: string[];
  chapasEarned: number;
  pointsAwarded: number;
}

export interface RegisterBeerResponse {
  userBeer: {
    id: string;
    beerId: number;
    photoUrl: string;
    rating: number;
    registeredAt: string;
  };
  communityRating?: CommunityBeerRating;
  newlyUnlocked: NewlyUnlockedItem[];
  chapasEarned?: number;
  baseChapas?: number;
  completedBrandBonus?: number;
  relicBonusChapas?: number;
  relicBonuses?: Array<{
    code: string;
    name: string;
    level: number;
    chapasAdded: number;
    label: string;
  }>;
  achievementChapas?: number;
  tabernaChapas?: number;
  tabernaUpdates?: RegisterBeerTabernaUpdate[];
  totalChapas?: number;
}

export interface AchievementItem {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
  targetValue: number;
  currentProgress: number;
  unlocked: boolean;
  unlockedAt: string | null;
  rewardChapas: number;
  rewardTitle: { id: number; name: string } | null;
  rewardIcon: { id: number; name: string; imageUrl: string } | null;
  rewardCosmetic?: {
    id: number;
    code: string;
    type: CosmeticType;
    name: string;
    previewKey: string;
  } | null;
}

export interface AchievementsResponse {
  achievements: AchievementItem[];
  unlockedCount: number;
  totalCount: number;
}

export interface FriendFrameSummary {
  id: number;
  code: string;
  name: string;
  previewKey: string;
  metadata: Record<string, unknown> | null;
}

export interface FriendUserSummary {
  id: string;
  username: string;
  equippedIcon: { id: number; name: string; imageUrl: string };
  equippedTitle: { id: number; name: string };
  equippedFrame?: FriendFrameSummary | null;
  beersCount: number;
  beersTotal?: number;
}

export interface FriendItem {
  friendshipId: string;
  since: string;
  user: FriendUserSummary;
}

export interface FriendRequestEntry {
  id: string;
  createdAt: string;
  user: FriendUserSummary;
}

export interface FriendRequestsResponse {
  received: FriendRequestEntry[];
  sent: FriendRequestEntry[];
}

export interface UserSearchItem extends FriendUserSummary {
  relationshipStatus: 'none' | 'pending' | 'accepted' | 'rejected';
  relationshipDirection: 'sent' | 'received' | null;
  friendshipId: string | null;
}

export interface FriendRankingEntry extends FriendUserSummary {
  rank: number;
  beersTotal: number;
  achievementsUnlocked: number;
  isSelf: boolean;
}

export interface ComparisonBeerEntry {
  beerId: number;
  name: string;
  format: BeerFormat;
  brandName: string;
}

export interface ProfileComparison {
  commonBeersCount: number;
  onlyViewerBeersCount: number;
  onlyTargetBeersCount: number;
  commonBeers: ComparisonBeerEntry[];
  onlyTargetBeers: ComparisonBeerEntry[];
}

export interface BeerSuggestionItem {
  id: string;
  barcode: string;
  brandName: string;
  beerName: string;
  format: BeerFormat;
  notes: string | null;
  status: string;
  createdAt: string;
}

export interface PublicProfileResponse {
  user: {
    id: string;
    username: string;
    createdAt: string;
    equippedIcon: { id: number; name: string; imageUrl: string } | null;
    equippedTitle: { id: number; name: string } | null;
    equippedFrame?: CosmeticItem | null;
    equippedCardStyle?: CosmeticItem | null;
    equippedColorTheme?: CosmeticItem | null;
    showcaseRelics?: Array<CosmeticItem | null>;
  };
  isFriend: boolean;
  beerdexProgress: {
    registeredCount: number;
    totalCount: number;
  };
  comparison?: ProfileComparison;
  achievements: AchievementItem[];
  achievementsSummary: {
    unlockedCount: number;
    totalCount: number;
  };
  newlyUnlocked: NewlyUnlockedItem[];
}

export type TabernaVisibility = 'public' | 'private';
export type TabernaRole = 'leader' | 'member';
export type TabernaGameType = 'bingo' | 'escalera' | 'ruta' | 'tridente' | 'cata';

export interface BingoCellConfig {
  index: number;
  beerId: number;
  beerName: string;
  brandName: string;
  style: string;
  abv: number;
  format: BeerFormat;
  country: string;
}

export interface EscaleraStepConfig {
  index: number;
  key: string;
  label: string;
  minAbv: number | null;
  maxAbv: number | null;
}

export interface RutaCountryConfig {
  key: string;
  name: string;
}

export interface TridenteChallengeConfig {
  id: string;
  title: string;
  description: string;
  ruleType: 'country_not_spain' | 'abv_gte' | 'style' | 'format';
  ruleValue: string | number;
}

export interface TabernaMissionConfig {
  cells?: BingoCellConfig[];
  steps?: EscaleraStepConfig[];
  countries?: RutaCountryConfig[];
  targetCount?: number;
  challenges?: TridenteChallengeConfig[];
  style?: string;
  targetTotal?: number;
}

export interface TabernaMissionProgress {
  markedCells?: Record<
    string,
    { beerId: number; userId: string; username: string; markedAt: string }
  >;
  completedLines?: string[];
  completedSteps?: Record<
    string,
    {
      beerId: number;
      beerName: string;
      abv: number;
      userId: string;
      username: string;
      completedAt: string;
    }
  >;
  currentStepIndex?: number;
  completedCountries?: Record<
    string,
    { beerId: number; beerName: string; userId: string; username: string; completedAt: string }
  >;
  memberProgress?: Record<
    string,
    {
      completedChallengeIds: string[];
      beersByChallenge: Record<
        string,
        { beerId: number; beerName: string; completedAt: string }
      >;
      completedAt: string | null;
    }
  >;
  totalCount?: number;
  leaderboard?: Record<string, { username: string; count: number; lastAt: string }>;
  flawless?: boolean;
}

export interface TabernaContributionItem {
  id: number;
  userId: string;
  username: string;
  beerId: number;
  beerName: string;
  brandName: string;
  slotKey: string | null;
  createdAt: string;
}

export interface TabernaMissionDto {
  id: string;
  tabernaId: string;
  month: string;
  gameType: TabernaGameType;
  title: string;
  subtitle: string;
  status: 'active' | 'completed' | 'expired';
  config: TabernaMissionConfig;
  progress: TabernaMissionProgress;
  pointsAwarded: number;
  completionPct: number;
  completedCount: number;
  totalTarget: number;
  createdAt: string;
  completedAt: string | null;
  recentContributions: TabernaContributionItem[];
}

export interface TabernaSummary {
  id: string;
  name: string;
  description: string;
  visibility: TabernaVisibility;
  minBeers: number;
  leaderId: string;
  founderId: string | null;
  level: number;
  points: number;
  nextLevelPoints: number | null;
  memberCount: number;
  maxMembers: number;
  myRole: TabernaRole | null;
  pendingRequestId: string | null;
  cooldownUntil: string | null;
  currentMission: {
    id: string;
    month: string;
    gameType: TabernaGameType;
    title: string;
    status: 'active' | 'completed' | 'expired';
    completionPct: number;
  } | null;
  createdAt: string;
}

export type TabernaExploreItem = TabernaSummary;

export interface TabernaMemberItem {
  userId: string;
  username: string;
  role: TabernaRole;
  joinedAt: string;
  beersCount: number;
  equippedIcon: { id: number; name: string; imageUrl: string };
  equippedTitle: { id: number; name: string };
  equippedFrame: FriendFrameSummary | null;
}

export interface TabernaRequestItem {
  id: string;
  tabernaId: string;
  userId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  user: {
    id: string;
    username: string;
    beersCount: number;
    equippedIcon: { id: number; name: string; imageUrl: string };
    equippedTitle: { id: number; name: string };
    equippedFrame: FriendFrameSummary | null;
  };
}

export interface TabernaDetailResponse {
  taberna: TabernaSummary;
  members: TabernaMemberItem[];
  mission: TabernaMissionDto;
  myRole: TabernaRole | null;
  myBeersCount: number;
  pendingRequestsCount: number;
}

export interface TabernaScanResponse {
  status:
    | 'valid'
    | 'already_contributed'
    | 'invalid'
    | 'mission_completed'
    | 'needs_variety_confirm';
  message: string;
  taberna: {
    id: string;
    name: string;
    level: number;
    points: number;
    nextLevelPoints: number | null;
  };
  beer: BarcodeLookupBeerItem;
  brandBeers?: BarcodeLookupBeerItem[];
  slotKey?: string | null;
  slotLabel?: string | null;
  milestonesReached: string[];
  chapasEarned: number;
  pointsAwarded: number;
  levelUp: {
    fromLevel: number;
    toLevel: number;
    chapasPerMember: number;
  } | null;
  newlyUnlocked: NewlyUnlockedItem[];
  mission: TabernaMissionDto;
}

export interface TabernaRankingEntry {
  rank: number;
  id: string;
  name: string;
  description: string;
  visibility: TabernaVisibility;
  level: number;
  points: number;
  monthlyPoints: number;
  memberCount: number;
  maxMembers: number;
  isMember: boolean;
  currentGameType: TabernaGameType | null;
}

export interface TabernaRankingResponse {
  scope: 'global' | 'monthly';
  month: string;
  ranking: TabernaRankingEntry[];
}
