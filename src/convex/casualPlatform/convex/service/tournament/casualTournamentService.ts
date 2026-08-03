/**
 * 向后兼容：`service/tournament/casualTournamentService:*` UDF 路径。
 * 实现已迁至 join/、list/、settle/、shared/ 等子目录；新代码请直接引用那些模块。
 */
export {
  listTournaments,
  leaderboard,
  periodInstanceSelfStanding,
  solitaireSessionStandings,
  gameHistory,
  listOpenCasualRunAssignments,
} from "./list/casualTournamentQueries";

export { previewJoinEntryCharge } from "./join/casualJoinMutations";

export {
  claimCasualRunRewards,
  claimCasualScoreTierPendingReward,
  claimCasualScoreTierPendingRewardsBatch,
} from "./settle/casualRunRewardsMutations";

export {
  migrateCasualTournamentsGameType,
  migrateStripCasualRunExternalGameId,
  seedDemoTournaments,
} from "./shared/casualTournamentAdmin";

export type { JoinCasualRunResult } from "./shared/casualTournamentTypes";

export {
  CASUAL_ASYNC_VIRTUAL_BOT_UID_BLOCK_BLAST,
  CASUAL_ASYNC_VIRTUAL_BOT_UID_SOLITAIRE,
  isCasualAsyncVirtualOpponentUid,
} from "./settle/casualRunSettlementFill";
