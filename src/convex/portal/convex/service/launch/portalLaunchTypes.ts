export const LAUNCH_TOKEN_TTL_MS = 2 * 60 * 1000;

export type LaunchSurface = "web" | "telegram" | "mcp_app" | "agent";

export type CreateLaunchArgs = {
  uid: string;
  templateId: string;
  surface?: LaunchSurface | string;
  partnerId?: number;
  /** Absolute or site origin used to build playUrl (optional). */
  webOrigin?: string;
};

export type LaunchTokenRecord = {
  token: string;
  uid: string;
  partnerId?: number;
  templateId: string;
  surface: string;
  status: "pending" | "used" | "expired" | "cancelled";
  gameId?: string;
  matchId?: string;
  runTournamentId?: string;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
};

export function newLaunchToken(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `launch_${Date.now().toString(36)}_${rand}`;
}

export function buildPlayUrl(args: {
  webOrigin?: string;
  token: string;
  templateId: string;
  gameId?: string;
}): string {
  const path = `/embed/play?launch=${encodeURIComponent(args.token)}&templateId=${encodeURIComponent(args.templateId)}${
    args.gameId ? `&gameId=${encodeURIComponent(args.gameId)}` : ""
  }`;
  const origin = args.webOrigin?.trim().replace(/\/$/, "");
  return origin ? `${origin}${path}` : path;
}
