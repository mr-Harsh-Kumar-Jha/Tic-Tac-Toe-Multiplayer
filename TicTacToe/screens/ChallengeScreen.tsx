import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CompositeNavigationProp } from "@react-navigation/native";
import {
  getOnlinePlayers,
  getPendingChallenges,
  sendChallenge,
  respondToChallenge,
  getSocket,
} from "../src/services/nakama";
import type { OnlinePlayer, ChallengeRecord, RootStackParamList, RootTabParamList } from "../src/types/game.types";
import { useStore } from "../src/store";
import { Swords, UserCheck, X } from "lucide-react-native";

type ChallengeNavigationProp = CompositeNavigationProp<
  BottomTabScreenProps<RootTabParamList, "ChallengeTab">["navigation"],
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: ChallengeNavigationProp;
};

export default function ChallengeScreen({ navigation }: Props) {
  const { setMatchId, setGameState, resetGame, onlinePlayers, pendingChallenges } = useStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [challengingId, setChallengingId] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  useEffect(() => {
    async function listenForAcceptance() {
      try {
        const sock = await getSocket();
        sock.onnotification = async (notification) => {
          if (notification.code === 101) {
            const data = notification.content as { match_id: string; accepted: boolean };
            if (data.accepted && data.match_id) {
              resetGame();
              setMatchId(data.match_id);
              
              await sock.joinMatch(data.match_id);
              sock.onmatchdata = (matchData) => {
                if (matchData.op_code === 2) {
                  const state = JSON.parse(new TextDecoder().decode(matchData.data));
                  setGameState(state);
                }
              };
              
              (navigation as any).navigate("PlayTab", { screen: "Game" });
            }
          }
        };
      } catch (err) {
        console.warn("Failed to listen for challenge notifications", err);
      }
    }
    listenForAcceptance();
  }, [navigation, setMatchId, setGameState, resetGame]);

  const handleSendChallenge = async (userId: string, username: string) => {
    try {
      setChallengingId(userId);
      await sendChallenge(userId);
      Alert.alert("Challenge Sent", `Waiting for ${username} to respond...`);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to challenge player");
    } finally {
      setChallengingId(null);
    }
  };

  const handleRespond = async (challengeId: string, fromUserId: string, accept: boolean) => {
    try {
      setLoading(true);
      const res = await respondToChallenge(challengeId, fromUserId, accept);
      if (accept && res.match_id) {
        resetGame();
        setMatchId(res.match_id);
        
        const sock = await getSocket();
        await sock.joinMatch(res.match_id);

        sock.onmatchdata = (data) => {
          if (data.op_code === 2) {
            const state = JSON.parse(new TextDecoder().decode(data.data));
            setGameState(state);
          }
        };

        (navigation as any).navigate("PlayTab", { screen: "Game" });
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to respond");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Challenges</Text>

      <FlatList
        data={onlinePlayers}
        keyExtractor={(item) => item.user_id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6c63ff"
          />
        }
        ListHeaderComponent={() => (
          <View style={styles.listHeader}>
            {pendingChallenges.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Incoming Challenges</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingChallenges.length}</Text>
                </View>
              </View>
            )}

            {pendingChallenges.map((challenge) => (
              <View key={challenge.challenge_id} style={styles.challengeCard}>
                <View style={[styles.avatar, { backgroundColor: challenge.avatar_color }]}>
                  <Text style={styles.avatarText}>{challenge.from_username[0].toUpperCase()}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.username}>{challenge.from_username}</Text>
                  <Text style={styles.statusText}>Wants to play!</Text>
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.declineBtn]}
                    onPress={() => handleRespond(challenge.challenge_id, challenge.from_user_id, false)}
                  >
                    <X size={18} color="#ff4757" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.acceptBtn]}
                    onPress={() => handleRespond(challenge.challenge_id, challenge.from_user_id, true)}
                  >
                    <UserCheck size={18} color="#2ed573" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>Online Now</Text>
              <View style={styles.dot} />
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#6c63ff" />
            ) : (
              <>
                <Text style={styles.emptyTitle}>No players online</Text>
                <Text style={styles.emptySubtext}>Invite your friends to the app!</Text>
              </>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.playerCard}>
            <View style={[styles.avatar, { backgroundColor: item.avatar_color }]}>
              <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.username}>{item.username}</Text>
              <Text style={styles.statusText}>Ready to play</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.challengeBtn,
                challengingId === item.user_id && styles.challengeBtnDisabled,
              ]}
              disabled={challengingId === item.user_id}
              onPress={() => handleSendChallenge(item.user_id, item.username)}
            >
              {challengingId === item.user_id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Swords size={16} color="#fff" />
                  <Text style={styles.challengeBtnText}>Challenge</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f1a",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listHeader: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    color: "#888",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
  badge: {
    backgroundColor: "#ff4757",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2ed573",
  },
  challengeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a101a", // Deep red tint for attention
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#4a1c2a",
  },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  username: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  statusText: {
    color: "#aaa",
    fontSize: 13,
  },
  challengeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6c63ff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  challengeBtnDisabled: {
    opacity: 0.7,
  },
  challengeBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  declineBtn: {
    borderColor: "#ff4757",
    backgroundColor: "rgba(255, 71, 87, 0.1)",
  },
  acceptBtn: {
    borderColor: "#2ed573",
    backgroundColor: "rgba(46, 213, 115, 0.1)",
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext: {
    color: "#555",
    fontSize: 15,
  },
});
