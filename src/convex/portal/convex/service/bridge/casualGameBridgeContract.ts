/**
 * Casual ↔ 游戏服 HTTP Bridge 契约（平台侧单一真相源）。
 * 游戏 Convex 应实现相同 JSON 形状；Header: `X-Portal-Bridge-Secret`.
 */

/** 契约版本；响应可选携带，便于游戏服并行升级 */
export const CASUAL_GAME_BRIDGE_VERSION = 1 as const;

export type PortalGameBridgeVersion = typeof CASUAL_GAME_BRIDGE_VERSION;

/** POST /internal/find-match-by-game */
export type FindMatchByGameRequest = {
  gameId: string;
  bridgeVersion?: PortalGameBridgeVersion;
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
  | { ok: true; bridgeVersion: PortalGameBridgeVersion; match: FindMatchByGameMatchPayload }
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
  bridgeVersion?: PortalGameBridgeVersion;
};

export type CasualRunIngestResponse =
  | {
      ok: true;
      bridgeVersion?: PortalGameBridgeVersion;
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
  bridgeVersion?: PortalGameBridgeVersion;
};

export type CasualSubmitMode = "daily" | "solo" | "mixed";

/** POST /internal/casual-replay-authorize */
export type CasualReplayAuthorizeRequest = {
  uid: string;
  matchGameId: string;
  bridgeVersion?: PortalGameBridgeVersion;
};

export type CasualReplayAuthorizeResponse =
  | {
      ok: true;
      bridgeVersion?: PortalGameBridgeVersion;
      gameId: string;
      templateId: string;
      matchId: string;
      replayEpoch: number;
    }
  | { ok: false; error: string };

/** POST /internal/solo-rank-planning-inputs（可选；resolve 在 solo 时可内联） */
export type SoloRankPlanningInputsRequest = {
  uid: string;
  templateId: string;
  bridgeVersion?: PortalGameBridgeVersion;
};

export function bridgeOkBody<T extends Record<string, unknown>>(body: T): T & { bridgeVersion: PortalGameBridgeVersion } {
  return { ...body, bridgeVersion: CASUAL_GAME_BRIDGE_VERSION };
}
