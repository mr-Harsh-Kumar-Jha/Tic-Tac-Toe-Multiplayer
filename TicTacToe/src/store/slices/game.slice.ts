/**
 * game.slice.ts — Game state slice.
 *
 * Reflects the server's MatchState — populated entirely from server broadcasts.
 * The client never calculates or mutates game state; it only renders what it receives.
 */
import { StateCreator } from "zustand";
import type { RootStore } from "../types";
import type { GameState } from "../../types/game.types";

export type GameStateSlice = {
  gameState: GameState | null;
};

export type GameActions = {
  /** Replace the entire game state from a server broadcast (OpCode 2). */
  setGameState: (state: GameState) => void;
  /** Reset game state and match ID — call before starting a new round. */
  resetGame: () => void;
};

export type GameSlice = GameStateSlice & GameActions;

export const createGameSlice: StateCreator<RootStore, [], [], GameSlice> = (set) => ({
  // State
  gameState: null,

  // Actions
  setGameState: (gameState) => set({ gameState }),

  resetGame: () => set({ gameState: null, matchId: "" }),
});
