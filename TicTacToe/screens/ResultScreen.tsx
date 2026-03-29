import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../src/types/game.types";
import { useStore } from "../src/store";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Result">;
};

export default function ResultScreen({ navigation }: Props) {
  const { gameState, userId, resetGame } = useStore();

  useEffect(() => {
    if (!gameState) {
      navigation.replace("Home");
    }
  }, [gameState, navigation]);

  if (!gameState) {
    return null;
  }

  const isDraw = gameState.winner === "draw";
  const isWinner = gameState.winner === userId;
  const winnerName = isDraw
    ? null
    : gameState.usernames[gameState.winner] ?? "Unknown";

  function handlePlayAgain() {
    resetGame();
    navigation.replace("Matchmaking");
  }

  function handleHome() {
    resetGame();
    navigation.replace("Home");
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.resultCard}>
        <Text style={styles.emoji}>
          {isDraw ? "🤝" : isWinner ? "🏆" : "😔"}
        </Text>

        <Text
          style={[
            styles.resultText,
            isDraw
              ? styles.drawText
              : isWinner
              ? styles.winText
              : styles.loseText,
          ]}
        >
          {isDraw ? "It's a Draw!" : isWinner ? "You Win!" : "You Lose"}
        </Text>

        {!isDraw && (
          <Text style={styles.winnerName}>
            {isWinner ? "Well played!" : `${winnerName} wins this round`}
          </Text>
        )}
      </View>

      {/* Final board state */}
      <View style={styles.board}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={styles.row}>
            {[0, 1, 2].map((col) => {
              const idx = row * 3 + col;
              const val = gameState.board[idx];
              return (
                <View key={idx} style={styles.cell}>
                  <Text
                    style={[
                      styles.cellText,
                      val === "X" ? styles.xText : styles.oText,
                    ]}
                  >
                    {val}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handlePlayAgain}>
          <Text style={styles.primaryBtnText}>Play Again</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleHome}>
          <Text style={styles.secondaryBtnText}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate("Leaderboard")}
        >
          <Text style={styles.secondaryBtnText}>🏆 Leaderboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f1a",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 32,
  },
  resultCard: {
    alignItems: "center",
    gap: 8,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 40,
    fontWeight: "800",
  },
  winText: { color: "#6c63ff" },
  loseText: { color: "#ff4757" },
  drawText: { color: "#ffa502" },
  winnerName: {
    color: "#555",
    fontSize: 16,
    marginTop: 4,
  },
  board: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    gap: 6,
  },
  cell: {
    width: 80,
    height: 80,
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  cellText: {
    fontSize: 32,
    fontWeight: "800",
  },
  xText: { color: "#6c63ff" },
  oText: { color: "#ff6b9d" },
  actions: {
    width: "100%",
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: "#6c63ff",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  secondaryBtn: {
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  secondaryBtnText: {
    color: "#888",
    fontSize: 16,
  },
});