import {
  AchievementsResponse,
  AuthResponse,
  BarcodeLookupResponse,
  BeerDexResponse,
  BeerFormat,
  BeerSuggestionItem,
  FriendItem,
  FriendRankingEntry,
  FriendRequestsResponse,
  MeProfileResponse,
  NewlyUnlockedItem,
  PublicProfileResponse,
  RegisterBeerResponse,
  RelicUpgradeResponse,
  ShopBuyResponse,
  ShopItemType,
  ShopResponse,
  TabernaDetailResponse,
  TabernaExploreItem,
  TabernaMissionDto,
  TabernaRankingResponse,
  TabernaRequestItem,
  TabernaScanResponse,
  TabernaSummary,
  TabernaVisibility,
  UserSearchItem,
} from '../types/api';
import { clearTokens, getTokens, setTokens } from './tokenStorage';

function resolveRawApiUrl(): string {
  const configured = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  if (
    typeof window !== 'undefined' &&
    window.location?.hostname &&
    !['localhost', '127.0.0.1'].includes(window.location.hostname)
  ) {
    return '/api';
  }
  return 'http://localhost:3001/api';
}

const RAW_API_URL = resolveRawApiUrl();

export const API_BASE_URL = RAW_API_URL;
export const API_ORIGIN = RAW_API_URL.replace(/\/api$/, '');

export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('/')) {
    return `${API_ORIGIN}${url}`;
  }
  return url;
}

export class ApiError extends Error {
  status: number;
  data?: Record<string, unknown>;

  constructor(status: number, message: string, data?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

let refreshInFlight: Promise<string | null> | null = null;
let authSessionEpoch = 0;
let onUnauthorizedCallback: (() => void) | null = null;

export function invalidateAuthSession(): void {
  authSessionEpoch += 1;
  refreshInFlight = null;
}

export function setOnUnauthorizedHandler(cb: (() => void) | null): void {
  onUnauthorizedCallback = cb;
}

async function performRefresh(): Promise<string | null> {
  const epoch = authSessionEpoch;
  const { refreshToken } = await getTokens();
  if (!refreshToken) {
    if (epoch === authSessionEpoch) {
      await clearTokens();
      onUnauthorizedCallback?.();
    }
    return null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (epoch !== authSessionEpoch) {
      return null;
    }
    if (!res.ok) {
      if (epoch === authSessionEpoch) {
        await clearTokens();
        onUnauthorizedCallback?.();
      }
      return null;
    }
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    if (epoch !== authSessionEpoch) {
      return null;
    }
    await setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    auth?: boolean;
    retryOn401?: boolean;
  } = {}
): Promise<T> {
  const { method = 'GET', body, auth = true, retryOn401 = true } = options;

  const headers: Record<string, string> = {};
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  if (!isFormData && body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const { accessToken } = await getTokens();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && retryOn401) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      return request<T>(path, { method, body, auth, retryOn401: false });
    }
  }

  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  if (text) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = { error: text };
    }
  }

  if (!res.ok) {
    const message =
      typeof parsed.error === 'string'
        ? parsed.error
        : `Error de servidor (${res.status})`;
    throw new ApiError(res.status, message, parsed);
  }

  return parsed as unknown as T;
}

export const authApi = {
  register(payload: { email: string; username: string; password: string }) {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: payload,
      auth: false,
    });
  },
  login(payload: { username: string; password: string }) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: payload,
      auth: false,
    });
  },
  logout(refreshToken: string | null) {
    return request<{ ok: boolean }>('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    });
  },
  forgotPassword(email: string) {
    return request<{
      ok: boolean;
      message: string;
      devResetCode?: string;
      devUsername?: string;
    }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
      auth: false,
    });
  },
  resetPassword(payload: { token: string; newPassword: string }) {
    return request<{ ok: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: payload,
      auth: false,
    });
  },
};

