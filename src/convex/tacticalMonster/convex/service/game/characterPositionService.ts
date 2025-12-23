/**
 * 角色位置服务
 * 负责更新角色在数据库中的位置
 */

import { CharacterIdentifier, GameModel } from "./gameService";
import { GameMonster, GameBoss, GameMinion } from "../../../types/monsterTypes";

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
            // Boss主体：更新Boss位置
            await this.dbCtx.db.patch(gameDoc._id, {
                "boss.q": position.q,
                "boss.r": position.r,
                lastUpdate: new Date().toISOString(),
            });
            return true;
        } else if (minionId) {
            // 小怪：使用 minionId 定位并更新位置
            const minionIndex = game.boss.minions.findIndex((m) => m.minionId === minionId);
            if (minionIndex >= 0) {
                const updatedMinions = [...(gameDoc.boss.minions || [])];
                updatedMinions[minionIndex] = {
                    ...updatedMinions[minionIndex],
                    q: position.q,
                    r: position.r,
                };
                await this.dbCtx.db.patch(gameDoc._id, {
                    "boss.minions": updatedMinions,
                    lastUpdate: new Date().toISOString(),
                });
                return true;
            }
            return false;
        } else if (monsterId) {
            // 玩家角色从 tacticalMonster_game_character 查询
            const charDoc = await this.dbCtx.db
                .query("tacticalMonster_game_character")
                .withIndex("by_game", (q: any) => q.eq("gameId", gameId))
                .filter((q: any) =>
                    q.or(
                        q.eq(q.field("monsterId"), monsterId),
                        q.eq(q.field("character_id"), monsterId)  // 向后兼容
                    )
                )
                .first();

            if (!charDoc) return false;

            await this.dbCtx.db.patch(charDoc._id, { q: position.q, r: position.r });
            return true;
        }

        return false;
    }
}

