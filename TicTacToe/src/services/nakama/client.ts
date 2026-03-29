/**
 * client.ts — Nakama Client singleton.
 *
 * One client per app lifetime. All services share this instance.
 * Never create a Client inside a component or screen.
 */
import { Client } from "@heroiclabs/nakama-js";
import { NAKAMA_CONFIG } from "../../config/nakama.config";

export const nakamaClient = new Client(
  NAKAMA_CONFIG.serverKey,
  NAKAMA_CONFIG.host,
  NAKAMA_CONFIG.port,
  NAKAMA_CONFIG.useSSL
);
