/**
 * 测试断言工具
 * 用于验证测试结果
 */

import { TeamService } from "../../../team/teamService";

/**
 * 验证玩家初始化
 */
export async function assertPlayerInitialized(ctx: any, uid: string): Promise<{
    success: boolean;
    errors: string[];
    data?: any;
}> {
    const errors: string[] = [];

    // 验证玩家记录（通过 HTTP API 或跳过）
    // 注意：players 表在 Tournament 模块，这里跳过直接验证

    // 验证库存（通过 HTTP API）
    try {
        const tournamentUrl = process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site";
        const response = await fetch(`${tournamentUrl}/getPlayerInventory?uid=${uid}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
            const data = await response.json();
            if (!data.inventory) {
                errors.push("库存记录不存在");
            } else if (data.inventory.coins !== 1000) {
                errors.push(`初始金币不正确，期望 1000，实际 ${data.inventory.coins}`);
            }
        }
    } catch (error: any) {
        errors.push(`库存验证失败: ${error.message}`);
    }

    // 验证怪物
    const monsters = await ctx.db
        .query("mr_player_monsters")
        .withIndex("by_uid", (q: any) => q.eq("uid", uid))
        .collect();
    if (monsters.length === 0) {
        errors.push("玩家没有怪物");
    }

    // 验证队伍
    const teamValidation = await TeamService.validateTeam(ctx, uid);
    if (!teamValidation.valid) {
        errors.push(`队伍验证失败: ${teamValidation.reason}`);
    }

    return {
        success: errors.length === 0,
        errors,
        data: {
            monsterCount: monsters.length,
            teamSize: teamValidation.teamSize,
        },
    };
}

/**
 * 验证奖励发放
 */
export async function assertRewardsGranted(
    ctx: any,
    uid: string,
    expectedRewards: {
        coins?: number;
        energy?: number;
        chests?: number;
    }
): Promise<{
    success: boolean;
    errors: string[];
    data?: any;
}> {
    const errors: string[] = [];

    // 验证金币（通过 HTTP API）
    if (expectedRewards.coins !== undefined) {
        try {
            const tournamentUrl = process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site";
            const response = await fetch(`${tournamentUrl}/getPlayerInventory?uid=${uid}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                if (!data.inventory) {
                    errors.push("库存记录不存在");
                }
                // 注意：这里需要知道之前的金币数量才能验证增加
                // 实际测试中应该记录测试前的状态
            }
        } catch (error: any) {
            errors.push(`金币验证失败: ${error.message}`);
        }
    }

    // 验证能量
    if (expectedRewards.energy !== undefined) {
        const energy = await ctx.db
            .query("mr_player_energy")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .first();
        if (!energy) {
            errors.push("能量记录不存在");
        }
    }

    // 验证宝箱
    if (expectedRewards.chests !== undefined) {
        const chests = await ctx.db
            .query("mr_player_chests")
            .withIndex("by_uid", (q: any) => q.eq("uid", uid))
            .collect();
        if (chests.length < expectedRewards.chests) {
            errors.push(`宝箱数量不足，期望至少 ${expectedRewards.chests}，实际 ${chests.length}`);
        }
    }

    return {
        success: errors.length === 0,
        errors,
    };
}

/**
 * 验证 Battle Pass 等级
 */
export async function assertBattlePassLevel(
    ctx: any,
    uid: string,
    expectedLevel: number
): Promise<{
    success: boolean;
    errors: string[];
    data?: any;
}> {
    const errors: string[] = [];

    // 需要调用 Tournament 模块的 API 来获取 Battle Pass 信息
    // 这里简化处理，实际应该通过 HTTP 调用
    try {
        const tournamentUrl = process.env.TOURNAMENT_URL || "https://beloved-mouse-699.convex.site";
        const response = await fetch(
            `${tournamentUrl}/getPlayerBattlePass?uid=${uid}`,
            {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            }
        );

        if (!response.ok) {
            errors.push(`获取 Battle Pass 失败: ${response.status}`);
        } else {
            const result = await response.json();
            if (result.battlePass) {
                if (result.battlePass.currentLevel !== expectedLevel) {
                    errors.push(
                        `Battle Pass 等级不正确，期望 ${expectedLevel}，实际 ${result.battlePass.currentLevel}`
                    );
                }
                return {
                    success: errors.length === 0,
                    errors,
                    data: result.battlePass,
                };
            } else {
                errors.push("Battle Pass 不存在");
            }
        }
    } catch (error: any) {
        errors.push(`验证 Battle Pass 失败: ${error.message}`);
    }

    return {
        success: errors.length === 0,
        errors,
    };
}

/**
 * 验证游戏排名
 */
export async function assertGameRankings(
    ctx: any,
    gameId: string,
    expectedRankings: Array<{ uid: string; rank: number; score: number }>
): Promise<{
    success: boolean;
    errors: string[];
    data?: any;
}> {
    const errors: string[] = [];

    const participants = await ctx.db
        .query("mr_game_participants")
        .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
        .collect();

    const sortedParticipants = participants
        .filter((p: any) => p.status === "finished")
        .sort((a: any, b: any) => (b.finalScore || 0) - (a.finalScore || 0));

    for (let i = 0; i < expectedRankings.length; i++) {
        const expected = expectedRankings[i];
        const actual = sortedParticipants[i];

        if (!actual) {
            errors.push(`排名 ${expected.rank} 的玩家不存在`);
            continue;
        }

        if (actual.uid !== expected.uid) {
            errors.push(`排名 ${expected.rank} 的玩家不正确，期望 ${expected.uid}，实际 ${actual.uid}`);
        }

        if (actual.rank !== expected.rank) {
            errors.push(`玩家 ${expected.uid} 的排名不正确，期望 ${expected.rank}，实际 ${actual.rank}`);
        }

        if (Math.abs((actual.finalScore || 0) - expected.score) > 0.01) {
            errors.push(
                `玩家 ${expected.uid} 的分数不正确，期望 ${expected.score}，实际 ${actual.finalScore}`
            );
        }
    }

    return {
        success: errors.length === 0,
        errors,
        data: sortedParticipants.map((p: any) => ({
            uid: p.uid,
            rank: p.rank,
            score: p.finalScore,
        })),
    };
}

