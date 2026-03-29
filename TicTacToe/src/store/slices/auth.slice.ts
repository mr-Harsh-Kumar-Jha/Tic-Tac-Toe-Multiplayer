/**
 * auth.slice.ts — Authentication state slice.
 *
 * Holds the current user's identity after login.
 * Use StateCreator so this slice can be composed into the root store.
 */
import { StateCreator } from "zustand";
import type { RootStore } from "../types";

export type AuthState = {
  userId: string;
  username: string;
  deviceId: string;
};

export type AuthActions = {
  /** Populate auth state after a successful authenticateDevice call. */
  setAuth: (userId: string, username: string, deviceId: string) => void;
  /** Clear auth state on logout. */
  clearAuth: () => void;
};

export type AuthSlice = AuthState & AuthActions;

export const createAuthSlice: StateCreator<RootStore, [], [], AuthSlice> = (set) => ({
  // State
  userId: "",
  username: "",
  deviceId: "",

  // Actions
  setAuth: (userId, username, deviceId) =>
    set({ userId, username, deviceId }),

  clearAuth: () =>
    set({ userId: "", username: "", deviceId: "" }),
});
