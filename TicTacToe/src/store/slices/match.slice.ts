/**
 * match.slice.ts — Matchmaking state slice.
 *
 * Tracks the active match ID assigned by the server after matchmaking completes.
 */
import { StateCreator } from "zustand";
import type { RootStore } from "../types";

export type MatchState = {
  matchId: string;
};

export type MatchActions = {
  /** Store the match ID received from MatchmakerMatched. */
  setMatchId: (matchId: string) => void;
};

export type MatchSlice = MatchState & MatchActions;

export const createMatchSlice: StateCreator<RootStore, [], [], MatchSlice> = (set) => ({
  // State
  matchId: "",

  // Actions
  setMatchId: (matchId) => set({ matchId }),
});
