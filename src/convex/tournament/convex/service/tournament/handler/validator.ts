export const validateLimits = async (ctx: any, params: {
    player: any;
    tournamentType: any;
    tournament: any;
}) => {
    const { player, tournamentType, tournament } = params;
    if (tournament) {
        const player_tournament = await ctx.db.query("player_tournaments").withIndex("by_uid_tournament", (q: any) => q.eq("uid", player.uid).eq("tournamentId", tournament._id)).unique();
        if (player_tournament) {
            return;
        }
    }
}
export const validateEntryFee = async (ctx: any, params: {
    player: any;
    tournamentType: any;
    tournament: any;
}) => {
    const { player, tournamentType, tournament } = params;
}   