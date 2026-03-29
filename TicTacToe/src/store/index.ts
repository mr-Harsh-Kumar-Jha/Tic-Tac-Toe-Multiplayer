/**
 * store/index.ts — Root Zustand store.
 *
 * Composes all domain slices into one unified store.
 * Screens use `useStore` with selector functions for optimal re-render performance.
 *
 * Pattern: https://docs.pmnd.rs/zustand/guides/slices-pattern
 */
import { create } from "zustand";

import { createAuthSlice } from "./slices/auth.slice";
import { createMatchSlice } from "./slices/match.slice";
import { createGameSlice } from "./slices/game.slice";
import { createProfileSlice } from "./slices/profile.slice";
import { createSocialSlice } from "./slices/social.slice";
export type { RootStore } from "./types";
import type { RootStore } from "./types";

// ─── Store Instance ───────────────────────────────────────────────────────────

export const useStore = create<RootStore>()((...args) => ({
  ...createAuthSlice(...args),
  ...createMatchSlice(...args),
  ...createGameSlice(...args),
  ...createProfileSlice(...args),
  ...createSocialSlice(...args),
}));

// ─── Selectors ────────────────────────────────────────────────────────────────
// Pre-built selectors prevent inline function creation on every render.
// Use these in screens for maximum performance.

export const selectAuth = (s: RootStore) => ({
  userId: s.userId,
  username: s.username,
  deviceId: s.deviceId,
});

export const selectMatchId = (s: RootStore) => s.matchId;
export const selectGameState = (s: RootStore) => s.gameState;
