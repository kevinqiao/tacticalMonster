/**
 * 已接入 casual 平台的游戏注册表。新游戏在此登记，避免平台核心散落 gameType 分支。
 */

export type CasualSeedStrategy = "remote_http";

/** 异步桌 bot 分由谁写入 */
export type CasualBotPolicy = "game_ingest" | "none";

/** find-match-by-game 返回 seed 的方式 */
export type CasualBridgeLoadGameSeed = "seed_binding_id" | "synthetic_session";

export type CasualGameRegistration = {
  gameType: string;
  displayName: string;
  seedStrategy: CasualSeedStrategy;
  /** remote_http：环境变量名（如 SOLITAIRE_HTTP_ORIGIN） */
  seedRemoteOriginEnv?: string;
  seedRemoteDevDefault?: string;
  botPolicy: CasualBotPolicy;
  /** 虚拟对手 uid 前缀（DB 存量依赖，勿改已上线游戏） */
  virtualUidPrefix: string;
  /** 虚拟 bot gameId：`vp_{matchId}{suffix}_r{slot}`，suffix 如 `_bb` 或空 */
  virtualGameIdInfix: string;
  bridgeLoadGameSeed: CasualBridgeLoadGameSeed;
  /** 是否参与 Pass spotlight 轮换 */
  spotlightEligible: boolean;
  /** Play 大厅是否展示该玩法（false = 暂时下架，代码与后端保留） */
  lobbyVisible?: boolean;
  /** 无游玩记录时的默认主游戏 */
  primaryGameDefault?: boolean;
};

const DEV_SOLITAIRE_SITE_ORIGIN = "https://artful-chipmunk-59.convex.site";
const DEV_BLOCK_BLAST_SITE_ORIGIN = "https://spotted-marten-367.convex.site";
const DEV_TOWER_SITE_ORIGIN = "https://tower-arena-dev.convex.site";
const DEV_MATCH3_SITE_ORIGIN = "https://strong-condor-681.convex.site";

export const CASUAL_GAME_REGISTRY = {
  solitaire: {
    gameType: "solitaire",
    displayName: "Solitaire",
    seedStrategy: "remote_http",
    seedRemoteOriginEnv: "SOLITAIRE_HTTP_ORIGIN",
    seedRemoteDevDefault: DEV_SOLITAIRE_SITE_ORIGIN,
    botPolicy: "game_ingest",
    virtualUidPrefix: "__vp_solitaire:",
    virtualGameIdInfix: "",
    bridgeLoadGameSeed: "seed_binding_id",
    spotlightEligible: true,
    primaryGameDefault: true,
  },
  block_blast: {
    gameType: "block_blast",
    displayName: "Block Blast",
    seedStrategy: "remote_http",
    seedRemoteOriginEnv: "BLOCK_BLAST_HTTP_ORIGIN",
    seedRemoteDevDefault: DEV_BLOCK_BLAST_SITE_ORIGIN,
    botPolicy: "game_ingest",
    virtualUidPrefix: "__vp_block_blast:",
    virtualGameIdInfix: "_bb",
    bridgeLoadGameSeed: "synthetic_session",
    spotlightEligible: true,
  },
  tower_arena: {
    gameType: "tower_arena",
    displayName: "Tower Defense",
    seedStrategy: "remote_http",
    seedRemoteOriginEnv: "TOWER_HTTP_ORIGIN",
    seedRemoteDevDefault: DEV_TOWER_SITE_ORIGIN,
    botPolicy: "game_ingest",
    virtualUidPrefix: "__vp_tower:",
    virtualGameIdInfix: "_ta",
    bridgeLoadGameSeed: "seed_binding_id",
    spotlightEligible: false,
    lobbyVisible: false,
  },
  match_3: {
    gameType: "match_3",
    displayName: "Match-3",
    seedStrategy: "remote_http",
    seedRemoteOriginEnv: "MATCH3_HTTP_ORIGIN",
    seedRemoteDevDefault: DEV_MATCH3_SITE_ORIGIN,
    botPolicy: "game_ingest",
    virtualUidPrefix: "__vp_match_3:",
    virtualGameIdInfix: "_m3",
    bridgeLoadGameSeed: "seed_binding_id",
    spotlightEligible: true,
  },
} as const satisfies Record<string, CasualGameRegistration>;

