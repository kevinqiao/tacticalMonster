/**
 * 回合管理服务
 * 负责回合的创建、结束和管理
 */
import { GameModel, GameTurn, SummonedCharacter } from "../../types/gameTypes";
import { GameMonster } from "../../types/monsterTypes";


export class RoundService {
    private dbCtx: any;

    constructor(dbCtx: any) {
        this.dbCtx = dbCtx;
    }

    /** 获取回合文档，有重复时取 _creationTime 最新的 */
    async getRoundDoc(gameId: string, roundNumber: number): Promise<any | null> {
        const docs = await this.dbCtx.db
            .query("mr_game_round")
            .withIndex("by_game_round", (q: any) =>
                q.eq("gameId", gameId).eq("no", roundNumber)
            )
            .collect();
        return docs.length > 0
            ? docs.reduce((a: any, b: any) => (a._creationTime > b._creationTime ? a : b))
            : null;
    }

    /**
     * 创建新回合
     * Braveland 式全局回合顺序：收集所有存活角色（玩家+Boss+小怪），按 speed 降序排序；
     * 同速时玩家优先，同队内按 monsterId 稳定排序。生成的 turns[].order 用于整轮执行顺序。
     */
    async createRound(
        gameId: string,
        roundNumber: number,
        game: GameModel
    ): Promise<boolean> {
        // 收集所有角色（玩家队伍 + Boss + 小怪），统一用 character_id 表示实例 id
        const allCharacters: Array<{
            uid: string;
            character_id: string;
            monsterId: string;
            speed: number;
            team: 'player' | 'boss';
        }> = [];

        // 1. 玩家队伍（过滤已死亡）
        game.team.forEach((monster: GameMonster) => {
            const currentHp = monster.stats?.hp?.current ?? 0;
            if (currentHp > 0) {
                allCharacters.push({
                    uid: monster.uid,
                    character_id: (monster as any).character_id ?? monster.monsterId,
                    monsterId: monster.monsterId,
                    speed: monster.stats.speed,
                    team: 'player',
                });
            }
        });

        // 2. Boss 本体
        const bossHp = game.boss.stats?.hp?.current ?? 0;
        if (bossHp > 0) {
            allCharacters.push({
                uid: 'boss',
                character_id: game.boss.bossId,
                monsterId: game.boss.monsterId ?? game.boss.bossId,
                speed: game.boss.stats.speed,
                team: 'boss',
            });
        }

        // 3. 小怪
        game.boss.minions.forEach((minion) => {
            const minionHp = minion.stats?.hp?.current ?? 0;
            if (minionHp > 0) {
                allCharacters.push({
                    uid: 'boss',
                    character_id: minion.minionId,
                    monsterId: minion.monsterId ?? minion.minionId,
                    speed: minion.stats.speed,
                    team: 'boss',
                });
            }
        });

        // 4. 按速度排序，同速时玩家优先；同队内按 monsterId，再按 character_id 稳定排序
        allCharacters.sort((a, b) => {
            if (a.speed !== b.speed) return b.speed - a.speed;
            if (a.team === 'player' && b.team === 'boss') return -1;
            if (a.team === 'boss' && b.team === 'player') return 1;
            if (a.monsterId !== b.monsterId) return a.monsterId.localeCompare(b.monsterId);
            return a.character_id.localeCompare(b.character_id);
        });

        // 5. 转换为 GameTurn 数组（仅 uid + character_id）
        const turns: GameTurn[] = allCharacters.map((char, index) => ({
            uid: char.uid,
            character_id: char.character_id,
            status: 0,
            order: index + 1,
        }));

        // 6. 创建回合记录（若已存在则跳过，防止重复）
        const existing = await this.dbCtx.db
            .query("mr_game_round")
            .withIndex("by_game_round", (q: any) =>
                q.eq("gameId", gameId).eq("no", roundNumber)
            )
            .first();
        if (existing) return true;

        const roundObj = {
            gameId,
            no: roundNumber,
            status: 0,
            turns,
        };

        await this.dbCtx.db.insert("mr_game_round", roundObj);
        return true;
    }

