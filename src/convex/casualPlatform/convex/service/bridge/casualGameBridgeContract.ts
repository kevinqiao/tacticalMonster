/**
 * Casual ↔ 游戏服 HTTP Bridge 契约（平台侧单一真相源）。
 * 游戏 Convex 应实现相同 JSON 形状；Header: `X-Casual-Bridge-Secret`.
 */

/** 契约版本；响应可选携带，便于游戏服并行升级 */
export const CASUAL_GAME_BRIDGE_VERSION = 1 as const;

export type CasualGameBridgeVersion = typeof CASUAL_GAME_BRIDGE_VERSION;

/** POST /internal/find-match-by-game */
export type FindMatchByGameRequest = {
  gameId: string;
  bridgeVersion?: CasualGameBridgeVersion;
};

export type FindMatchByGameMatchPayload = {
  gameId: string;
  seed: string;
  seedId?: string;
  poolVersion?: string;
  templateId?: string;
  replayEpoch?: number;
  uid?: string;
  matchId?: string;
};

export type FindMatchByGameResponse =
  | { ok: true; bridgeVersion: CasualGameBridgeVersion; match: FindMatchByGameMatchPayload }
  | { ok: false; error: string };

/** POST /internal/casual-run-ingest */
export type CasualRunIngestBotFill = {
  rank: number;
  score: number;
  duration?: number;
  rolloutIndex?: number;
  revealAt?: number;
};

export type CasualRunIngestRequest = {
  uid: string;
  matchGameId: string;
  score: number;
  botFills?: CasualRunIngestBotFill[];
  replaceAllVirtual?: boolean;
  bridgeVersion?: CasualGameBridgeVersion;
};

export type CasualRunIngestResponse =
  | {
      ok: true;
      bridgeVersion?: CasualGameBridgeVersion;
      tableSummary?: unknown;
      pendingOthers?: boolean;
      deduped?: boolean;
      periodSettled?: boolean;
      finalized?: boolean;
    }
  | { ok: false; error: string };

/** POST /internal/resolve-match-submit-context */
export type ResolveMatchSubmitContextRequest = {
  uid: string;
  matchGameId: string;
  score?: number;
  bridgeVersion?: CasualGameBridgeVersion;
};

/** Human composition on async multi; not play-mode Solo Challenge. */
export type CasualSubmitMode = "daily" | "single_human" | "mixed";
/** @deprecated Prefer `"single_human"`. Legacy wire alias. */
export type CasualSubmitModeLegacy = CasualSubmitMode | "solo";

/** POST /internal/casual-replay-authorize */
export type CasualReplayAuthorizeRequest = {
  uid: string;
  matchGameId: string;
  replayTokenId?: string;
  bridgeVersion?: CasualGameBridgeVersion;
};

export type CasualReplayAuthorizeResponse =
  | {
      ok: true;
      bridgeVersion?: CasualGameBridgeVersion;
      gameId: string;
      templateId: string;
      matchId: string;
      replayEpoch: number;
    }
  | { ok: false; error: string };

/** POST /internal/solo-rank-planning-inputs（可选；resolve 在 single_human 时可内联） */
export type SoloRankPlanningInputsRequest = {
  uid: string;
  templateId: string;
  bridgeVersion?: CasualGameBridgeVersion;
};

export function bridgeOkBody<T extends Record<string, unknown>>(body: T): T & { bridgeVersion: CasualGameBridgeVersion } {
  return { ...body, bridgeVersion: CASUAL_GAME_BRIDGE_VERSION };
}
