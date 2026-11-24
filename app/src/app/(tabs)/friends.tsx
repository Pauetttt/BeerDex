import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ProfileIcon } from '../../components/ProfileIcon';
import { useAppAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useAchievementToast } from '../../context/ToastContext';
import { friendsApi } from '../../services/api';
import {
  COLORS,
  FONTS,
  GRADIENTS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../theme/tokens';
import {
  FriendItem,
  FriendRankingEntry,
  FriendRequestsResponse,
  UserSearchItem,
} from '../../types/api';

type FriendsTab = 'friends' | 'requests';

export default function FriendsScreen() {
  const router = useRouter();
  const { refreshMe } = useAuth();
  const { showAlert, showConfirm } = useAppAlert();
  const { showAchievements } = useAchievementToast();

  const [tab, setTab] = useState<FriendsTab>('friends');
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [ranking, setRanking] = useState<FriendRankingEntry[]>([]);
  const [requests, setRequests] = useState<FriendRequestsResponse>({
    received: [],
    sent: [],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [friendsRes, reqRes] = await Promise.all([
        friendsApi.getFriends(),
        friendsApi.getRequests(),
      ]);
      setFriends(friendsRes.friends);
      setRanking(friendsRes.ranking || []);
      setRequests(reqRes);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    try {
      const res = await friendsApi.searchUsers(searchQuery.trim());
      setSearchResults(res.users);
      setHasSearched(true);
    } catch (err) {
      showAlert('Error', err instanceof Error ? err.message : 'No se pudo buscar.');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (username: string) => {
    try {
      await friendsApi.sendRequest(username);
      showAlert('Solicitud enviada', `Has enviado solicitud de amistad a ${username}.`);
      await Promise.all([loadData(), handleSearch()]);
    } catch (err) {
      showAlert('Aviso', err instanceof Error ? err.message : 'Error al enviar solicitud.');
    }
  };

  const handleRespond = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const res = await friendsApi.respondRequest(requestId, action);
      if (res.newlyUnlocked?.length) {
        showAchievements(res.newlyUnlocked);
        refreshMe();
      }
      await loadData();
    } catch (err) {
      showAlert('Error', err instanceof Error ? err.message : 'No se pudo responder.');
    }
  };

  const handleDeleteFriend = (item: FriendItem) => {
    showConfirm(
      'Eliminar amigo',
      `¿Seguro que quieres eliminar a ${item.user.username} de tu lista de amigos?`,
      async () => {
        try {
          await friendsApi.removeFriend(item.friendshipId);
          await loadData();
        } catch (err) {
          showAlert(
            'Error',
            err instanceof Error ? err.message : 'No se pudo eliminar al amigo.'
          );
        }
      },
      { confirmText: 'Eliminar', destructive: true }
    );
  };

  const receivedCount = requests.received.length;

  return (
    <View style={styles.root}>
      {/* Selector segmentado superior */}
      <View style={styles.navbarWrap}>
        <View style={styles.navbarTrack}>
          <Pressable
            onPress={() => setTab('friends')}
            style={[styles.navTab, tab === 'friends' && styles.navTabActive]}
          >
            <Text style={[styles.navText, tab === 'friends' && styles.navTextActive]}>
              Amigos ({friends.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('requests')}
            style={[styles.navTab, tab === 'requests' && styles.navTabActive]}
          >
            <View style={styles.navLabelRow}>
              <Text style={[styles.navText, tab === 'requests' && styles.navTextActive]}>
                Solicitudes
              </Text>
              {receivedCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{receivedCount}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.amber} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={COLORS.amber}
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          {tab === 'friends' ? (
            <View style={styles.friendsStack}>
              {ranking.length > 0 ? (
                <LinearGradient
                  colors={GRADIENTS.hero}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.rankingCard, SHADOWS.card]}
                >
                  <View style={styles.rankingHeader}>
                    <Ionicons name="podium" size={18} color={COLORS.amberBright} />
                    <Text style={styles.sectionTitle}>Ranking del Grupo</Text>
                  </View>
                  {ranking.map((r) => {
                    const medalColor =
                      r.rank === 1
                        ? '#FFD166'
                        : r.rank === 2
                        ? '#D6DCE5'
                        : r.rank === 3
                        ? '#D98F4E'
                        : COLORS.textSecondary;

                    return (
                      <Pressable
                        key={r.id}
                        onPress={() =>
                          r.isSelf
                            ? router.push('/profile')
                            : router.push(`/friend/${r.id}`)
                        }
                        style={[styles.rankRow, r.isSelf && styles.rankRowSelf]}
                      >
                        <View
                          style={[
                            styles.rankBadge,
                            r.rank <= 3 && { borderColor: medalColor },
                          ]}
                        >
                          <Text style={[styles.rankNum, { color: medalColor }]}>
                            #{r.rank}
                          </Text>
                        </View>
                        <ProfileIcon
                          imageUrl={r.equippedIcon.imageUrl}
                          size={38}
                          highlight={r.rank === 1}
                          frameCode={r.equippedFrame?.code}
                          frameMetadata={r.equippedFrame?.metadata}
                        />
                        <View style={styles.rankInfo}>
                          <Text style={styles.rankName} numberOfLines={1}>
                            {r.username}
                            {r.isSelf ? ' (Tú)' : ''}
                          </Text>
                          <Text style={styles.rankMeta}>
                            {r.achievementsUnlocked} logros
                          </Text>
                        </View>
                        <View style={styles.rankScorePill}>
                          <Text style={styles.rankScoreText}>
                            {r.beersCount}/{r.beersTotal}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </LinearGradient>
              ) : null}

              {friends.length === 0 ? (
                <LinearGradient
                  colors={GRADIENTS.card}
                  style={[styles.emptyCard, SHADOWS.card]}
                >
                  <Ionicons name="people-outline" size={44} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>Aún no tienes amigos</Text>
                  <Text style={styles.emptySub}>
                    Busca a tus colegas por su nombre de usuario en la pestaña Solicitudes para comparar vuestra BeerDex.
                  </Text>
                  <Pressable onPress={() => setTab('requests')}>
                    <LinearGradient
                      colors={GRADIENTS.amberBtn}
                      style={[styles.primaryBtn, SHADOWS.amberGlow]}
                    >
                      <Text style={styles.primaryBtnText}>Buscar amigos</Text>
                    </LinearGradient>
                  </Pressable>
                </LinearGradient>
              ) : (
                <View style={styles.list}>
                  {friends.map((item) => (
                    <LinearGradient
                      key={item.friendshipId}
                      colors={GRADIENTS.card}
                      style={[styles.friendCard, SHADOWS.card]}
                    >
                      <Pressable
                        onPress={() => router.push(`/friend/${item.user.id}`)}
                        style={styles.friendMain}
                      >
                        <ProfileIcon
                          imageUrl={item.user.equippedIcon.imageUrl}
                          size={50}
                          frameCode={item.user.equippedFrame?.code}
                          frameMetadata={item.user.equippedFrame?.metadata}
                        />
                        <View style={styles.friendInfo}>
                          <Text style={styles.friendName}>{item.user.username}</Text>
                          <Text style={styles.friendTitle}>
                            {item.user.equippedTitle.name}
                          </Text>
                          <Text style={styles.friendStats}>
                            {item.user.beersCount} / {item.user.beersTotal ?? 559} cervezas
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteFriend(item)}
                        style={styles.deleteBtn}
                        accessibilityLabel={`Eliminar a ${item.user.username}`}
                      >
                        <Ionicons name="trash-outline" size={19} color={COLORS.danger} />
                      </Pressable>
                    </LinearGradient>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.requestsWrap}>
              {/* Buscador por username */}
              <LinearGradient
                colors={GRADIENTS.card}
                style={[styles.searchCard, SHADOWS.card]}
              >
                <Text style={styles.sectionTitle}>Buscar por username</Text>
                <View style={styles.searchRow}>
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Nombre de usuario..."
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="none"
                    onSubmitEditing={handleSearch}
                    style={styles.searchInput}
                  />
                  <Pressable onPress={handleSearch}>
                    <LinearGradient
                      colors={GRADIENTS.amberBtn}
                      style={styles.searchBtn}
                    >
                      {searching ? (
                        <ActivityIndicator size="small" color={COLORS.bg} />
                      ) : (
                        <Ionicons name="search" size={20} color={COLORS.bg} />
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>

                {searchResults.length > 0 ? (
                  <View style={styles.searchResults}>
                    {searchResults.map((u) => (
                      <View key={u.id} style={styles.userRow}>
                        <ProfileIcon
                          imageUrl={u.equippedIcon.imageUrl}
                          size={42}
                          frameCode={u.equippedFrame?.code}
                          frameMetadata={u.equippedFrame?.metadata}
                        />
                        <View style={styles.userRowInfo}>
                          <Text style={styles.friendName}>{u.username}</Text>
                          <Text style={styles.friendTitle}>{u.equippedTitle.name}</Text>
                        </View>
                        {u.relationshipStatus === 'accepted' ? (
                          <Text style={styles.statusTag}>Amigo</Text>
                        ) : u.relationshipStatus === 'pending' ? (
                          <Text style={styles.statusTag}>
                            {u.relationshipDirection === 'sent' ? 'Pendiente' : 'Recibida'}
                          </Text>
                        ) : (
                          <Pressable onPress={() => handleSendRequest(u.username)}>
                            <LinearGradient colors={GRADIENTS.amberBtn} style={styles.addBtn}>
                              <Text style={styles.addBtnText}>Añadir</Text>
                            </LinearGradient>
                          </Pressable>
                        )}
                      </View>
                    ))}
                  </View>
                ) : hasSearched && !searching ? (
                  <Text style={styles.emptySmall}>
                    No se encontraron otros usuarios con ese nombre.
                  </Text>
                ) : null}
              </LinearGradient>

              {/* Solicitudes recibidas */}
              <LinearGradient
                colors={GRADIENTS.card}
                style={[styles.sectionBox, SHADOWS.card]}
              >
                <Text style={styles.sectionTitle}>
                  Solicitudes recibidas ({requests.received.length})
                </Text>
                {requests.received.length === 0 ? (
                  <Text style={styles.emptySmall}>No tienes solicitudes pendientes.</Text>
                ) : (
                  requests.received.map((req) => (
                    <View key={req.id} style={styles.reqRow}>
                      <ProfileIcon
                        imageUrl={req.user.equippedIcon.imageUrl}
                        size={42}
                        frameCode={req.user.equippedFrame?.code}
                        frameMetadata={req.user.equippedFrame?.metadata}
                      />
                      <View style={styles.userRowInfo}>
                        <Text style={styles.friendName}>{req.user.username}</Text>
                        <Text style={styles.friendTitle}>{req.user.equippedTitle.name}</Text>
                      </View>
                      <View style={styles.reqActions}>
                        <Pressable onPress={() => handleRespond(req.id, 'accept')}>
                          <LinearGradient colors={GRADIENTS.amberBtn} style={styles.acceptBtn}>
                            <Text style={styles.acceptText}>Aceptar</Text>
                          </LinearGradient>
                        </Pressable>
                        <Pressable
                          onPress={() => handleRespond(req.id, 'reject')}
                          style={styles.rejectBtn}
                        >
                          <Text style={styles.rejectText}>Rechazar</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </LinearGradient>

              {/* Solicitudes enviadas */}
              <LinearGradient
                colors={GRADIENTS.card}
                style={[styles.sectionBox, SHADOWS.card]}
              >
                <Text style={styles.sectionTitle}>
                  Solicitudes enviadas ({requests.sent.length})
                </Text>
                {requests.sent.length === 0 ? (
                  <Text style={styles.emptySmall}>No has enviado solicitudes pendientes.</Text>
                ) : (
                  requests.sent.map((req) => (
                    <View key={req.id} style={styles.reqRow}>
                      <ProfileIcon
                        imageUrl={req.user.equippedIcon.imageUrl}
                        size={40}
                        frameCode={req.user.equippedFrame?.code}
                        frameMetadata={req.user.equippedFrame?.metadata}
                      />
                      <View style={styles.userRowInfo}>
                        <Text style={styles.friendName}>{req.user.username}</Text>
                        <Text style={styles.friendTitle}>{req.user.equippedTitle.name}</Text>
                      </View>
                      <Text style={styles.statusTag}>Enviada</Text>
                    </View>
                  ))
                )}
              </LinearGradient>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
  },
  navbarWrap: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
    maxWidth: 740,
    width: '100%',
    alignSelf: 'center',
  },
  navbarTrack: {
    flexDirection: 'row',
    backgroundColor: '#120E0C',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    padding: 4,
    gap: 4,
  },
  navTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.pill,
  },
  navTabActive: {
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
  },
  navLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  navTextActive: {
    color: COLORS.amberBright,
    fontWeight: '800',
  },
  badge: {
    backgroundColor: COLORS.amber,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  badgeText: {
    color: COLORS.bg,
    fontSize: 11,
    fontWeight: '900',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: SPACING.lg,
    maxWidth: 740,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: SPACING.xxl,
  },
  emptyCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  emptyTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 19,
    fontWeight: '800',
  },
  emptySub: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryBtn: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
    marginTop: SPACING.xs,
  },
  primaryBtnText: {
    color: COLORS.bg,
    fontWeight: '900',
    fontSize: 14,
  },
  list: {
    gap: SPACING.md,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  friendMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  friendInfo: {
    flex: 1,
    gap: 2,
  },
  friendName: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 16.5,
    fontWeight: '800',
  },
  friendTitle: {
    color: COLORS.amber,
    fontSize: 12,
    fontWeight: '700',
  },
  friendStats: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  deleteBtn: {
    padding: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  requestsWrap: {
    gap: SPACING.lg,
  },
  searchCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.amberBright,
    fontFamily: FONTS.display,
    fontSize: 16,
    fontWeight: '800',
  },
  searchRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(12, 9, 8, 0.72)',
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 15,
  },
  searchBtn: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResults: {
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: 4,
  },
  userRowInfo: {
    flex: 1,
  },
  addBtn: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '900',
  },
  statusTag: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  sectionBox: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  emptySmall: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  reqActions: {
    flexDirection: 'row',
    gap: 6,
  },
  acceptBtn: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  acceptText: {
    color: COLORS.bg,
    fontSize: 12,
    fontWeight: '900',
  },
  rejectBtn: {
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rejectText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  friendsStack: {
    gap: SPACING.lg,
  },
  rankingCard: {
    borderRadius: RADIUS.xl + 2,
    borderWidth: 1.5,
    borderColor: COLORS.borderGold,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    backgroundColor: 'rgba(12, 9, 8, 0.52)',
    borderRadius: RADIUS.md + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
  },
  rankRowSelf: {
    borderColor: COLORS.borderGold,
    backgroundColor: 'rgba(236, 161, 42, 0.1)',
  },
  rankBadge: {
    minWidth: 30,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  rankNum: {
    fontSize: 12.5,
    fontWeight: '900',
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 14.5,
    fontWeight: '800',
  },
  rankMeta: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  rankScorePill: {
    backgroundColor: COLORS.amberBg,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  rankScoreText: {
    color: COLORS.amberBright,
    fontSize: 12,
    fontWeight: '900',
  },
});
