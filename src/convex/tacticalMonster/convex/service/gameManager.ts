import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";

interface GameModel {
    gameId: string;
    playerUid: string;  // 玩家 UID（替代 challenger）
    map: any;
    round: number;
    status: number;  // 0: playing, 1: won, 2: lost, 3: game over
    score: number;   // 游戏分数
    lastUpdate: number;
    seed?: string;
    characters?: any[];
    currentRound?: any;
}

interface GameReport {
    gameId: string;
    baseScore: number;
    timeBonus?: number;
    completeBonus?: number;
    totalScore: number;
}

interface CombatTurn {
    uid: string;
    character_id: string;
    skills?: string[];
    skillSelect?: string;
    status: number;
    startTime?: number;
    endTime?: number;
}

interface CombatEvent {
    uid?: string;
    gameId: string;
    name: string;
    type?: number;
    data?: any;
    isSynced: boolean;
    time: number;
}

export class TacticalMonsterGameManager {
    private dbCtx: any;
    private game: GameModel | null;

    constructor(dbCtx: any) {
        this.dbCtx = dbCtx;
        this.game = null;
    }

    async load(gameId: string): Promise<GameModel | null> {
        const game = await this.dbCtx.db
            .query("tacticalMonster_game")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
            .unique();

        if (!game) return null;

        const characters = await this.dbCtx.db
            .query("tacticalMonster_game_character")
            .withIndex("by_game", (q: any) => q.eq("gameId", gameId))
            .collect();

        const currentRound = await this.dbCtx.db
            .query("tacticalMonster_game_round")
            .withIndex("by_game_round", (q: any) => q.eq("gameId", gameId).eq("no", game.round))
            .unique();

        const map = await this.dbCtx.db
            .query("tacticalMonster_map_data")
            .withIndex("by_map_id", (q: any) => q.eq("map_id", game.map))
            .unique();

        this.game = {
            ...game,
            _creationTime: undefined,
            characters: characters.map((c: any) => ({ ...c, _creationTime: undefined })),
            currentRound: currentRound ? { ...currentRound, _creationTime: undefined } : undefined,
            map: map ? { ...map, _creationTime: undefined } : undefined,
        } as any;

        return this.game;
    }

    async save(data: {
        characters?: any[];
        round?: number;
        status?: number;
        score?: number;
        lastUpdate?: number;
    }): Promise<void> {
        if (!this.game) return;

        if (data.characters) {
            for (const char of data.characters) {
                await this.dbCtx.db
                    .query("tacticalMonster_game_character")
                    .withIndex("by_game_character", (q: any) =>
                        q.eq("gameId", this.game!.gameId)
                            .eq("uid", char.uid)
                            .eq("character_id", char.character_id)
                    )
                    .unique()
                    .then((existing: any) => {
                        if (existing) {
                            return this.dbCtx.db.patch(existing._id, char);
                        } else {
                            return this.dbCtx.db.insert("tacticalMonster_game_character", {
                                ...char,
                                gameId: this.game!.gameId,
                            });
                        }
                    });
            }
        }

        const updateData: any = {};
        if (data.status !== undefined) updateData.status = data.status;
        if (data.round !== undefined) updateData.round = data.round;
        if (data.score !== undefined) updateData.score = data.score;
        if (data.lastUpdate !== undefined) updateData.lastUpdate = data.lastUpdate;

        if (Object.keys(updateData).length > 0) {
            const gameDoc = await this.dbCtx.db
                .query("tacticalMonster_game")
                .withIndex("by_gameId", (q: any) => q.eq("gameId", this.game!.gameId))
                .unique();

            if (gameDoc) {
                await this.dbCtx.db.patch(gameDoc._id, updateData);
                this.game = { ...this.game, ...updateData };
            }
        }
    }

