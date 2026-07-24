import { resolveRewardedAdChannel } from "host/service/ads/rewarded/registry";

/** 休闲异步桌观战/复盘入口（match_3 · solitaire 等同形） */
export type Match3WatchContext =
  | {
      kind: 'rollout';
      seedId: string;
      rolloutIndex: number;
      expectedScore?: number;
      revealAt?: number;
      duration?: number;
    }
  | {
      kind: 'recorded';
      gameId: string;
      opCount?: number;
      seedId?: string;
      /** 交分写入 casualPlatform 的快照；历史页可不查游戏服 */
      steps?: ReadonlyArray<Record<string, unknown>>;
    };

export type CasualWatchContext = Match3WatchContext;

export type CasualAsyncTableLeaderboardRowUI = {
  rank: number;
  score?: number;
  rowState?: 'scored' | 'playing' | 'matching';
  /** bot 对局中：reveal 时刻（ms），用于展示已对局时长 */
  revealAt?: number;
  displayLabel: string;
  isYou: boolean;
  /** 系统对手（虚拟补位） */
  isBot?: boolean;
  /** 观战/回放入口元数据（match_3 · solitaire） */
  watchContext?: Match3WatchContext;
};

export type CasualTriathlonLegTableSummaryUI = {
  gameIndex: number;
  gameType: string;
  label: string;
  rows: CasualAsyncTableLeaderboardRowUI[];
};

export type CasualAsyncTableSummaryUI = {
  maxPlayers: number;
  rows: CasualAsyncTableLeaderboardRowUI[];
  /** true：榜展示已稳定，不再随时间变化；客户端可停止 poll */
  isBoardStable?: boolean;
  /** 三场合战：各局单局榜（含回放）；`rows` 为三局总分榜 */
  triathlonLegs?: CasualTriathlonLegTableSummaryUI[];
  /** `getCasualAsyncTableSummaryForGame` 附带（非 ingest 响应） */
  replayOffered?: boolean;
  replayMode?: "ad" | "token";
  replayTokenCount?: number;
  canReplay?: boolean;
  adReplayDailyRemaining?: number;
  replayWindowEndsAt?: number;
};

export function isTriathlonTableSummary(
  summary: CasualAsyncTableSummaryUI | null | undefined
): summary is CasualAsyncTableSummaryUI & {
  triathlonLegs: CasualTriathlonLegTableSummaryUI[];
} {
  return Boolean(summary?.triathlonLegs?.length);
}

export function casualTableSummaryHasReplay(
  summary: CasualAsyncTableSummaryUI | null | undefined
): boolean {
  if (!summary) return false;
  if (isTriathlonTableSummary(summary)) {
    return summary.triathlonLegs.some((leg) => leg.rows.some((r) => r.watchContext));
  }
  return Boolean(summary.rows?.some((r) => r.watchContext));
}

export type CasualWatchRowHandler = (
  ctx: Match3WatchContext,
  displayLabel: string,
  gameType?: 'match_3' | 'solitaire' | 'block_blast' | 'yatz'
) => void;

export type ManualSettleConfirmExtras = {
  tableSummary?: CasualAsyncTableSummaryUI | null;
  /** 同桌尚未全部提交，暂无本桌名次表 */
  pendingOthers?: boolean;
  replayOffered?: boolean;
  replayMode?: "ad" | "token";
  replayTokenCount?: number;
  canReplay?: boolean;
  adReplayDailyRemaining?: number;
  /** epoch ms；再战窗口结束时刻，供同桌摘要倒计时 */
  replayWindowEndsAt?: number;
  /** solo_p75_challenge：目标分（P75） */
  seedScoreThreshold?: number;
  /** solo_p75_challenge：是否达标成功 */
  success?: boolean;
  /** 三场合战非最后一局：得分明细后进入局间过渡，不展示同桌榜 */
  triathlonScoreReportOnly?: boolean;
  deferTriathlonTableSummary?: boolean;
};

/** 从 `getCasualAsyncTableSummaryForGame` 同步榜 + 再战 UI 状态 */
export function applyCasualTableSummaryFromQuery(
  summary: CasualAsyncTableSummaryUI,
  setters: {
    setTableSummary: (v: CasualAsyncTableSummaryUI | null) => void;
    setReplayOffered: (v: boolean) => void;
    setReplayTokenCount: (v: number) => void;
    setCanReplay: (v: boolean) => void;
    setReplayWindowEndsAt: (v: number | undefined) => void;
    setReplayMode?: (v: "ad" | "token") => void;
    setAdReplayDailyRemaining?: (v: number | undefined) => void;
  }
) {
  const ticketCount =
    typeof summary.replayTokenCount === "number" ? summary.replayTokenCount : 0;
  // Server may offer ad while this host has no provider (e.g. brainwar.games without mock).
  const wantAd =
    summary.replayMode === "ad" && resolveRewardedAdChannel() != null;
  const canReplay = wantAd
    ? Boolean(summary.canReplay)
    : summary.replayMode === "ad"
      ? Boolean(summary.replayOffered) && ticketCount >= 1
      : Boolean(summary.canReplay);

  setters.setTableSummary(summary);
  setters.setReplayOffered(Boolean(summary.replayOffered));
  setters.setReplayTokenCount(ticketCount);
  setters.setCanReplay(canReplay);
  if (setters.setAdReplayDailyRemaining) {
    setters.setAdReplayDailyRemaining(
      typeof summary.adReplayDailyRemaining === 'number'
        ? summary.adReplayDailyRemaining
        : undefined
    );
  }
  setters.setReplayWindowEndsAt(
    typeof summary.replayWindowEndsAt === 'number' ? summary.replayWindowEndsAt : undefined
  );
  if (setters.setReplayMode) {
    setters.setReplayMode(wantAd ? "ad" : "token");
  }
}

/** 历史战报表头：本局名次 + 获得积分（替代「本桌至多 N 席 · 已计分 M 人」） */
export function formatHistoryReportTableMetaNote(args: {
  rank?: number | null;
  pointDelta?: number | null;
  settlementPending?: boolean;
}): string {
  if (args.settlementPending) {
    return '等待结算中';
  }
  const parts: string[] = [];
  if (args.rank != null && args.rank >= 1) {
    parts.push(`本局第 ${args.rank} 名`);
  }
  if (args.pointDelta != null) {
    const sign = args.pointDelta >= 0 ? '+' : '';
    parts.push(`获得 ${sign}${args.pointDelta} 积分`);
  }
  if (parts.length === 0) {
    return '名次与积分待结算';
  }
  return parts.join(' · ');
}
