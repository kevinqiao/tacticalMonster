/** 与 casual `CasualAsyncTableLeaderboardRow` / `CasualAsyncTableSummary` 对齐；赛后本桌榜 UI。 */
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
    };

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
  /** match_3 观战入口元数据 */
  watchContext?: Match3WatchContext;
};

export type CasualAsyncTableSummaryUI = {
  maxPlayers: number;
  rows: CasualAsyncTableLeaderboardRowUI[];
  /** true：榜展示已稳定，不再随时间变化；客户端可停止 poll */
  isBoardStable?: boolean;
  /** `getCasualAsyncTableSummaryForGame` 附带（非 ingest 响应） */
  replayOffered?: boolean;
  replayTokenCount?: number;
  canReplay?: boolean;
  replayWindowEndsAt?: number;
};

export type ManualSettleConfirmExtras = {
  tableSummary?: CasualAsyncTableSummaryUI | null;
  /** 同桌尚未全部提交，暂无本桌名次表 */
  pendingOthers?: boolean;
  replayOffered?: boolean;
  replayTokenCount?: number;
  canReplay?: boolean;
  /** epoch ms；再战窗口结束时刻，供同桌摘要倒计时 */
  replayWindowEndsAt?: number;
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
  }
) {
  setters.setTableSummary(summary);
  const offered = Boolean(summary.replayOffered ?? summary.canReplay);
  setters.setReplayOffered(offered);
  setters.setReplayTokenCount(
    typeof summary.replayTokenCount === 'number' ? summary.replayTokenCount : 0
  );
  setters.setCanReplay(Boolean(summary.canReplay));
  setters.setReplayWindowEndsAt(
    typeof summary.replayWindowEndsAt === 'number' ? summary.replayWindowEndsAt : undefined
  );
}
