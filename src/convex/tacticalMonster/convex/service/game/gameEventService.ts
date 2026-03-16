/**
 * 游戏事件服务
 * 负责创建和插入游戏事件
 */

import { CombatEvent } from "../../types/gameTypes";

export class GameEventService {
    private dbCtx: any;

    constructor(dbCtx: any) {
        this.dbCtx = dbCtx;
    }

    /**
     * 计算 stepTime（相对时间位置）
     * 从游戏创建时间到现在的毫秒数
     */
    private async calculateStepTime(gameId: string, currentTime: number): Promise<number> {
        // 从数据库获取游戏创建时间
        const gameDoc = await this.dbCtx.db
            .query("mr_games")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
            .first();

        if (!gameDoc || !gameDoc.createdAt) {
            // 如果没有找到游戏或创建时间，使用当前时间（stepTime = 0）
            console.warn(`Game ${gameId} not found or missing createdAt, using stepTime = 0`);
            return 0;
        }

        const gameStartTime = new Date(gameDoc.createdAt).getTime();
        return currentTime - gameStartTime;
    }

    /**
     * 创建并插入事件
     * 自动计算 stepTime（如果事件中没有提供）
     */
    async createEvent(event: CombatEvent, gameStartTime?: number): Promise<void> {
        const currentTime = event.time || Date.now();

        // 如果事件中没有 stepTime，自动计算
        let stepTime = event.stepTime;
        if (stepTime === undefined) {
            if (gameStartTime !== undefined) {
                // 如果提供了 gameStartTime，直接计算
                stepTime = currentTime - gameStartTime;
            } else {
                // 否则从数据库查询
                stepTime = await this.calculateStepTime(event.gameId, currentTime);
            }
        }

        const eventWithStepTime: CombatEvent = {
            ...event,
            time: currentTime,
            stepTime,
        };

        await this.dbCtx.db.insert("mr_game_event", eventWithStepTime);
    }

    /**
     * 创建 walk 事件
     */
    createWalkEvent(
        gameId: string,
        identifier: any,
        to: { q: number; r: number }
    ): CombatEvent {
        return {
            gameId,
            name: "walk",
            type: 1,
            data: { identifier, to },
            time: Date.now(),
        };
    }

    /**
     * 创建 attack 事件
     */
    createAttackEvent(
        gameId: string,
        data: any
    ): CombatEvent {
        return {
            gameId,
            name: "attack",
            type: 2,
            data,
            time: Date.now(),
        };
    }

    /**
     * 创建 use_skill 事件
     */
    createUseSkillEvent(
        gameId: string,
        data: any
    ): CombatEvent {
        return {
            gameId,
            name: "use_skill",
            type: 3,
            data,
            time: Date.now(),
        };
    }

    /**
     * 创建 new_round 事件
     */
    createNewRoundEvent(gameId: string, round: number): CombatEvent {
        return {
            gameId,
            name: "new_round",
            type: 0,
            data: { round },
            time: Date.now(),
        };
    }

    /**
     * 创建 end_round 事件
     */
    createEndRoundEvent(gameId: string, round: number): CombatEvent {
        return {
            gameId,
            name: "end_round",
            type: 0,
            data: { round },
            time: Date.now(),
        };
    }

    /**
     * 创建 defend 事件
     */
    createDefendEvent(
        gameId: string,
        identifier: { monsterId?: string; bossId?: string; minionId?: string }
    ): CombatEvent {
        return {
            gameId,
            name: "defend",
            type: 4,
            data: { identifier },
            time: Date.now(),
        };
    }

    /**
     * 创建 game_end 事件
     */
    createGameEndEvent(gameId: string): CombatEvent {
        return {
            gameId,
            name: "game_end",
            type: 0,
            data: { gameId },
            time: Date.now(),
        };
    }
}

