/**
 * 回合管理服务
 * 负责回合的创建、结束和管理
 */

import { GameModel, CombatTurn, CombatEvent } from "./gameService";
import { GameMonster, GameBoss } from "../../../types/monsterTypes";

export class RoundService {
    private dbCtx: any;

    constructor(dbCtx: any) {
        this.dbCtx = dbCtx;
    }

    /**
     * 创建新回合
     * 根据所有存活角色按速度排序创建回合记录
     */
    async createRound(
        gameId: string,
        roundNumber: number,
        game: GameModel
    ): Promise<boolean> {
        // 收集所有角色（玩家队伍 + Boss + 小怪）
        const allCharacters: Array<{
            uid: string;
            monsterId: string;
            speed: number;
            team: 'player' | 'boss';
        }> = [];

        // 1. 添加玩家队伍角色（过滤已死亡的）
        game.team.forEach((monster) => {
            const currentHp = monster.stats?.hp?.current ?? 0;
            if (currentHp > 0) {
                allCharacters.push({
                    uid: monster.uid,
                    monsterId: monster.monsterId,
                    speed: monster.stats.speed,
                    team: 'player',
                });
            }
        });

        // 2. 添加Boss本体（过滤已死亡的）
        const bossHp = game.boss.stats?.hp?.current ?? 0;
        if (bossHp > 0) {
            allCharacters.push({
                uid: 'boss',
                monsterId: game.boss.monsterId,
                speed: game.boss.stats.speed,
                team: 'boss',
            });
        }

        // 3. 添加小怪（过滤已死亡的）
        game.boss.minions.forEach((minion) => {
            const minionHp = minion.stats?.hp?.current ?? 0;
            if (minionHp > 0) {
                allCharacters.push({
                    uid: 'boss',
                    monsterId: minion.monsterId,
                    speed: minion.stats.speed,
                    team: 'boss',
                });
            }
        });

        // 4. 按速度排序，速度相同时玩家优先
        allCharacters.sort((a, b) => {
            // 先按速度降序排序
            if (a.speed !== b.speed) {
                return b.speed - a.speed;
            }
            // 速度相同时，玩家优先（PVE中玩家应该有一定优势）
            if (a.team === 'player' && b.team === 'boss') {
                return -1; // a（玩家）排在前面
            }
            if (a.team === 'boss' && b.team === 'player') {
                return 1; // b（玩家）排在前面
            }
            // 同队内速度相同时，按monsterId排序（保证排序稳定性）
            return a.monsterId.localeCompare(b.monsterId);
        });

        // 5. 转换为 CombatTurn 数组
        const turns: CombatTurn[] = allCharacters.map((char) => ({
            uid: char.uid,
            monsterId: char.monsterId,
            status: 0, // 0: pending
        }));

        // 6. 创建回合记录
        const roundObj = {
            gameId,
            no: roundNumber,
            status: 0,
            turns,
        };

        await this.dbCtx.db.insert("tacticalMonster_game_round", roundObj);
        return true;
    }

    /**
     * 结束回合
     * 标记当前回合为已完成
     */
    async endRound(gameId: string, roundNumber: number): Promise<boolean> {
        const roundDoc = await this.dbCtx.db
            .query("tacticalMonster_game_round")
            .withIndex("by_game_round", (q: any) =>
                q.eq("gameId", gameId).eq("no", roundNumber)
            )
            .unique();

        if (roundDoc) {
            await this.dbCtx.db.patch(roundDoc._id, {
                status: 2,
                endTime: Date.now(),
            });
            return true;
        }

        return false;
    }

    /**
     * 获取当前回合
     */
    async getCurrentRound(gameId: string, roundNumber: number): Promise<{
        roundDoc: any;
        currentTurn: CombatTurn | null;
    } | null> {
        const roundDoc = await this.dbCtx.db
            .query("tacticalMonster_game_round")
            .withIndex("by_game_round", (q: any) =>
                q.eq("gameId", gameId).eq("no", roundNumber)
            )
            .unique();

        if (!roundDoc) {
            return null;
        }

        const currentTurn = roundDoc.turns?.find(
            (turn: CombatTurn) => turn.status === 1 || turn.status === 2
        ) || null;

        return {
            roundDoc,
            currentTurn,
        };
    }
}

