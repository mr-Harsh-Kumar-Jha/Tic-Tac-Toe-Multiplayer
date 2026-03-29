/**
 * leaderboard.service.ts — Fetches leaderboard data via RPC.
 *
 * Calls the "get_leaderboard" RPC registered in leaderboard/leaderboard.go.
 * Returns top 10 players sorted by wins descending.
 */
import { nakamaClient } from "./client";
import { getSession } from "./auth.service";
import type { LeaderboardEntry } from "../../types/game.types";

/**
 * Fetches the top 10 players from the server leaderboard.
 * Requires an active session — call authenticateDevice first.
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const session = getSession();
  if (!session) throw new Error("Not authenticated");

  const result = await nakamaClient.rpc(session, "get_leaderboard", {});
  const payload = result.payload;

  if (!payload) return [];
  if (typeof payload === "string") return JSON.parse(payload);
  return payload as LeaderboardEntry[];
}