    async createGame(
        mapId: string,
        playerUid: string,
        gameId: string,
        seed?: string
    ): Promise<GameModel | null> {
        const map = await this.dbCtx.db
            .query("tacticalMonster_map_data")
            .withIndex("by_map_id", (q: any) => q.eq("map_id", mapId))
            .unique();

        if (!map) return null;

        const gameObj: any = {
            gameId,
            playerUid,
            map: mapId,
            round: 0,
            status: 0,
            score: 0,
            lastUpdate: Date.now(),
        };

        if (seed) {
            gameObj.seed = seed;
        }

        const gid = await this.dbCtx.db.insert("tacticalMonster_game", gameObj);

        if (gid) {
            this.game = { ...gameObj, _id: gid, _creationTime: undefined } as any;
            return this.game;
        }

        return null;
    }

    async walk(
        gameId: string,
        uid: string,
        characterId: string,
        to: { q: number; r: number }
    ): Promise<boolean> {
        await this.load(gameId);
        if (!this.game) return false;

        const character = this.game.characters?.find(
            (c: any) => c.character_id === characterId && c.uid === uid
        );

        if (!character) return false;

        // Update character position
        const charDoc = await this.dbCtx.db
            .query("tacticalMonster_game_character")
            .withIndex("by_game_character", (q: any) =>
                q.eq("gameId", gameId).eq("uid", uid).eq("character_id", characterId)
            )
            .unique();

        if (charDoc) {
            await this.dbCtx.db.patch(charDoc._id, { q: to.q, r: to.r });
        }

        // Create event
        const event: CombatEvent = {
            gameId,
            uid,
            name: "walk",
            type: 1,
            data: { uid, character_id: characterId, to },
            isSynced: false,
            time: Date.now(),
        };

        await this.dbCtx.db.insert("tacticalMonster_event", event);
        await this.save({ lastUpdate: Date.now() });

        return true;
    }

    async attack(
        gameId: string,
        data: {
            attacker: { uid: string; character_id: string; skillSelect: string };
            target: { uid: string; character_id: string };
        }
    ): Promise<CombatEvent | null> {
        await this.load(gameId);
        if (!this.game) return null;

        const { attacker, target } = data;

        const attackerCharacter = this.game.characters?.find(
            (c: any) => c.uid === attacker.uid && c.character_id === attacker.character_id
        );
        const targetCharacter = this.game.characters?.find(
            (c: any) => c.uid === target.uid && c.character_id === target.character_id
        );

        if (!attackerCharacter || !targetCharacter) return null;

        const event: CombatEvent = {
            gameId,
            uid: attacker.uid,
            name: "attack",
            type: 2,
            data,
            isSynced: false,
            time: Date.now(),
        };

        await this.dbCtx.db.insert("tacticalMonster_event", event);
        await this.save({ lastUpdate: Date.now() });

        return event;
    }

    async selectSkill(gameId: string, data: { skillId: string }): Promise<boolean> {
        await this.load(gameId);
        if (!this.game?.currentRound) return false;

        const { skillId } = data;
        const currentTurn = this.game.currentRound.turns?.find(
            (turn: CombatTurn) => turn.status === 1 || turn.status === 2
        );

        if (!currentTurn) return false;

        currentTurn.skillSelect = skillId;

        const roundDoc = await this.dbCtx.db
            .query("tacticalMonster_game_round")
            .withIndex("by_game_round", (q: any) =>
                q.eq("gameId", gameId).eq("no", this.game.round)
            )
            .unique();

        if (roundDoc) {
            await this.dbCtx.db.patch(roundDoc._id, {
                turns: this.game.currentRound.turns,
            });
        }

        await this.save({ lastUpdate: Date.now() });

        return true;
    }

    async startNewRound(gameId: string): Promise<boolean> {
        await this.load(gameId);
        if (!this.game) return false;

        const newRoundNo = this.game.round + 1;

        // Create new round
        const roundObj = {
            gameId,
            no: newRoundNo,
            status: 0,
            turns: [] as CombatTurn[],
        };

        await this.dbCtx.db.insert("tacticalMonster_game_round", roundObj);

        const event: CombatEvent = {
            gameId,
            name: "new_round",
            type: 0,
            data: { round: newRoundNo },
            isSynced: false,
            time: Date.now(),
        };

        await this.dbCtx.db.insert("tacticalMonster_event", event);
        await this.save({ round: newRoundNo, lastUpdate: Date.now() });

        return true;
    }

