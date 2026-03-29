/**
 * nakama.config.ts — Single source of truth for server connection details.
 *
 * To point at a different server (staging, prod), change only this file.
 * Never hardcode host/key in individual services or screens.
 */
export const NAKAMA_CONFIG = {
  /** Must match --socket.server_key in Dockerfile / Engine configuration */
  serverKey: "defaultkey",

  /**
   * Your Public Koyeb Domain
   */
  host: "holy-leoline-streamlen-0b59b8cc.koyeb.app",

  /** Koyeb's Load Balancer handles traffic natively on port 443 for SSL */
  port: "443",

  /** Set to true for production HTTPS/WSS */
  useSSL: true,
} as const;
