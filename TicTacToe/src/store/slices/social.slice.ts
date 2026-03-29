/**
 * social.slice.ts — Maintains the local cache of online players and pending challenges.
 */
import { StateCreator } from "zustand";
import type { RootStore } from "../index";
import type { OnlinePlayer, ChallengeRecord } from "../../types/game.types";

export type SocialState = {
  onlinePlayers: OnlinePlayer[];
  pendingChallenges: ChallengeRecord[];
};

export type SocialActions = {
  setOnlinePlayers: (players: OnlinePlayer[]) => void;
  setPendingChallenges: (challenges: ChallengeRecord[]) => void;
};

export type SocialSlice = SocialState & SocialActions;

export const createSocialSlice: StateCreator<RootStore, [], [], SocialSlice> = (set) => ({
  onlinePlayers: [],
  pendingChallenges: [],

  setOnlinePlayers: (players) => set({ onlinePlayers: players }),
  setPendingChallenges: (challenges) => set({ pendingChallenges: challenges }),
});