export type RegisteredCasualGameType = keyof typeof CASUAL_GAME_REGISTRY;

export function getCasualGameRegistration(gameType: string): CasualGameRegistration | null {
  const key = gameType.trim();
  if (!key) return null;
  return (CASUAL_GAME_REGISTRY as Record<string, CasualGameRegistration>)[key] ?? null;
}

export function isRegisteredCasualGameType(gameType: string): gameType is RegisteredCasualGameType {
  return getCasualGameRegistration(gameType) != null;
}

export function listRegisteredCasualGameTypes(): RegisteredCasualGameType[] {
  return Object.keys(CASUAL_GAME_REGISTRY) as RegisteredCasualGameType[];
}

export function listSpotlightEligibleGameTypes(): RegisteredCasualGameType[] {
  return listRegisteredCasualGameTypes().filter(
    (t) => CASUAL_GAME_REGISTRY[t].spotlightEligible
  );
}

/** Play 大厅是否展示该玩法（默认 true） */
export function isCasualGameLobbyVisible(gameType: string): boolean {
  const reg = getCasualGameRegistration(gameType);
  if (!reg) return false;
  return reg.lobbyVisible !== false;
}

export function listLobbyVisibleCasualGameTypes(): RegisteredCasualGameType[] {
  return listRegisteredCasualGameTypes().filter((t) =>
    isCasualGameLobbyVisible(CASUAL_GAME_REGISTRY[t].gameType)
  );
}

export function getDefaultPrimaryGameType(): RegisteredCasualGameType {
  const explicit = listRegisteredCasualGameTypes().find((t) => {
    const reg = CASUAL_GAME_REGISTRY[t] as CasualGameRegistration;
    return reg.primaryGameDefault === true;
  });
  return explicit ?? "solitaire";
}

export function resolveSeedRemoteOrigin(reg: CasualGameRegistration): string {
  const envKey = reg.seedRemoteOriginEnv;
  const fromEnv =
    envKey &&
    (process.env[envKey] ??
      (envKey === "SOLITAIRE_HTTP_ORIGIN"
        ? process.env.SOLITAIRE_CONVEX_SITE_URL
        : envKey === "BLOCK_BLAST_HTTP_ORIGIN"
          ? process.env.BLOCK_BLAST_CONVEX_SITE_URL
          : envKey === "TOWER_HTTP_ORIGIN"
            ? process.env.TOWER_CONVEX_SITE_URL
            : envKey === "MATCH3_HTTP_ORIGIN"
              ? process.env.MATCH3_CONVEX_SITE_URL
              : undefined));
  const origin = (typeof fromEnv === "string" ? fromEnv : "").trim().replace(/\/$/, "");
  if (origin) return origin;
  return (reg.seedRemoteDevDefault ?? "").trim().replace(/\/$/, "");
}

export function virtualUidPrefixForGame(gameType: string): string | null {
  return getCasualGameRegistration(gameType)?.virtualUidPrefix ?? null;
}

export function virtualBotGameId(matchId: string, slot: number, gameType: string): string {
  const reg = getCasualGameRegistration(gameType);
  const infix = reg?.virtualGameIdInfix ?? "";
  return `vp_${matchId}${infix}_r${slot}`;
}

export function virtualBotUid(matchId: string, slot: number, gameType: string): string {
  const prefix = virtualUidPrefixForGame(gameType) ?? `__vp_${gameType}:`;
  return `${prefix}${matchId}:r${slot}`;
}

export function usesGameIngestBotPolicy(gameType: string): boolean {
  return getCasualGameRegistration(gameType)?.botPolicy === "game_ingest";
}
