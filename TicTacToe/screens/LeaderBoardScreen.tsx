import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../src/types/game.types";
import { getLeaderboard } from "../src/services/nakama";
import type { LeaderboardEntry } from "../src/types/game.types";
import { useStore } from "../src/store";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Leaderboard">;
};

export default function LeaderboardScreen({ navigation }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { userId } = useStore();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    try {
      const data = await getLeaderboard();
      setEntries(data);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }

  function rankEmoji(rank: number) {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Leaderboard</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#6c63ff"
          style={{ marginTop: 60 }}
        />
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No games played yet.</Text>
          <Text style={styles.emptySubtext}>Be the first on the board!</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isMe = item.user_id === userId;
            return (
              <View
                style={[styles.entry, isMe && styles.entryHighlighted]}
              >
                <Text style={styles.rank}>{rankEmoji(item.rank)}</Text>
                <View style={styles.entryInfo}>
                  <Text style={styles.entryName}>
                    {item.username}
                    {isMe && (
                      <Text style={styles.youBadge}> (you)</Text>
                    )}
                  </Text>
                </View>
                <View style={styles.winsContainer}>
                  <Text style={styles.wins}>{item.wins}</Text>
                  <Text style={styles.winsLabel}>wins</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f1a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
    paddingBottom: 16,
  },
  back: {
    color: "#6c63ff",
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  list: {
    padding: 16,
    gap: 10,
  },
  entry: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2a2a4a",
    gap: 16,
  },
  entryHighlighted: {
    borderColor: "#6c63ff",
    backgroundColor: "#1e1b3a",
  },
  rank: {
    fontSize: 20,
    width: 36,
    textAlign: "center",
    color: "#fff",
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  youBadge: {
    color: "#6c63ff",
    fontSize: 14,
    fontWeight: "400",
  },
  winsContainer: {
    alignItems: "center",
  },
  wins: {
    color: "#6c63ff",
    fontSize: 24,
    fontWeight: "800",
  },
  winsLabel: {
    color: "#555",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext: {
    color: "#555",
    fontSize: 15,
  },
});