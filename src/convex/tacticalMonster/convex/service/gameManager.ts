import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";

interface GameModel {
    gameId: string;
    challenger: string;
    challengee: string;
    players: Array<{ uid: string; name?: string; avatar?: string }>;
    map: any;
    round: number;
    status: number;
    lastUpdate: number;
    seed?: string;
    characters?: any[];
    currentRound?: any;
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
        players: Array<{ uid: string; name?: string; avatar?: string }>,
        gameId: string,
        seed?: string
    ): Promise<GameModel | null> {
        if (players.length < 2) return null;

        const map = await this.dbCtx.db
            .query("tacticalMonster_map_data")
            .withIndex("by_map_id", (q: any) => q.eq("map_id", mapId))
            .unique();

        if (!map) return null;

        const gameObj: any = {
            gameId,
            challenger: players[0].uid,
            challengee: players[1].uid,
            players: players.map((p) => ({ uid: p.uid, name: p.name, avatar: p.avatar })),
            map: mapId,
            round: 0,
            status: 0,
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

    async gameOver(gameId: string): Promise<boolean> {
        await this.load(gameId);
        if (!this.game) return false;

        await this.save({ status: 1, lastUpdate: Date.now() });

        const event: CombatEvent = {
            gameId,
            name: "game_end",
            type: 0,
            data: { gameId },
            isSynced: false,
            time: Date.now(),
        };

        await this.dbCtx.db.insert("tacticalMonster_event", event);

        return true;
    }
}

// Convex 函数接口
export const createGame = internalMutation({
    args: {
        mapId: v.string(),
        players: v.array(
            v.object({
                uid: v.string(),
                name: v.optional(v.string()),
                avatar: v.optional(v.string()),
            })
        ),
        gameId: v.string(),
        seed: v.optional(v.string()),
    },
    handler: async (ctx, { mapId, players, gameId, seed }) => {
        console.log("createGame...", mapId, gameId, seed);
        const gameManager = new TacticalMonsterGameManager(ctx);
        const game = await gameManager.createGame(mapId, players, gameId, seed);
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
        return {
            ok: true,
            data: {
                baseScore: 100,
                timeBonus: 0,
                completeBonus: 0,
                totalScore: 100,
            },
        };
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
        return await gameManager.gameOver(gameId);
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


