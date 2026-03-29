import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../src/types/game.types";
import { sendMove } from "../src/services/nakama";
import { useStore } from "../src/store";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Game">;
};

export default function GameScreen({ navigation }: Props) {
  const { gameState, matchId, userId, username } = useStore();
  const [timeLeft, setTimeLeft] = useState(30);

  // Navigate to result screen when game ends
  useEffect(() => {
    if (gameState?.game_over) {
      navigation.replace("Result");
    }
  }, [gameState?.game_over]);

  // Countdown timer — purely cosmetic UI.
  // The real timer lives on the server in match_handler.go.
  // Even if this timer freezes, the server will auto-forfeit correctly.
  useEffect(() => {
    if (!gameState?.timer_expiry) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((gameState.timer_expiry - Date.now()) / 1000)
      );
      setTimeLeft(remaining);
    }, 200);

    return () => clearInterval(interval);
  }, [gameState?.timer_expiry]);

  if (!gameState) {
    return (
      <View style={styles.container}>
        <Text style={styles.waitText}>Waiting for opponent...</Text>
      </View>
    );
  }

  const isMyTurn = gameState.current_turn === userId;
  const myMark = gameState.player_x === userId ? "X" : "O";
  const opponentId =
    gameState.player_x === userId ? gameState.player_o : gameState.player_x;
  const opponentName = gameState.usernames[opponentId] ?? "Opponent";

  async function handleCellPress(position: number) {
    // Only allow move if it's our turn and cell is empty
    if (!isMyTurn || gameState?.board[position] !== "") return;
    await sendMove(matchId, position);
  }

  function renderCell(index: number) {
    const value = gameState?.board[index] ?? "";
    const isEmpty = value === "";
    return (
      <TouchableOpacity
        key={index}
        style={[styles.cell, !isEmpty && styles.cellFilled]}
        onPress={() => handleCellPress(index)}
        disabled={!isMyTurn || !isEmpty}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.cellText,
            value === "X" ? styles.xText : styles.oText,
          ]}
        >
          {value}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Player info header */}
      <View style={styles.header}>
        <View style={[styles.playerCard, isMyTurn && styles.playerCardActive]}>
          <Text style={styles.playerName}>{username} (you)</Text>
          <Text style={styles.playerMark}>{myMark}</Text>
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <Text
            style={[styles.timer, timeLeft <= 10 && styles.timerUrgent]}
          >
            {timeLeft}s
          </Text>
          <Text style={styles.timerLabel}>
            {isMyTurn ? "your turn" : "their turn"}
          </Text>
        </View>

        <View style={[styles.playerCard, !isMyTurn && styles.playerCardActive]}>
          <Text style={styles.playerName}>{opponentName}</Text>
          <Text style={styles.playerMark}>
            {myMark === "X" ? "O" : "X"}
          </Text>
        </View>
      </View>

      {/* Board */}
      <View style={styles.board}>
        <View style={styles.row}>
          {renderCell(0)}
          {renderCell(1)}
          {renderCell(2)}
        </View>
        <View style={styles.row}>
          {renderCell(3)}
          {renderCell(4)}
          {renderCell(5)}
        </View>
        <View style={styles.row}>
          {renderCell(6)}
          {renderCell(7)}
          {renderCell(8)}
        </View>
      </View>

      <Text style={styles.statusText}>
        {isMyTurn ? "Your turn — tap a cell" : `${opponentName}'s turn`}
      </Text>
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
  },
  waitText: {
    color: "#fff",
    fontSize: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 48,
  },
  playerCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    flex: 1,
    borderWidth: 1,
    borderColor: "#2a2a4a",
    opacity: 0.5,
  },
  playerCardActive: {
    opacity: 1,
    borderColor: "#6c63ff",
  },
  playerName: {
    color: "#aaa",
    fontSize: 12,
    marginBottom: 4,
  },
  playerMark: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  timerContainer: {
    alignItems: "center",
    marginHorizontal: 12,
  },
  timer: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
  },
  timerUrgent: {
    color: "#ff4757",
  },
  timerLabel: {
    color: "#555",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  board: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  cell: {
    width: 100,
    height: 100,
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  cellFilled: {
    backgroundColor: "#16213e",
  },
  cellText: {
    fontSize: 42,
    fontWeight: "800",
  },
  xText: {
    color: "#6c63ff",
  },
  oText: {
    color: "#ff6b9d",
  },
  statusText: {
    color: "#555",
    fontSize: 14,
    marginTop: 32,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});