    /**
     * 用最新 game 状态重排指定回合 turns（按 speed 降序）。
     * 用于 round_start 被动技能可能改变速度后，确保 roundStart 下发顺序是最新的。
     */
    async resortRoundTurnsBySpeed(
        gameId: string,
        roundNumber: number,
        game: GameModel
    ): Promise<boolean> {
        const roundDoc = await this.getRoundDoc(gameId, roundNumber);
        if (!roundDoc?.turns) return false;

        const allCharacters: Array<{
            uid: string;
            character_id: string;
            monsterId: string;
            speed: number;
            team: 'player' | 'boss';
        }> = [];

        game.team.forEach((monster: GameMonster) => {
            const currentHp = monster.stats?.hp?.current ?? 0;
            if (currentHp > 0) {
                allCharacters.push({
                    uid: monster.uid,
                    character_id: (monster as any).character_id ?? monster.monsterId,
                    monsterId: monster.monsterId,
                    speed: monster.stats.speed,
                    team: 'player',
                });
            }
        });

        const bossHp = game.boss.stats?.hp?.current ?? 0;
        if (bossHp > 0) {
            allCharacters.push({
                uid: 'boss',
                character_id: game.boss.bossId,
                monsterId: game.boss.monsterId ?? game.boss.bossId,
                speed: game.boss.stats.speed,
                team: 'boss',
            });
        }

        game.boss.minions.forEach((minion) => {
            const minionHp = minion.stats?.hp?.current ?? 0;
            if (minionHp > 0) {
                allCharacters.push({
                    uid: 'boss',
                    character_id: minion.minionId,
                    monsterId: minion.monsterId ?? minion.minionId,
                    speed: minion.stats.speed,
                    team: 'boss',
                });
            }
        });

        allCharacters.sort((a, b) => {
            if (a.speed !== b.speed) return b.speed - a.speed;
            if (a.team === 'player' && b.team === 'boss') return -1;
            if (a.team === 'boss' && b.team === 'player') return 1;
            if (a.monsterId !== b.monsterId) return a.monsterId.localeCompare(b.monsterId);
            return a.character_id.localeCompare(b.character_id);
        });

        const existingMap = new Map<string, GameTurn>(
            (roundDoc.turns as GameTurn[]).map((t) => [`${t.uid}::${t.character_id}`, t]),
        );

        const turns: GameTurn[] = allCharacters.map((char, index) => {
            const key = `${char.uid}::${char.character_id}`;
            const prev = existingMap.get(key);
            return {
                ...(prev ?? {}),
                uid: char.uid,
                character_id: char.character_id,
                status: prev?.status ?? 0,
                order: index + 1,
            } as GameTurn;
        });

        await this.dbCtx.db.patch(roundDoc._id, { turns });
        return true;
    }

    /**
     * 结束回合
     * 标记当前回合为已完成
     */
    async endRound(gameId: string, roundNumber: number): Promise<boolean> {
        const roundDoc = await this.getRoundDoc(gameId, roundNumber);

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
        currentTurn: GameTurn | null;
    } | null> {
        const roundDoc = await this.getRoundDoc(gameId, roundNumber);

        if (!roundDoc) {
            return null;
        }

        const currentTurn = roundDoc.turns?.find(
            (turn: GameTurn) => turn.status === 1
        ) || null;

        return {
            roundDoc,
            currentTurn,
        };
    }

    /**
     * 将召唤单位插入到当前回合的 turns 中，紧跟施法者之后
     * 这样施法者行动结束后会轮到召唤单位，而不是跳到 Boss
     */
    async addSummonedTurnsToCurrentRound(
        gameId: string,
        game: GameModel,
        summonedCharacters: SummonedCharacter[]
    ): Promise<void> {
        if (!summonedCharacters?.length) return;
        const roundNumber = game.currentRound?.no ?? 0;
        if (roundNumber <= 0) return;

        const roundDoc = await this.getRoundDoc(gameId, roundNumber);
        if (!roundDoc?.turns) return;

        const currentTurn = roundDoc.turns.find((t: GameTurn) => t.status === 1);
        const insertAfterOrder = currentTurn ? (currentTurn.order ?? 0) : 0;

        const existingIds = new Set(roundDoc.turns.map((t: GameTurn) => t.character_id));
        const newTurns: GameTurn[] = [];

        for (let i = 0; i < summonedCharacters.length; i++) {
            const u = summonedCharacters[i];
            const character_id = u.character_id;
            if (!character_id || existingIds.has(character_id)) continue;
            existingIds.add(character_id);
            newTurns.push({
                uid: u.uid,
                character_id,
                status: 0,
                order: insertAfterOrder + i + 1,
            });
        }

        if (newTurns.length === 0) return;

        const shiftBy = newTurns.length;
        const shiftedTurns = roundDoc.turns.map((t: GameTurn) => {
            const order = t.order ?? 0;
            if (order > insertAfterOrder) {
                return { ...t, order: order + shiftBy };
            }
            return t;
        });

        const insertedTurns = [...shiftedTurns, ...newTurns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        await this.dbCtx.db.patch(roundDoc._id, { turns: insertedTurns });
    }
}