    async endRound(gameId: string): Promise<boolean> {
        await this.load(gameId);
        if (!this.game) return false;

        const roundDoc = await this.dbCtx.db
            .query("tacticalMonster_game_round")
            .withIndex("by_game_round", (q: any) =>
                q.eq("gameId", gameId).eq("no", this.game.round)
            )
            .unique();

        if (roundDoc) {
            await this.dbCtx.db.patch(roundDoc._id, {
                status: 2,
                endTime: Date.now(),
            });
        }

        const event: CombatEvent = {
            gameId,
            name: "end_round",
            type: 0,
            data: { round: this.game.round },
            isSynced: false,
            time: Date.now(),
        };

        await this.dbCtx.db.insert("tacticalMonster_event", event);
        await this.save({ lastUpdate: Date.now() });

        return true;
    }

    calculateScore(action: any, actionType: string): number {
        // 基础计分逻辑
        let score = 0;
        
        if (actionType === "attack" && action.data?.killed) {
            score += 100; // 击败敌人得分
        } else if (actionType === "attack") {
            score += 10; // 攻击得分
        } else if (actionType === "skill") {
            score += 20; // 使用技能得分
        }

        return score;
    }

    async updateScore(gameId: string, scoreDelta: number): Promise<boolean> {
        await this.load(gameId);
        if (!this.game) return false;

        const newScore = (this.game.score || 0) + scoreDelta;
        await this.save({ score: newScore, lastUpdate: Date.now() });

        return true;
    }

    async gameOver(gameId: string): Promise<GameReport | null> {
        await this.load(gameId);
        if (!this.game) return null;

        const baseScore = this.game.score || 0;
        const startTime = this.game.lastUpdate || Date.now();
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // 时间奖励：越快完成奖励越高（简化计算）
        const timeBonus = Math.max(0, Math.floor((1000 - duration / 1000) / 10));
        
        // 完成奖励：根据状态判断
        const completeBonus = this.game.status === 1 ? 500 : 0; // 胜利奖励

        const totalScore = baseScore + timeBonus + completeBonus;

        await this.save({ status: 3, lastUpdate: Date.now() });

        const event: CombatEvent = {
            gameId,
            name: "game_end",
            type: 0,
            data: { gameId },
            isSynced: false,
            time: Date.now(),
        };

        await this.dbCtx.db.insert("tacticalMonster_event", event);

        return {
            gameId,
            baseScore,
            timeBonus,
            completeBonus,
            totalScore,
        };
    }
}

// Convex 函数接口
export const createGame = internalMutation({
    args: {
        mapId: v.string(),
        playerUid: v.string(),
        gameId: v.string(),
        seed: v.optional(v.string()),
    },
    handler: async (ctx, { mapId, playerUid, gameId, seed }) => {
        console.log("createGame...", mapId, gameId, seed);
        const gameManager = new TacticalMonsterGameManager(ctx);
        const game = await gameManager.createGame(mapId, playerUid, gameId, seed);
        if (game) {
            return { ok: true, data: game };
        }
        return { ok: false };
    },
});

export const loadGame = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        console.log("loading game", gameId);
        const gameManager = new TacticalMonsterGameManager(ctx);
        try {
            const game = await gameManager.load(gameId);
            return { ok: true, data: game };
        } catch (error) {
            console.error("loadGame error", error);
            return { ok: false };
        }
    },
});

export const findGame = internalQuery({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        console.log("finding game", gameId);
        const gameManager = new TacticalMonsterGameManager(ctx);
        const game = await gameManager.load(gameId);
        return game;
    },
});

