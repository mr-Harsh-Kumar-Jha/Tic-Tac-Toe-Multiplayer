/**
 * game.types.ts — Shared domain types used across services, store slices, and screens.
 *
 * Keep this file pure: no imports from services or store — only primitive/React types.
 */

// ─── Navigation ─────────────────────────────────────────────────────────────

/** All screens and their route params for type-safe navigation. */
export type RootStackParamList = {
  Home: undefined;
  Matchmaking: undefined;
  Game: undefined;
  Result: undefined;
  Leaderboard: undefined;
};

/** Bottom Tabs types */
export type RootTabParamList = {
  PlayTab: undefined;
  ChallengeTab: undefined;
  ProfileTab: undefined;
};

// ─── Game State ──────────────────────────────────────────────────────────────

/**
 * Mirrors MatchState from game/match.go — populated entirely from server broadcasts.
 * The client never calculates or mutates this; it only renders what the server sends.
 */
export type GameState = {
  board: string[];                        // 9 cells: "" | "X" | "O"
  player_x: string;                       // userID
  player_o: string;                       // userID
  usernames: Record<string, string>;      // userID → display name
  current_turn: string;                   // userID of who moves next
  game_over: boolean;
  winner: string;                         // userID | "draw" | ""
  timer_expiry: number;                   // Unix ms — for countdown display
};

// ─── Leaderboard ─────────────────────────────────────────────────────────────

/** Mirrors the Entry struct from leaderboard/leaderboard.go. */
export type LeaderboardEntry = {
  rank: number;
  username: string;
  wins: number;
  user_id: string;
};

// ─── Social ──────────────────────────────────────────────────────────────────

export type PlayerProfile = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_color: string;
  wins: number;
  games_played: number;
  win_rate: number;
};

export type OnlinePlayer = {
  user_id: string;
  username: string;
  avatar_color: string;
};

export type ChallengeRecord = {
  challenge_id: string;
  from_user_id: string;
  from_username: string;
  avatar_color: string;
  created_at_unix: number;
  status: string;
};

