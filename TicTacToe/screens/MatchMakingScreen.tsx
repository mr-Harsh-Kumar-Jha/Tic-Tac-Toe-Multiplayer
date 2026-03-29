import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../src/types/game.types";
import { getSocket, joinMatchmaker } from "../src/services/nakama";
import { useStore } from "../src/store";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Matchmaking">;
};

export default function MatchmakingScreen({ navigation }: Props) {
	const { setMatchId, setGameState, resetGame } = useStore();
	const listenerSet = useRef(false);

	useEffect(() => {
		resetGame(); // Force zeroing of any lingering game state from prior matches!
		startMatchmaking();
    return () => {
      // Cleanup listeners when screen unmounts
      listenerSet.current = false;
    };
  }, []);

  async function startMatchmaking() {
    try {
      const sock = await getSocket();

      if (!listenerSet.current) {
        listenerSet.current = true;

        // This fires when Nakama pairs us with another player.
        // The server calls makeMatch() in matchmaker.go which creates
        // an authoritative match and returns the match ID here.
        sock.onmatchmakermatched = async (matched) => {
          const matchId = matched.match_id;
          setMatchId(matchId);

          // Join the authoritative match
          const match = await sock.joinMatch(matchId);

          // Set up the main game state listener BEFORE navigating.
          // OpCode 2 = server broadcasting full game state (OpCodeGameState).
          sock.onmatchdata = (data) => {
            if (data.op_code === 2) {
              const state = JSON.parse(
                new TextDecoder().decode(data.data)
              );
              setGameState(state);
            }
          };

          navigation.replace("Game");
        };
      }

      // Add ourselves to the matchmaker queue.
      // Server will fire MatchmakerMatched when a second player joins.
      await joinMatchmaker();
    } catch (err) {
      Alert.alert("Matchmaking failed", "Please try again.");
      console.error(err);
      navigation.goBack();
    }
  }

  async function handleCancel() {
    try {
      const sock = await getSocket();
      await sock.removeMatchmaker("*");
    } catch (_) {}
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6c63ff" />
      <Text style={styles.title}>Finding a match...</Text>
      <Text style={styles.subtitle}>
        It usually takes under 30 seconds
      </Text>

      <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f1a",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginTop: 24,
  },
  subtitle: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
  },
  cancelBtn: {
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  cancelText: {
    color: "#888",
    fontSize: 16,
  },
});