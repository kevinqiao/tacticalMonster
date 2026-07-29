/**
 * Partner game catalog (static config). All partners are fully open;
 * lobby offerings / tournaments decide what appears in a given lobby.
 */

export type PartnerSeedStrategy = "remote_http" | "catalog_internal";
export type PartnerBotPolicy = "game_ingest" | "platform_ingest" | "none";
export type PartnerBridgeLoadGameSeed = "seed_binding_id" | "synthetic_session";

export type PartnerGameRegistration = {
  gameType: string;
  displayName: string;
  seedStrategy: PartnerSeedStrategy;
  seedRemoteOriginEnv?: string;
  seedRemoteDevDefault?: string;
  botPolicy: PartnerBotPolicy;
  virtualUidPrefix: string;
  virtualGameIdInfix: string;
  bridgeLoadGameSeed: PartnerBridgeLoadGameSeed;
};

const DEV_SOLITAIRE_SITE_ORIGIN = "https://artful-chipmunk-59.convex.site";
const DEV_BLOCK_BLAST_SITE_ORIGIN = "https://spotted-marten-367.convex.site";
const DEV_TOWER_SITE_ORIGIN = "https://tower-arena-dev.convex.site";
const DEV_MATCH3_SITE_ORIGIN = "https://strong-condor-681.convex.site";
const DEV_YATZ_SITE_ORIGIN = "https://precious-retriever-7.convex.site";

export const PARTNER_GAME_TYPES = [
  "solitaire",
  "block_blast",
  "match_3",
  "tower_arena",
  "yatz",
] as const;

export type RegisteredPartnerGameType = (typeof PARTNER_GAME_TYPES)[number];

export const PARTNER_GAME_REGISTRY: Record<RegisteredPartnerGameType, PartnerGameRegistration> = {
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

export function getPartnerGameRegistration(gameType: string): PartnerGameRegistration | null {
  const key = gameType.trim();
  if (!key) return null;
  return (PARTNER_GAME_REGISTRY as Record<string, PartnerGameRegistration>)[key] ?? null;
}

export function isRegisteredPartnerGameType(gameType: string): gameType is RegisteredPartnerGameType {
  return getPartnerGameRegistration(gameType) != null;
}

export function listRegisteredPartnerGameTypes(): RegisteredPartnerGameType[] {
  return [...PARTNER_GAME_TYPES];
}

export function resolveSeedRemoteOrigin(reg: PartnerGameRegistration): string {
  const envKey = reg.seedRemoteOriginEnv;
  const fromEnv = envKey ? process.env[envKey] : undefined;
  const origin = (typeof fromEnv === "string" ? fromEnv : "").trim().replace(/\/$/, "");
  if (origin) return origin;
  return (reg.seedRemoteDevDefault ?? "").trim().replace(/\/$/, "");
}

export function virtualUidPrefixForGame(gameType: string): string | null {
  return getPartnerGameRegistration(gameType)?.virtualUidPrefix ?? null;
}

export function virtualBotGameId(matchId: string, slot: number, gameType: string): string {
  const reg = getPartnerGameRegistration(gameType);
  const infix = reg?.virtualGameIdInfix ?? "";
  return `vp_${matchId}${infix}_r${slot}`;
}

export function virtualBotUid(matchId: string, slot: number, gameType: string): string {
  const prefix = virtualUidPrefixForGame(gameType) ?? `__vp_${gameType}:`;
  return `${prefix}${matchId}:r${slot}`;
}

export function usesPlatformIngestBotPolicy(gameType: string): boolean {
  return getPartnerGameRegistration(gameType)?.botPolicy === "platform_ingest";
}

export function isCasualGameLobbyVisible(gameType: string): boolean {
  return isRegisteredPartnerGameType(gameType);
}

export const CASUAL_GAME_REGISTRY = PARTNER_GAME_REGISTRY;

export function usesGameIngestBotPolicy(gameType: string): boolean {
  return getPartnerGameRegistration(gameType)?.botPolicy === "game_ingest";
}

export function getDefaultPrimaryGameType(): RegisteredPartnerGameType {
  return "solitaire";
}

/** @deprecated alias for bot fill imports from casual */
export const getCasualGameRegistration = getPartnerGameRegistration;
