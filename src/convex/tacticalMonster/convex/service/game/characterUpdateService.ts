/**
 * 角色状态更新服务
 * 负责更新角色在数据库中的状态（HP、MP、技能冷却等）
 */

import { GameModel } from "./gameService";
import { GameMonster, GameBoss, GameMinion } from "../../../types/monsterTypes";

export class CharacterUpdateService {
    private dbCtx: any;

    constructor(dbCtx: any) {
        this.dbCtx = dbCtx;
    }

    /**
     * 更新数据库中的角色状态
     */
    async updateCharacterInDatabase(
        gameId: string,
        character: GameMonster,
        game: GameModel
    ): Promise<boolean> {
        const gameDoc = await this.dbCtx.db
            .query("mr_games")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
            .first();

        if (!gameDoc) return false;

        if (character.uid === "boss") {
            // Boss主体：使用 bossId 定位
            const characterBossId = (character as GameBoss).bossId;
            if (characterBossId && characterBossId === game.boss.bossId) {
                // 更新 Boss
                await this.dbCtx.db.patch(gameDoc._id, {
                    "boss.stats": character.stats,
                    "boss.q": character.q,
                    "boss.r": character.r,
                    "boss.skillCooldowns": character.skillCooldowns || {},
                    "boss.statusEffects": character.statusEffects || [],
                    lastUpdate: new Date().toISOString(),
                });
                return true;
            } else {
                // 小怪：使用 minionId 定位（小怪的monsterId可能重复）
                const characterMinionId = (character as GameMinion).minionId;
                if (!characterMinionId) {
                    return false;  // 如果没有minionId，无法定位小怪
                }
                const minionIndex = game.boss.minions.findIndex((m) => m.minionId === characterMinionId);
                if (minionIndex >= 0) {
                    const updatedMinions = [...(gameDoc.boss.minions || [])];
                    updatedMinions[minionIndex] = {
                        ...updatedMinions[minionIndex],
                        q: character.q,
                        r: character.r,
                        stats: character.stats,
                        statusEffects: character.statusEffects || [],
                        skillCooldowns: character.skillCooldowns || {},
                    };

                    await this.dbCtx.db.patch(gameDoc._id, {
                        "boss.minions": updatedMinions,
                        lastUpdate: new Date().toISOString(),
                    });
                    return true;
                }
            }
        } else {
            // 更新玩家角色
            const teamIndex = (gameDoc.team || []).findIndex(
                (m: any) => m.uid === character.uid && m.monsterId === character.monsterId
            );
            if (teamIndex >= 0) {
                const updatedTeam = [...(gameDoc.team || [])];
                updatedTeam[teamIndex] = {
                    ...updatedTeam[teamIndex],
                    stats: character.stats,
                    skillCooldowns: character.skillCooldowns || {},
                    statusEffects: character.statusEffects || [],
                    status: character.status || "normal",
                };

                await this.dbCtx.db.patch(gameDoc._id, {
                    team: updatedTeam,
                    lastUpdate: new Date().toISOString(),
                });
                return true;
            }
        }

        return false;
    }
}

