/**
 * Portal 游戏注册表（5 款竞技玩法）。
 */

export type PortalSeedStrategy = "remote_http" | "catalog_internal";
export type PortalBotPolicy = "game_ingest" | "platform_ingest" | "none";
export type PortalBridgeLoadGameSeed = "seed_binding_id" | "synthetic_session";

export type PortalGameRegistration = {
  gameType: string;
  displayName: string;
  seedStrategy: PortalSeedStrategy;
  seedRemoteOriginEnv?: string;
  seedRemoteDevDefault?: string;
  botPolicy: PortalBotPolicy;
  virtualUidPrefix: string;
  virtualGameIdInfix: string;
  bridgeLoadGameSeed: PortalBridgeLoadGameSeed;
};

const DEV_SOLITAIRE_SITE_ORIGIN = "https://artful-chipmunk-59.convex.site";
const DEV_BLOCK_BLAST_SITE_ORIGIN = "https://spotted-marten-367.convex.site";
const DEV_TOWER_SITE_ORIGIN = "https://tower-arena-dev.convex.site";
const DEV_MATCH3_SITE_ORIGIN = "https://strong-condor-681.convex.site";
const DEV_YATZ_SITE_ORIGIN = "https://precious-retriever-7.convex.site";

export const PORTAL_GAME_TYPES = [
  "solitaire",
  "block_blast",
  "match_3",
  "tower_arena",
  "yatz",
] as const;

export type RegisteredPortalGameType = (typeof PORTAL_GAME_TYPES)[number];

export const PORTAL_GAME_REGISTRY: Record<RegisteredPortalGameType, PortalGameRegistration> = {
  solitaire: {
    gameType: "solitaire",
    displayName: "Solitaire",
    seedStrategy: "catalog_internal",
    seedRemoteOriginEnv: "SOLITAIRE_HTTP_ORIGIN",
    seedRemoteDevDefault: DEV_SOLITAIRE_SITE_ORIGIN,
    botPolicy: "platform_ingest",
    virtualUidPrefix: "__vp_solitaire:",
    virtualGameIdInfix: "",
    bridgeLoadGameSeed: "seed_binding_id",
  },
  block_blast: {
    gameType: "block_blast",
    displayName: "Block Blast",
    seedStrategy: "catalog_internal",
    seedRemoteOriginEnv: "BLOCK_BLAST_HTTP_ORIGIN",
    seedRemoteDevDefault: DEV_BLOCK_BLAST_SITE_ORIGIN,
    botPolicy: "platform_ingest",
    virtualUidPrefix: "__vp_block_blast:",
    virtualGameIdInfix: "_bb",
    bridgeLoadGameSeed: "seed_binding_id",
  },
  tower_arena: {
    gameType: "tower_arena",
    displayName: "Tower Defense",
    seedStrategy: "catalog_internal",
    seedRemoteOriginEnv: "TOWER_HTTP_ORIGIN",
    seedRemoteDevDefault: DEV_TOWER_SITE_ORIGIN,
    botPolicy: "platform_ingest",
    virtualUidPrefix: "__vp_tower:",
    virtualGameIdInfix: "_ta",
    bridgeLoadGameSeed: "seed_binding_id",
  },
  match_3: {
    gameType: "match_3",
    displayName: "Match-3",
    seedStrategy: "catalog_internal",
    seedRemoteOriginEnv: "MATCH3_HTTP_ORIGIN",
    seedRemoteDevDefault: DEV_MATCH3_SITE_ORIGIN,
    botPolicy: "platform_ingest",
    virtualUidPrefix: "__vp_match_3:",
    virtualGameIdInfix: "_m3",
    bridgeLoadGameSeed: "seed_binding_id",
  },
  yatz: {
    gameType: "yatz",
    displayName: "Yatz",
    seedStrategy: "catalog_internal",
    seedRemoteOriginEnv: "YATZ_HTTP_ORIGIN",
    seedRemoteDevDefault: DEV_YATZ_SITE_ORIGIN,
    botPolicy: "platform_ingest",
    virtualUidPrefix: "__vp_yatz:",
    virtualGameIdInfix: "_yz",
    bridgeLoadGameSeed: "seed_binding_id",
  },
};

export function getPortalGameRegistration(gameType: string): PortalGameRegistration | null {
  const key = gameType.trim();
  if (!key) return null;
  return (PORTAL_GAME_REGISTRY as Record<string, PortalGameRegistration>)[key] ?? null;
}

export function isRegisteredPortalGameType(gameType: string): gameType is RegisteredPortalGameType {
  return getPortalGameRegistration(gameType) != null;
}

export function listRegisteredPortalGameTypes(): RegisteredPortalGameType[] {
  return [...PORTAL_GAME_TYPES];
}

export function resolveSeedRemoteOrigin(reg: PortalGameRegistration): string {
  const envKey = reg.seedRemoteOriginEnv;
  const fromEnv = envKey ? process.env[envKey] : undefined;
  const origin = (typeof fromEnv === "string" ? fromEnv : "").trim().replace(/\/$/, "");
  if (origin) return origin;
  return (reg.seedRemoteDevDefault ?? "").trim().replace(/\/$/, "");
}

export function virtualUidPrefixForGame(gameType: string): string | null {
  return getPortalGameRegistration(gameType)?.virtualUidPrefix ?? null;
}

export function virtualBotGameId(matchId: string, slot: number, gameType: string): string {
  const reg = getPortalGameRegistration(gameType);
  const infix = reg?.virtualGameIdInfix ?? "";
  return `vp_${matchId}${infix}_r${slot}`;
}

export function virtualBotUid(matchId: string, slot: number, gameType: string): string {
  const prefix = virtualUidPrefixForGame(gameType) ?? `__vp_${gameType}:`;
  return `${prefix}${matchId}:r${slot}`;
}

export function usesPlatformIngestBotPolicy(gameType: string): boolean {
  return getPortalGameRegistration(gameType)?.botPolicy === "platform_ingest";
}

export function isCasualGameLobbyVisible(gameType: string): boolean {
  return isRegisteredPortalGameType(gameType);
}

export const CASUAL_GAME_REGISTRY = PORTAL_GAME_REGISTRY;

export function usesGameIngestBotPolicy(gameType: string): boolean {
  return getPortalGameRegistration(gameType)?.botPolicy === "game_ingest";
}

export function getDefaultPrimaryGameType(): RegisteredPortalGameType {
  return "solitaire";
}

/** @deprecated alias for bot fill imports from casual */
export const getCasualGameRegistration = getPortalGameRegistration;
