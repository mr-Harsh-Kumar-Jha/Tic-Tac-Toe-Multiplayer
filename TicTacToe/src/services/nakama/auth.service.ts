/**
 * auth.service.ts — Device authentication against the Nakama server.
 *
 * Uses device ID as the unique identifier — zero friction, no registration form,
 * persistent identity across app restarts.
 */
import { Session } from "@heroiclabs/nakama-js";
import { nakamaClient } from "./client";

let _session: Session | null = null;

/**
 * Authenticate with a device ID and desired display name.
 * Creates the account on first call; returns the same account on subsequent calls.
 */
export async function authenticateDevice(
  deviceId: string,
  username: string
): Promise<Session> {
  _session = await nakamaClient.authenticateDevice(deviceId, true, username);
  return _session;
}

/** Returns the current session, or null if not authenticated. */
export function getSession(): Session | null {
  return _session;
}
