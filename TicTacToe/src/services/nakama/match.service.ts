/**
 * match.service.ts — Real-time matchmaking and in-game messaging.
 *
 * All real-time communication goes through the WebSocket.
 * OpCode 1 = player move (must match OpCodeMove in game/opcodes.go).
 */
import { getSocket } from "./socket.service";

/**
 * Adds the player to Nakama's matchmaking queue.
 * The server fires MatchmakerMatched the moment a second compatible player arrives.
 * The client does not poll — it receives a single event when the server is ready.
 */
export async function joinMatchmaker(): Promise<void> {
  const socket = await getSocket();
  await socket.addMatchmaker("*", 2, 2); // minPlayers=2, maxPlayers=2
}

/**
 * Sends a move to the server.
 * The server validates it — out-of-turn or occupied-cell moves are silently rejected.
 */
export async function sendMove(matchId: string, position: number): Promise<void> {
  const socket = await getSocket();
  const data = JSON.stringify({ position });
  await socket.sendMatchState(matchId, 1, data); // opcode 1 = move
}
