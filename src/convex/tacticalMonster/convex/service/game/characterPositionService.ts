/**
 * 角色位置服务
 * 负责更新角色在数据库中的位置
 */

import { CharacterIdentifier, GameModel } from "../../types/gameTypes";



export class CharacterPositionService {
    private dbCtx: any;

    constructor(dbCtx: any) {
        this.dbCtx = dbCtx;
    }

    /**
     * 更新角色位置
     */
    async updatePosition(
        gameId: string,
        identifier: CharacterIdentifier,
        position: { q: number; r: number },
        game: GameModel
    ): Promise<boolean> {
        const { monsterId, bossId, minionId } = identifier;

        const gameDoc = await this.dbCtx.db
            .query("mr_games")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
            .first();

        if (!gameDoc) return false;

        if (bossId) {
            // Boss主体：更新Boss位置（Convex patch 不支持点号，需替换整个 boss 对象）
            const existingBoss = gameDoc.boss || game.boss;
            await this.dbCtx.db.patch(gameDoc._id, {
                boss: {
                    ...existingBoss,
                    position: { q: position.q, r: position.r },
                },
                lastUpdate: new Date().toISOString(),
            });
            return true;
        } else if (minionId) {
            // 小怪：使用 minionId 定位并更新位置（使用 position 对象符合 schema）
            const minionIndex = game.boss.minions.findIndex((m) => m.minionId === minionId);
            if (minionIndex >= 0) {
                const updatedMinions = [...(gameDoc.boss.minions || [])];
                const existingMinion = updatedMinions[minionIndex];
                updatedMinions[minionIndex] = {
                    ...existingMinion,
                    position: {  // 使用 position 对象（符合 schema）
                        q: position.q,
                        r: position.r,
                    },
                };
                const existingBoss = gameDoc.boss || game.boss;
                await this.dbCtx.db.patch(gameDoc._id, {
                    boss: {
                        ...existingBoss,
                        minions: updatedMinions,
                    },
                    lastUpdate: new Date().toISOString(),
                });
                return true;
            }
            return false;
        } else if (monsterId) {
            // 玩家角色：从 gameDoc.team 中按 monsterId 查找并更新位置
            const teamIndex = gameDoc.team.findIndex((m: any) => (m.character_id ?? m.monsterId) === monsterId);
            if (teamIndex < 0) return false;

            const updatedTeam = [...gameDoc.team];
            const member = updatedTeam[teamIndex];
            updatedTeam[teamIndex] = { ...member, q: position.q, r: position.r };

            await this.dbCtx.db.patch(gameDoc._id, {
                team: updatedTeam,
                lastUpdate: new Date().toISOString(),
            });
            return true;
        }

        return false;
    }
}

