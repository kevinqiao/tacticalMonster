/** 与 casual `CasualAsyncTableLeaderboardRow` / `CasualAsyncTableSummary` 对齐；赛后本桌榜 UI。 */
export type CasualAsyncTableLeaderboardRowUI = {
  rank: number;
  score?: number;
  rowState?: 'scored' | 'playing';
  displayLabel: string;
  isYou: boolean;
  /** 系统对手（虚拟补位） */
  isBot?: boolean;
};

export type CasualAsyncTableSummaryUI = {
  maxPlayers: number;
  rows: CasualAsyncTableLeaderboardRowUI[];
};

export type ManualSettleConfirmExtras = {
  tableSummary?: CasualAsyncTableSummaryUI | null;
  /** 同桌尚未全部提交，暂无本桌名次表 */
  pendingOthers?: boolean;
  canReplay?: boolean;
};