export const findReport = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new TacticalMonsterGameManager(ctx);
        await gameManager.load(gameId);
        
        if (!gameManager.game) {
            return { ok: false };
        }

        const baseScore = gameManager.game.score || 0;
        const timeBonus = 0; // 可以计算时间奖励
        const completeBonus = gameManager.game.status === 1 ? 500 : 0;
        const totalScore = baseScore + timeBonus + completeBonus;

        return {
            ok: true,
            data: {
                gameId,
                baseScore,
                timeBonus,
                completeBonus,
                totalScore,
            },
        };
    },
});

export const updateScore = mutation({
    args: {
        gameId: v.string(),
        scoreDelta: v.number(),
    },
    handler: async (ctx, { gameId, scoreDelta }) => {
        const gameManager = new TacticalMonsterGameManager(ctx);
        const result = await gameManager.updateScore(gameId, scoreDelta);
        return { ok: result };
    },
});

export const getGame = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new TacticalMonsterGameManager(ctx);
        return await gameManager.load(gameId);
    },
});

export const getGameStatus = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new TacticalMonsterGameManager(ctx);
        const game = await gameManager.load(gameId);
        return { status: game?.status ?? -1 };
    },
});

export const gameOver = mutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new TacticalMonsterGameManager(ctx);
        const report = await gameManager.gameOver(gameId);
        if (report) {
            return { ok: true, data: report };
        }
        return { ok: false };
    },
});

export const walk = mutation({
    args: {
        gameId: v.string(),
        uid: v.string(),
        characterId: v.string(),
        to: v.object({ q: v.number(), r: v.number() }),
    },
    handler: async (ctx, { gameId, uid, characterId, to }) => {
        console.log("walk", gameId, uid, characterId, to);
        const gameManager = new TacticalMonsterGameManager(ctx);
        await gameManager.load(gameId);
        const result = await gameManager.walk(gameId, uid, characterId, to);
        console.log("walk result", result);
        return { ok: result };
    },
});

export const attack = mutation({
    args: {
        gameId: v.string(),
        data: v.object({
            attacker: v.object({
                uid: v.string(),
                character_id: v.string(),
                skillSelect: v.string(),
            }),
            target: v.object({
                uid: v.string(),
                character_id: v.string(),
            }),
        }),
    },
    handler: async (ctx, { gameId, data }) => {
        console.log("attack", gameId, data);
        const gameManager = new TacticalMonsterGameManager(ctx);
        await gameManager.load(gameId);
        const result = await gameManager.attack(gameId, data);
        return { ok: result !== null, data: result };
    },
});

export const selectSkill = mutation({
    args: {
        gameId: v.string(),
        data: v.object({ skillId: v.string() }),
    },
    handler: async (ctx, { gameId, data }) => {
        console.log("selectSkill", gameId, data);
        const gameManager = new TacticalMonsterGameManager(ctx);
        await gameManager.load(gameId);
        const result = await gameManager.selectSkill(gameId, data);
        return { ok: result };
    },
});

export const startNewRound = mutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new TacticalMonsterGameManager(ctx);
        await gameManager.load(gameId);
        return await gameManager.startNewRound(gameId);
    },
});

export const endRound = mutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new TacticalMonsterGameManager(ctx);
        await gameManager.load(gameId);
        return await gameManager.endRound(gameId);
    },
});

export const findEvents = query({
    args: { gameId: v.string(), lastTime: v.optional(v.number()) },
    handler: async (ctx, { gameId, lastTime }) => {
        let query = ctx.db
            .query("tacticalMonster_event")
            .withIndex("by_game", (q: any) => q.eq("gameId", gameId))
            .filter((q: any) => q.eq(q.field("isSynced"), false));

        if (lastTime) {
            query = query.filter((q: any) => q.gt(q.field("time"), lastTime));
        }

        const events = await query.collect();
        return events.map((e: any) => ({ ...e, _creationTime: undefined }));
    },
});

export default TacticalMonsterGameManager;