export const meApi = {
  getProfile() {
    return request<MeProfileResponse>('/me');
  },
  equip(payload: {
    equippedIconId?: number;
    equippedTitleId?: number;
    equippedFrameId?: number;
    equippedCardStyleId?: number;
    equippedColorThemeId?: number;
    showcaseSlot1Id?: number | null;
    showcaseSlot2Id?: number | null;
    showcaseSlot3Id?: number | null;
  }) {
    return request<MeProfileResponse>('/me', {
      method: 'PATCH',
      body: payload,
    });
  },
  changePassword(payload: { currentPassword: string; newPassword: string }) {
    return request<{ ok: boolean; message: string }>('/me/password', {
      method: 'PATCH',
      body: payload,
    });
  },
  deleteAccount(password: string) {
    return request<{ ok: boolean }>('/me', {
      method: 'DELETE',
      body: { password },
    });
  },
};

export const beerdexApi = {
  getDex() {
    return request<BeerDexResponse>('/beerdex');
  },
  lookupBarcode(code: string) {
    return request<BarcodeLookupResponse>(
      `/beers/barcode/${encodeURIComponent(code.trim())}`
    );
  },
  verifyScan(payload: { code: string; frameBase64: string }) {
    return request<BarcodeLookupResponse>('/beers/verify-scan', {
      method: 'POST',
      body: payload,
    });
  },
  registerBeer(payload: {
    beerId: number;
    rating: number;
    photoBase64?: string;
    photoUri?: string;
    scannedViaPack?: boolean;
    scanVerificationToken?: string;
  }) {
    if (payload.photoBase64) {
      return request<RegisterBeerResponse>('/beers/register', {
        method: 'POST',
        body: {
          beerId: payload.beerId,
          rating: payload.rating,
          photoBase64: payload.photoBase64,
          scannedViaPack: Boolean(payload.scannedViaPack),
          scanVerificationToken: payload.scanVerificationToken,
        },
      });
    }

    const formData = new FormData();
    formData.append('beerId', String(payload.beerId));
    formData.append('rating', String(payload.rating));
    if (payload.scannedViaPack) {
      formData.append('scannedViaPack', 'true');
    }
    if (payload.scanVerificationToken) {
      formData.append('scanVerificationToken', payload.scanVerificationToken);
    }
    formData.append('photo', {
      uri: payload.photoUri,
      name: 'beer.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);

    return request<RegisterBeerResponse>('/beers/register', {
      method: 'POST',
      body: formData,
    });
  },
  recordFlip(beerId: number) {
    return request<{ flipsReadCount: number; newlyUnlocked: NewlyUnlockedItem[] }>(
      `/beers/${beerId}/flip`,
      { method: 'POST' }
    );
  },
  createSuggestion(payload: {
    barcode: string;
    brandName: string;
    beerName: string;
    format: BeerFormat;
    notes?: string;
  }) {
    return request<{
      suggestion: BeerSuggestionItem;
      newlyUnlocked?: NewlyUnlockedItem[];
    }>('/beers/suggestions', {
      method: 'POST',
      body: payload,
    });
  },
  getMySuggestions() {
    return request<{ suggestions: BeerSuggestionItem[] }>('/beers/suggestions/mine');
  },
};

export const achievementsApi = {
  getAll() {
    return request<AchievementsResponse>('/achievements');
  },
};

export const shopApi = {
  getShop() {
    return request<ShopResponse>('/shop');
  },
  buy(payload: { itemType: ShopItemType; itemId: number }) {
    return request<ShopBuyResponse>('/shop/buy', {
      method: 'POST',
      body: payload,
    });
  },
  upgradeRelic(relicId: number) {
    return request<RelicUpgradeResponse>(`/shop/relics/${relicId}/upgrade`, {
      method: 'POST',
    });
  },
};

export const friendsApi = {
  getFriends() {
    return request<{ friends: FriendItem[]; ranking: FriendRankingEntry[] }>(
      '/friends'
    );
  },
  getRequests() {
    return request<FriendRequestsResponse>('/friends/requests');
  },
  searchUsers(q: string) {
    return request<{ users: UserSearchItem[] }>(
      `/users/search?q=${encodeURIComponent(q.trim())}`
    );
  },
  sendRequest(username: string) {
    return request<{ friendship: { id: string } }>('/friends/request', {
      method: 'POST',
      body: { username },
    });
  },
  respondRequest(requestId: string, action: 'accept' | 'reject') {
    return request<{
      friendship: { id: string; status: string };
      newlyUnlocked: NewlyUnlockedItem[];
    }>(`/friends/request/${requestId}`, {
      method: 'PATCH',
      body: { action },
    });
  },
  removeFriend(friendshipId: string) {
    return request<{ ok: boolean }>(`/friends/${friendshipId}`, {
      method: 'DELETE',
    });
  },
  getUserProfile(userId: string) {
    return request<PublicProfileResponse>(`/users/${userId}/profile`);
  },
};

export const tabernasApi = {
  getMine() {
    return request<{ tabernas: TabernaSummary[] }>('/tabernas');
  },
  explore(q = '') {
    const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    return request<{ tabernas: TabernaExploreItem[] }>(`/tabernas/explore${query}`);
  },
  create(payload: {
    name: string;
    description: string;
    visibility: TabernaVisibility;
    minBeers: number;
  }) {
    return request<{
      taberna: TabernaSummary;
      newBalance: number;
      newlyUnlocked: NewlyUnlockedItem[];
    }>('/tabernas', {
      method: 'POST',
      body: payload,
    });
  },
  getDetail(tabernaId: string) {
    return request<TabernaDetailResponse>(`/tabernas/${tabernaId}`);
  },
  update(
    tabernaId: string,
    payload: {
      description?: string;
      visibility?: TabernaVisibility;
      minBeers?: number;
    }
  ) {
    return request<{ taberna: TabernaSummary }>(`/tabernas/${tabernaId}`, {
      method: 'PATCH',
      body: payload,
    });
  },
  remove(tabernaId: string) {
    return request<{ ok: boolean }>(`/tabernas/${tabernaId}`, {
      method: 'DELETE',
    });
  },
  join(tabernaId: string) {
    return request<{
      joined: boolean;
      requested: boolean;
      requestId?: string;
      newlyUnlocked: NewlyUnlockedItem[];
    }>(`/tabernas/${tabernaId}/join`, {
      method: 'POST',
    });
  },
  leave(tabernaId: string) {
    return request<{
      ok: boolean;
      deletedTaberna: boolean;
      newLeaderId: string | null;
    }>(`/tabernas/${tabernaId}/leave`, {
      method: 'POST',
    });
  },
  getRequests(tabernaId: string) {
    return request<{ requests: TabernaRequestItem[] }>(`/tabernas/${tabernaId}/requests`);
  },
  acceptRequest(tabernaId: string, requestId: string) {
    return request<{ ok: boolean; status: 'accepted' }>(
      `/tabernas/${tabernaId}/requests/${requestId}/accept`,
      { method: 'POST' }
    );
  },
  rejectRequest(tabernaId: string, requestId: string) {
    return request<{ ok: boolean; status: 'rejected' }>(
      `/tabernas/${tabernaId}/requests/${requestId}/reject`,
      { method: 'POST' }
    );
  },
  kickMember(tabernaId: string, targetUserId: string) {
    return request<{ ok: boolean }>(`/tabernas/${tabernaId}/members/${targetUserId}`, {
      method: 'DELETE',
    });
  },
  getMission(tabernaId: string) {
    return request<{ mission: TabernaMissionDto }>(`/tabernas/${tabernaId}/mission`);
  },
  scan(
    tabernaId: string,
    payload: { code?: string; beerId?: number; frameBase64?: string }
  ) {
    return request<TabernaScanResponse>(`/tabernas/${tabernaId}/scan`, {
      method: 'POST',
      body: payload,
    });
  },
  getRanking(scope: 'global' | 'monthly' = 'global') {
    return request<TabernaRankingResponse>(`/tabernas/ranking?scope=${scope}`);
  },
};
