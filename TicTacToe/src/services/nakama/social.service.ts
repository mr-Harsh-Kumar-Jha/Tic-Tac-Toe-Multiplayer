/**
 * social.service.ts — Interaction logic for real-time challenges and profiles.
 */
import { nakamaClient } from "./client";
import { getSession } from "./auth.service";

import type { PlayerProfile, OnlinePlayer, ChallengeRecord } from "../../types/game.types";

// ─── Online Players ────────────────────────────────────────────────────────

/** Poll this to get currently connected users. */
export async function getOnlinePlayers(): Promise<OnlinePlayer[]> {
  const session = getSession();
  if (!session) return [];

  const res = await nakamaClient.rpc(session, "get_online_players", {});
  if (!res.payload) return [];
  return (typeof res.payload === "string" ? JSON.parse(res.payload) : res.payload) as OnlinePlayer[];
}

// ─── Challenges ─────────────────────────────────────────────────────────────

/** Send a direct challenge to a player. */
export async function sendChallenge(targetUserId: string): Promise<string> {
  const session = getSession();
  if (!session) throw new Error("Not authenticated");

  const payload = { target_user_id: targetUserId };
  const res = await nakamaClient.rpc(session, "send_challenge", payload);
  return typeof res.payload === "string" ? res.payload : JSON.stringify(res.payload);
}

/** Fetch pending incoming challenges. */
export async function getPendingChallenges(): Promise<ChallengeRecord[]> {
  const session = getSession();
  if (!session) return [];

  const res = await nakamaClient.rpc(session, "get_pending_challenges", {});
  if (!res.payload) return [];
  return (typeof res.payload === "string" ? JSON.parse(res.payload) : res.payload) as ChallengeRecord[];
}

/** Accept or decline a challenge. If accepted, returns the match_id to join. */
export async function respondToChallenge(
  challengeId: string,
  fromUserId: string,
  accept: boolean
): Promise<{ status: string; match_id?: string }> {
  const session = getSession();
  if (!session) throw new Error("Not authenticated");

  const payload = {
    challenge_id: challengeId,
    from_user_id: fromUserId,
    accept,
  };

  const res = await nakamaClient.rpc(session, "respond_to_challenge", payload);
  const data = typeof res.payload === "string" ? JSON.parse(res.payload) : res.payload;
  return data;
}

// ─── Profiles ──────────────────────────────────────────────────────────────

/** Fetch a user's rich profile and stats. Empty string fetches your own. */
export async function getProfile(userId: string = ""): Promise<PlayerProfile> {
  const session = getSession();
  if (!session) throw new Error("Not authenticated");

  const payload = { user_id: userId };
  const res = await nakamaClient.rpc(session, "get_profile", payload);
  if (!res.payload) throw new Error("Empty profile response");
  
  return (typeof res.payload === "string" ? JSON.parse(res.payload) : res.payload) as PlayerProfile;
}

/** Update the current user's profile display name. */
export async function updateDisplayName(displayName: string): Promise<void> {
  const session = getSession();
  if (!session) throw new Error("Not authenticated");

  await nakamaClient.updateAccount(session, {
    display_name: displayName,
  });
}
