/**
 * profile.slice.ts — Owns user profile preferences like local sound toggle and display name caches.
 */
import { StateCreator } from "zustand";
import type { RootStore } from "../index";

export type ProfileState = {
  displayName: string;
  avatarColor: string;
  soundEnabled: boolean;
};

export type ProfileActions = {
  setProfileData: (displayName: string, avatarColor: string) => void;
  toggleSound: () => void;
};

export type ProfileSlice = ProfileState & ProfileActions;

export const createProfileSlice: StateCreator<RootStore, [], [], ProfileSlice> = (set) => ({
  displayName: "",
  avatarColor: "#6c63ff", // default
  soundEnabled: true,

  setProfileData: (displayName, avatarColor) => set({ displayName, avatarColor }),
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
});
