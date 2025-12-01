/**
 * 游戏结束逻辑（共享代码）
 * 可以被 endGame mutation 和 gameTimeoutService 调用
 */
export async function endGameLogic(ctx: any, gameId: string) {
    const { TournamentProxyService } = await import("../tournament/tournamentProxyService");
    const { ChestService } = await import("../chest/chestService");
    const { ResourceProxyService } = await import("../resource/resourceProxyService");

    // 1. 获取游戏信息
    const game = await ctx.db
        .query("tacticalMonster_game")
        .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
        .first();

    if (!game) {
        throw new Error("游戏不存在");
    }

    if (game.status === "ended") {
        // 游戏已经结束，避免重复处理
        return { ok: true, alreadyEnded: true };
    }

    // 2. 更新游戏状态为 "settling"
    await ctx.db.patch(game._id, {
        status: "settling",
    });

    // 3. 获取所有玩家（包括未完成的）
    const allParticipants = await ctx.db
        .query("mr_game_participants")
        .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
        .collect();

    // 4. 处理未完成的玩家（超时或掉线）
    for (const participant of allParticipants) {
        if (participant.status === "playing") {
            // 未完成玩家，使用当前分数（如果有）或 0
            await ctx.db.patch(participant._id, {
                status: "finished",
                finalScore: participant.finalScore || 0,
                finishedAt: new Date().toISOString(),
            });
        }
    }

    // 5. 重新获取所有已完成玩家，按分数排序
    const allParticipantsAfterUpdate = await ctx.db
        .query("mr_game_participants")
        .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
        .collect();

    const finishedParticipants = allParticipantsAfterUpdate.filter((p: any) => p.status === "finished");

    // 按分数降序排序
    const sorted = finishedParticipants.sort((a: any, b: any) =>
        (b.finalScore || 0) - (a.finalScore || 0)
    );

    // 6. 分配最终排名
    const finalRankings: Array<{ uid: string; rank: number; score: number }> = [];
    for (let i = 0; i < sorted.length; i++) {
        const rank = i + 1;
        const participant = sorted[i];

        // 更新玩家排名
        await ctx.db.patch(participant._id, {
            rank: rank,
        });

        finalRankings.push({
            uid: participant.uid,
            rank: rank,
            score: participant.finalScore || 0,
        });
    }

    // 7. 调用 Tournament 模块分配奖励
    const rewardDecision = await TournamentProxyService.processGameRewards({
        tier: game.tier,
        rankings: finalRankings,
        gameId: gameId,
    });

    if (!rewardDecision.ok) {
        throw new Error(rewardDecision.error || "处理奖励失败");
    }

    // 8. 发放金币奖励（使用统一奖励服务）
    const { TournamentProxyService } = await import("../tournament/tournamentProxyService");
    for (const [uid, coins] of Object.entries(rewardDecision.coinRewards || {})) {
        if (coins > 0) {
            // 通过 Tournament 模块的统一奖励服务发放
            await TournamentProxyService.grantRewards({
                uid,
                rewards: {
                    coins: coins as number,
                },
                source: "tier_reward",
                sourceId: gameId,
            });
        }
    }

    // 9. 处理宝箱生成
    const chestResults = await ChestService.processChestRewards(ctx, {
        gameId: gameId,
        tier: game.tier,
        players: finalRankings,
        chestTriggered: rewardDecision.chestTriggered || {},
    });

    // 10. 为每个玩家添加 Battle Pass 积分和处理任务事件
    const { BattlePassIntegration } = await import("../battlePass/battlePassIntegration");
    const { calculateMonsterRumblePoints } = await import("../battlePass/battlePassPoints");
    const { TaskIntegration } = await import("../task/taskIntegration");

    for (const ranking of finalRankings) {
        const points = calculateMonsterRumblePoints(
            ranking.rank,
            ranking.score,
            game.tier || "bronze"
        );

        // 异步添加积分，不阻塞游戏结束流程
        BattlePassIntegration.addGameSeasonPoints(ctx, {
            uid: ranking.uid,
            amount: points,
            source: "tacticalMonster:monster_rumble",
            sourceDetails: {
                gameId: gameId,
                tier: game.tier,
                rank: ranking.rank,
                score: ranking.score,
                totalPlayers: finalRankings.length,
            },
        }).catch((error) => {
            console.error(`为玩家 ${ranking.uid} 添加 Battle Pass 积分失败:`, error);
        });

        // 处理任务事件（游戏完成）
        const isWin = ranking.rank === 1; // 排名第1视为胜利
        TaskIntegration.onGameComplete({
            uid: ranking.uid,
            gameType: "tacticalMonster",
            isWin: isWin,
            matchId: gameId,
            tournamentId: game.tournamentId,
            score: ranking.score,
        }).catch((error) => {
            console.error(`为玩家 ${ranking.uid} 处理任务事件失败:`, error);
        });
    }

    // 10. 更新所有玩家状态为 "rewarded"
    for (const participant of finishedParticipants) {
        await ctx.db.patch(participant._id, {
            status: "rewarded",
            rewardedAt: new Date().toISOString(),
        });
    }

    // 11. 更新游戏状态为 "ended"
    await ctx.db.patch(game._id, {
        status: "ended",
        endedAt: new Date().toISOString(),
    });

    return {
        ok: true,
        finalRankings: finalRankings,
        rewards: {
            coins: rewardDecision.coinRewards,
            chests: chestResults,
        },
    };
}

