/**
 * socket.service.ts — WebSocket connection management.
 *
 * Maintains a single persistent socket for the app lifetime.
 * The Socket interface has no built-in isConnected() — we track state manually.
 */
import { Socket } from "@heroiclabs/nakama-js";
import { nakamaClient } from "./client";
import { getSession } from "./auth.service";
import { NAKAMA_CONFIG } from "../../config/nakama.config";

let _socket: Socket | null = null;
let _connected = false;

/**
 * Returns an open socket, creating and connecting one if needed.
 * Safe to call from any screen — will reuse the existing connection.
 */
export async function getSocket(): Promise<Socket> {
  if (_socket && _connected) {
    return _socket;
  }

  const session = getSession();
  if (!session) {
    throw new Error("Must authenticate before connecting socket");
  }

  _socket = nakamaClient.createSocket(NAKAMA_CONFIG.useSSL, false);

  // Track connection state manually — Socket interface has no isConnected() method.
  _socket.ondisconnect = () => {
    _connected = false;
  };

  await _socket.connect(session, true);
  _connected = true;

  return _socket;
}

/** Cleanly disconnects the socket (call on logout or app backgrounding). */
export function disconnectSocket(): void {
  if (_socket && _connected) {
    _socket.disconnect(true);
    _connected = false;
    _socket = null;
  }
}

/** Returns true if the socket is currently open. */
export function isSocketConnected(): boolean {
  return _connected;
}
