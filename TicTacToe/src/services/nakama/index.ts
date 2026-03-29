/**
 * index.ts — Barrel export for all Nakama services.
 *
 * Screens import from this single path:
 *   import { authenticateDevice, getSocket, sendMove } from "../src/services/nakama";
 *
 * This decouples screens from individual file paths and makes future refactors painless.
 */
export { authenticateDevice, getSession } from "./auth.service";
export { getSocket, disconnectSocket, isSocketConnected } from "./socket.service";
export { joinMatchmaker, sendMove } from "./match.service";
export { getLeaderboard } from "./leaderboard.service";
export {
  getOnlinePlayers,
  sendChallenge,
  getPendingChallenges,
  respondToChallenge,
  getProfile,
  updateDisplayName,
} from "./social.service";
