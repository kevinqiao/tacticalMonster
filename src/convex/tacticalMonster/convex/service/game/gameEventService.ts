/**
 * 游戏事件服务
 * 负责创建和插入游戏事件
 */

import { CombatEvent } from "./gameService";

export class GameEventService {
    private dbCtx: any;

    constructor(dbCtx: any) {
        this.dbCtx = dbCtx;
    }

    /**
     * 创建并插入事件
     */
    async createEvent(event: CombatEvent): Promise<void> {
        await this.dbCtx.db.insert("mr_game_event", event);
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

