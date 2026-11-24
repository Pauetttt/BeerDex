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
}

export interface ShopItem {
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

export interface ShopResponse {
  chapas: number;
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

export interface RegisterBeerResponse {
  userBeer: {
    id: string;
    beerId: number;
    photoUrl: string;
    rating: number;
    registeredAt: string;
  };
  newlyUnlocked: NewlyUnlockedItem[];
  chapasEarned?: number;
  baseChapas?: number;
  completedBrandBonus?: number;
  achievementChapas?: number;
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
