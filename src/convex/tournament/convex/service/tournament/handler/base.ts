import { TimeZoneUtils } from "../../../util/TimeZoneUtils";
import {
  TournamentHandler,
  TournamentStatus,
  createTournament,
  getPlayerAttempts,
  validateEntryFee
} from "../common";
import { MatchManager } from "../matchManager";



/**
 * 完成锦标赛
 */
async function completeTournament(ctx: any, tournamentId: string, now: any): Promise<void> {
  await ctx.db.patch(tournamentId, {
    status: "completed",
    updatedAt: now.iso
  });
}


// ============================================================================
// 基础锦标赛处理器
// ============================================================================

export const baseHandler: TournamentHandler = {
  /**
   * 验证加入条件
   */
  validateJoin: async (ctx: any, params: {
    player: any;
    tournamentType: any;
    tournament: any;
  }) => {

    const { player, tournamentType, tournament } = params;

    const playedMatches = await getPlayerAttempts(ctx, { uid: player.uid, tournamentType });
    const maxAttempts = tournamentType.matchRules?.maxAttempts || 1;
    if (playedMatches.length >= maxAttempts) {
      throw new Error(`已达到最大尝试次数: ${maxAttempts}`);
    }

    // 验证入场费
    await validateEntryFee(ctx, { uid: player.uid, tournamentType });

    // 检查订阅要求
    if (tournamentType.entryRequirements?.isSubscribedRequired && !player.isSubscribed) {
      throw new Error("此锦标赛需要订阅会员才能参与");
    }


    return;
  },

  /**
   * 加入锦标赛
   */
  join: async (ctx, { player, tournamentType, tournament }) => {
    //validtion check
    // await validateLimits(ctx, { uid: player.uid, tournamentType });

    const player_tournament = tournament ? await ctx.db.query("player_tournaments").withIndex("by_tournament_uid", (q: any) => q.eq("tournamentId", tournament._id).eq("uid", player.uid)).unique() : null;
    // if (!tournament || player_tournament === null) {
    //   console.log("deductEntryFee", player.uid, tournament?._id)
    //   await deductEntryFee(ctx, { player, tournamentType });
    // }

    if (tournamentType.matchRules.maxPlayers === 1) {
      const nowISO = new Date().toISOString();
      let tournamentId: string = tournament?._id;
      if (tournament) {

        if (!player_tournament) {
          await ctx.db.insert("player_tournaments", {
            uid: player.uid,
            tournamentId,
            tournamentType: tournamentType.typeId,
            gameType: tournamentType.gameType,
            score: 0,
            matchPoint: 0,
            status: TournamentStatus.OPEN,
            createdAt: nowISO,
            updatedAt: nowISO,
          });
        }
      } else {
        const tournamentObj = await createTournament(ctx, { config: tournamentType, uids: [player.uid] });
        tournamentId = tournamentObj._id;
      }
      const matchId = await MatchManager.createMatch(ctx, {
        tournamentId,
        typeId: tournamentType.typeId,
        uids: [player.uid]
      });
      return {
        tournamentId,
        matchId
      }
    }

    // await TournamentMatchingService.joinMatchingQueue(ctx, {
    //   tournament,
    //   tournamentType,
    //   player
    // });

    return;
  },


  /**
   * 结算锦标赛
   */
  async settle(ctx, tournamentId) {
    const now = TimeZoneUtils.getTimeZoneMidnightISO();


    // 完成锦标赛
    await completeTournament(ctx, tournamentId, now);

  }
};