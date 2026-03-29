import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useStore } from "../src/store";
import { getProfile, updateDisplayName } from "../src/services/nakama";
import type { PlayerProfile } from "../src/types/game.types";
import { UserRound, Settings, Check, LogOut } from "lucide-react-native";

export default function ProfileScreen() {
  const { userId, deviceId, setAuth, resetGame } = useStore();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      const data = await getProfile(); // Empty fetches self
      setProfile(data);
      setEditName(data.display_name);
    } catch (err: any) {
      console.warn("Could not fetch profile", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim()) {
      setIsEditing(false);
      setEditName(profile?.display_name || "");
      return;
    }

    try {
      setSaving(true);
      await updateDisplayName(editName.trim());
      await fetchProfile(); // Refresh
			setAuth(userId, editName.trim(), deviceId); // SYNC STORE
      setIsEditing(false);
    } catch (err: any) {
      Alert.alert("Update Failed", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          // A full app reset in a real flow.
          // Since we use Device auth, they can just login again with a new name if they want.
          // For now, clearing the store will kick them to Home if handled.
          setAuth("", "", "");
          resetGame();
        },
      },
    ]);
  };

  if (loading || !profile) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#6c63ff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={handleLogout}>
          <LogOut color="#ff4757" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarLarge, { backgroundColor: profile.avatar_color }]}>
            <Text style={styles.avatarTextLarge}>{profile.display_name[0].toUpperCase()}</Text>
          </View>
          
          <View style={styles.nameRow}>
            {isEditing ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={styles.nameInput}
                  value={editName}
                  onChangeText={setEditName}
                  maxLength={20}
                  autoFocus
                  onSubmitEditing={handleSaveName}
                />
                <TouchableOpacity 
                  style={styles.saveBtn} 
                  onPress={handleSaveName}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Check color="#fff" size={20} />}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.displayName}>{profile.display_name}</Text>
                <TouchableOpacity onPress={() => setIsEditing(true)}>
                  <Text style={styles.editLink}>Edit</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          <Text style={styles.username}>@{profile.username}</Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.wins}</Text>
            <Text style={styles.statLabel}>Total Wins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.games_played}</Text>
            <Text style={styles.statLabel}>Games Played</Text>
          </View>
          <View style={[styles.statCard, { width: "100%" }]}>
            <Text style={styles.statValue}>{profile.win_rate}%</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
            {/* simple progress bar */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${profile.win_rate}%` }]} />
            </View>
          </View>
        </View>
      </View>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
  },
  settingsBtn: {
    padding: 8,
    backgroundColor: "rgba(255, 71, 87, 0.1)",
    borderRadius: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 48,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 4,
    borderColor: "#1a1a2e",
  },
  avatarTextLarge: {
    fontSize: 42,
    fontWeight: "800",
    color: "#fff",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
    height: 40,
  },
  displayName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  editLink: {
    color: "#6c63ff",
    fontSize: 14,
    fontWeight: "600",
  },
  username: {
    fontSize: 15,
    color: "#555",
  },
  editContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameInput: {
    backgroundColor: "#1a1a2e",
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#6c63ff",
    minWidth: 150,
  },
  saveBtn: {
    backgroundColor: "#6c63ff",
    padding: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "#1a1a2e",
    width: "47%",
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#888",
    fontWeight: "600",
  },
  progressTrack: {
    width: "100%",
    height: 6,
    backgroundColor: "#2a2a4a",
    borderRadius: 3,
    marginTop: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2ed573",
    borderRadius: 3,
  },
});
