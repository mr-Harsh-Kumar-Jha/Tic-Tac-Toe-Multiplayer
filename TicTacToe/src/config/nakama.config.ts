/**
 * nakama.config.ts — Single source of truth for server connection details.
 *
 * To point at a different server (staging, prod), change only this file.
 * Never hardcode host/key in individual services or screens.
 */
export const NAKAMA_CONFIG = {
  /** Must match --socket.server_key in docker-compose.yml */
  serverKey: "s3cr3tserver",

  /**
   * Your Mac's LAN IP.
   * Physical devices cannot reach 127.0.0.1 (that's the phone's own loopback).
   * Find your IP with: ipconfig getifaddr en0
   */
  host: "192.168.0.101",

  /** Nakama's WebSocket/HTTP port */
  port: "7350",

  /** Set to true for production HTTPS/WSS */
  useSSL: false,
} as const;
