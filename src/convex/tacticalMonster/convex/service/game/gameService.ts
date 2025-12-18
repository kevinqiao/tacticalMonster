import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../../_generated/server";
import { calculateBossPower, getBossConfig, getMergedBossConfig } from "../../data/bossConfigs";
import { TeamService } from "../team/teamService";

interface GameModel {
    // mr_games 表字段
    gameId: string;
    matchId?: string;
    stageId: string;
    uid: string;  // 玩家 UID
    teamPower: number;
    team: Array<{  // 玩家选择的4个怪物
        monsterId: string;
        level: number;
        stars: number;
        hp: number;
        position: {
            q: number;
            r: number;
        };
    }>;
    boss: Array<{  // Boss数据
        monsterId: string;
        hp: number;
        damage: number;
        defense: number;
        speed: number;
        position: {
            q: number;
            r: number;
        };
        minions: Array<{  // 小怪数据
            monsterId: string;
            hp: number;
            damage: number;
            defense: number;
            speed: number;
            position: {
                q: number;
                r: number;
            };
        }>;
    }>;
    map: {
        rows: number;
        cols: number;
        obstacles: Array<{
            q: number;
            r: number;
        }>;
        disables: Array<{
            q: number;
            r: number;
        }>;
    };
    status: number;  // 0: waiting, 1: won, 2: lost, 3: game over
    score: number;
    lastUpdate: string;  // ISO 字符串格式
    createdAt: string;  // ISO 字符串格式

    // 运行时字段（不在数据库中，但用于代码逻辑）
    round?: number;  // 当前回合数
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
    monsterId: string;
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
        // 查询 mr_games 表
        const game = await this.dbCtx.db
            .query("mr_games")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
            .first();

        if (!game) return null;

        // 获取当前回合数
        const roundNumber = (game as any).round || 0;

        // 构建 GameModel（符合 mr_games 表结构）
        this.game = {
            gameId: game.gameId,
            matchId: game.matchId,
            stageId: game.stageId,
            uid: game.uid,
            teamPower: game.teamPower,
            team: game.team || [],
            boss: game.boss || [],
            map: game.map,
            status: game.status,
            score: game.score,
            lastUpdate: game.lastUpdate,
            createdAt: game.createdAt,
            round: roundNumber,
        };

        return this.game;
    }

    async save(data: {
        round?: number;
        status?: number;
        score?: number;
        lastUpdate?: number | string;
    }): Promise<void> {
        if (!this.game) return;

        const updateData: any = {};
        if (data.status !== undefined) updateData.status = data.status;
        if (data.round !== undefined) updateData.round = data.round;
        if (data.score !== undefined) updateData.score = data.score;
        if (data.lastUpdate !== undefined) {
            updateData.lastUpdate = typeof data.lastUpdate === 'string'
                ? data.lastUpdate
                : new Date(data.lastUpdate).toISOString();
        }

        if (Object.keys(updateData).length > 0) {
            // 更新 mr_games 表
            const gameDoc = await this.dbCtx.db
                .query("mr_games")
                .withIndex("by_gameId", (q: any) => q.eq("gameId", this.game!.gameId))
                .first();

            if (!gameDoc) {
                throw new Error(`游戏不存在: ${this.game!.gameId}`);
            }

            await this.dbCtx.db.patch(gameDoc._id, updateData);
            this.game = { ...this.game, ...updateData };
        }
    }

    async createGame(
        uid: string,
        gameId: string,
        ruleId: string,
        stageId: string
    ): Promise<GameModel | null> {
        // 1. 根据 uid 获取玩家队伍（从 mr_player_monsters 表）
        const playerTeamMonsters = await TeamService.getPlayerTeam(this.dbCtx, uid);

        if (!playerTeamMonsters || playerTeamMonsters.length === 0) {
            throw new Error(`玩家 ${uid} 没有配置队伍`);
        }

        // 转换为 gameService 需要的格式
        const playerTeam = {
            team: playerTeamMonsters.map((monster: any) => ({
                monsterId: monster.monsterId,
                level: monster.level,
                stars: monster.stars,
                position: monster.teamPosition || { q: 0, r: 0 },
            })),
        };

        // 2. 根据 stageId 获取数据库 mr_stage 的 stage 数据
        const stage = await this.dbCtx.db
            .query("mr_stage")
            .withIndex("by_stageId", (q: any) => q.eq("stageId", stageId))
            .first();

        if (!stage) {
            throw new Error(`Stage 不存在: ${stageId}`);
        }

        // 3. 地图数据直接保存在 stage.map 中，不需要单独查询

        // 4. 计算每个 monster 的满血 HP 值和 teamPower
        let totalTeamPower = 0;
        const teamWithHp = await Promise.all(
            playerTeam.team.map(async (monster: any) => {
                // 获取怪物配置
                const monsterConfig = await this.dbCtx.db
                    .query("mr_monster_configs")
                    .withIndex("by_monsterId", (q: any) => q.eq("monsterId", monster.monsterId))
                    .first();

                if (!monsterConfig) {
                    throw new Error(`怪物配置不存在: ${monster.monsterId}`);
                }

                // 计算等级加成的实际 HP
                // 每级增长15%基础HP
                const hpGrowthRate = 0.15;
                const damageGrowthRate = 0.10;
                const defenseGrowthRate = 0.12;

                const actualHp = monsterConfig.baseHp * (1 + (monster.level - 1) * hpGrowthRate);
                const actualAttack = monsterConfig.baseDamage * (1 + (monster.level - 1) * damageGrowthRate);
                const actualDefense = monsterConfig.baseDefense * (1 + (monster.level - 1) * defenseGrowthRate);

                // 星级倍数（每星增加10%）
                const starMultiplier = 1 + (monster.stars - 1) * 0.1;

                // 满血 HP = 实际HP × 星级倍数
                const maxHp = Math.floor(actualHp * starMultiplier);

                // 计算 Power: (HP + Attack * 2 + Defense * 1.5) * StarMultiplier
                const basePower = actualHp + actualAttack * 2 + actualDefense * 1.5;
                const monsterPower = Math.floor(basePower * starMultiplier);
                totalTeamPower += monsterPower;

                return {
                    monsterId: monster.monsterId,
                    level: monster.level,
                    stars: monster.stars,
                    hp: maxHp,  // 满血值
                    position: monster.position,
                };
            })
        );

        // 5. 获取 Boss 配置
        const bossConfig = getBossConfig(stage.bossId);
        if (!bossConfig) {
            throw new Error(`Boss配置不存在: ${stage.bossId}`);
        }

        // 6. 使用计算出的 teamPower（用于 Boss 缩放）
        const teamPower = totalTeamPower;

        // 7. 根据 stage.difficulty 自适应 Boss 的属性
        // difficulty 表示 "Boss Power / Player Team Power" 的比率
        const mergedBossConfig = getMergedBossConfig(stage.bossId);
        if (!mergedBossConfig) {
            throw new Error(`无法获取合并后的Boss配置: ${stage.bossId}`);
        }

        // 计算基础 Boss Power
        const baseBossPower = calculateBossPower(mergedBossConfig);

        // 计算缩放倍数：scale = (playerPower * difficulty) / baseBossPower
        const targetBossPower = teamPower * stage.difficulty;
        const bossScale = Math.max(0.1, Math.min(10.0, targetBossPower / baseBossPower));

        // 应用缩放到 Boss 属性
        const scaledBossStats = {
            hp: Math.floor((mergedBossConfig.baseHp ?? 0) * bossScale),
            attack: Math.floor((mergedBossConfig.baseDamage ?? 0) * bossScale),
            defense: Math.floor((mergedBossConfig.baseDefense ?? 0) * bossScale),
            speed: Math.floor((mergedBossConfig.baseSpeed ?? 0) * bossScale),
        };

        // 8. 构建 Boss 数据（包括小怪）
        const bossMainPosition = (bossConfig as any).position || { q: 0, r: 0 };

        // 处理小怪数据（异步）
        const minionsData = await Promise.all(
            (bossConfig.minions || []).flatMap((minion: any) => {
                const positions = minion.positions || [];
                return Array.from({ length: minion.quantity }, async (_, i) => {
                    // 小怪也需要缩放（使用相同的缩放倍数）
                    // 小怪配置使用 monsterId 引用角色配置
                    let minionScaledStats;
                    try {
                        // 从角色配置获取基础属性
                        const minionMonsterConfig = await this.dbCtx.db
                            .query("mr_monster_configs")
                            .withIndex("by_monsterId", (q: any) => q.eq("monsterId", minion.monsterId))
                            .first();

                        if (minionMonsterConfig) {
                            // 使用角色配置的基础值，minion 的覆盖值优先
                            const baseHp = minion.baseHp ?? minionMonsterConfig.baseHp;
                            const baseDamage = minion.baseDamage ?? minionMonsterConfig.baseDamage;
                            const baseDefense = minion.baseDefense ?? minionMonsterConfig.baseDefense;
                            const baseSpeed = minion.baseSpeed ?? minionMonsterConfig.baseSpeed;

                            // 应用缩放
                            minionScaledStats = {
                                hp: Math.floor(baseHp * bossScale),
                                attack: Math.floor(baseDamage * bossScale),
                                defense: Math.floor(baseDefense * bossScale),
                                speed: Math.floor(baseSpeed * bossScale),
                            };
                        } else {
                            // 如果没有角色配置，使用 minion 的基础值或默认值
                            minionScaledStats = {
                                hp: Math.floor((minion.baseHp || 100) * bossScale),
                                attack: Math.floor((minion.baseDamage || 10) * bossScale),
                                defense: Math.floor((minion.baseDefense || 5) * bossScale),
                                speed: Math.floor((minion.baseSpeed || 10) * bossScale),
                            };
                        }
                    } catch (error) {
                        // 如果获取小怪配置失败，使用默认值并应用缩放
                        minionScaledStats = {
                            hp: Math.floor((minion.baseHp || 100) * bossScale),
                            attack: Math.floor((minion.baseDamage || 10) * bossScale),
                            defense: Math.floor((minion.baseDefense || 5) * bossScale),
                            speed: Math.floor((minion.baseSpeed || 10) * bossScale),
                        };
                    }

                    return {
                        monsterId: minion.minionId,
                        hp: minionScaledStats.hp,
                        damage: minionScaledStats.attack,
                        defense: minionScaledStats.defense,
                        speed: minionScaledStats.speed,
                        position: positions[i] || { q: 0, r: 0 },
                    };
                });
            })
        );

        const bossData = [{
            monsterId: stage.bossId,
            hp: scaledBossStats.hp,
            damage: scaledBossStats.attack,
            defense: scaledBossStats.defense,
            speed: scaledBossStats.speed,
            position: bossMainPosition,
            minions: minionsData,
        }];

        // 9. 构建地图数据（符合 mr_games.map 结构，从 stage.map 获取）
        const mapForGame = {
            rows: stage.map.rows,
            cols: stage.map.cols,
            obstacles: stage.map.obstacles.map((obs: any) => ({
                q: obs.q,
                r: obs.r,
            })),
            disables: stage.map.disables || [],
        };

        // 10. 创建 mr_games 记录
        const now = new Date().toISOString();
        await this.dbCtx.db.insert("mr_games", {
            uid,
            teamPower,
            team: teamWithHp,
            boss: bossData,
            map: mapForGame,
            stageId,
            ruleId,
            gameId,
            status: 0,  // 0: waiting
            score: 0,
            lastUpdate: now,
            createdAt: now,
        });

        // 11. 构建并返回 GameModel
        this.game = {
            gameId,
            stageId,
            uid,
            teamPower,
            team: teamWithHp,
            boss: bossData,
            map: mapForGame,
            status: 0,
            score: 0,
            lastUpdate: now,
            createdAt: now,
            round: 0,
        };

        return this.game;
    }

    async walk(
        gameId: string,
        uid: string,
        monsterId: string,
        to: { q: number; r: number }
    ): Promise<boolean> {
        await this.load(gameId);
        if (!this.game) return false;

        // 从数据库查询角色（使用 filter 查询，因为索引可能使用 character_id）
        const charDoc = await this.dbCtx.db
            .query("tacticalMonster_game_character")
            .withIndex("by_game", (q: any) => q.eq("gameId", gameId))
            .filter((q: any) =>
                q.and(
                    q.eq(q.field("uid"), uid),
                    q.or(
                        q.eq(q.field("monsterId"), monsterId),
                        q.eq(q.field("character_id"), monsterId)  // 向后兼容
                    )
                )
            )
            .first();

        if (!charDoc) return false;

        // Update character position
        await this.dbCtx.db.patch(charDoc._id, { q: to.q, r: to.r });

        // Create event
        const event: CombatEvent = {
            gameId,
            uid,
            name: "walk",
            type: 1,
            data: { uid, monsterId, to },
            time: Date.now(),
        };

        await this.dbCtx.db.insert("tacticalMonster_event", event);
        await this.save({ lastUpdate: new Date().toISOString() });

        return true;
    }

    async attack(
        gameId: string,
        data: {
            attacker: { uid: string; monsterId: string; skillSelect: string };
            target: { uid: string; monsterId: string };
        }
    ): Promise<CombatEvent | null> {
        await this.load(gameId);
        if (!this.game) return null;

        const { attacker, target } = data;

        // 从数据库查询角色（使用 filter 查询，因为索引可能使用 character_id）
        const attackerChar = await this.dbCtx.db
            .query("tacticalMonster_game_character")
            .withIndex("by_game", (q: any) => q.eq("gameId", gameId))
            .filter((q: any) =>
                q.and(
                    q.eq(q.field("uid"), attacker.uid),
                    q.or(
                        q.eq(q.field("monsterId"), attacker.monsterId),
                        q.eq(q.field("character_id"), attacker.monsterId)  // 向后兼容
                    )
                )
            )
            .first();

        const targetChar = await this.dbCtx.db
            .query("tacticalMonster_game_character")
            .withIndex("by_game", (q: any) => q.eq("gameId", gameId))
            .filter((q: any) =>
                q.and(
                    q.eq(q.field("uid"), target.uid),
                    q.or(
                        q.eq(q.field("monsterId"), target.monsterId),
                        q.eq(q.field("character_id"), target.monsterId)  // 向后兼容
                    )
                )
            )
            .first();

        if (!attackerChar || !targetChar) return null;

        const event: CombatEvent = {
            gameId,
            uid: attacker.uid,
            name: "attack",
            type: 2,
            data,
            time: Date.now(),
        };

        await this.dbCtx.db.insert("tacticalMonster_event", event);
        await this.save({ lastUpdate: new Date().toISOString() });

        return event;
    }

    async selectSkill(gameId: string, data: { skillId: string }): Promise<boolean> {
        await this.load(gameId);
        if (!this.game || this.game.round === undefined) return false;

        const { skillId } = data;
        const roundNumber = this.game.round;

        // 从数据库查询当前回合
        const roundDoc = await this.dbCtx.db
            .query("tacticalMonster_game_round")
            .withIndex("by_game_round", (q: any) =>
                q.eq("gameId", gameId).eq("no", roundNumber)
            )
            .unique();

        if (!roundDoc) return false;

        const currentTurn = roundDoc.turns?.find(
            (turn: CombatTurn) => turn.status === 1 || turn.status === 2
        );

        if (!currentTurn) return false;

        currentTurn.skillSelect = skillId;

        await this.dbCtx.db.patch(roundDoc._id, {
            turns: roundDoc.turns,
        });

        await this.save({ lastUpdate: new Date().toISOString() });

        return true;
    }

    async startNewRound(gameId: string): Promise<boolean> {
        await this.load(gameId);
        if (!this.game) return false;

        const newRoundNo = (this.game.round || 0) + 1;

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
            time: Date.now(),
        };

        await this.dbCtx.db.insert("tacticalMonster_event", event);
        await this.save({ round: newRoundNo, lastUpdate: new Date().toISOString() });

        return true;
    }

    async endRound(gameId: string): Promise<boolean> {
        await this.load(gameId);
        if (!this.game) return false;
        if (this.game.round === undefined) return false;

        const roundNumber = this.game.round;
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
        }

        const event: CombatEvent = {
            gameId,
            name: "end_round",
            type: 0,
            data: { round: this.game.round },
            time: Date.now(),
        };

        await this.dbCtx.db.insert("tacticalMonster_event", event);
        await this.save({ lastUpdate: new Date().toISOString() });

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
        await this.save({ score: newScore, lastUpdate: new Date().toISOString() });

        return true;
    }

    async gameOver(gameId: string): Promise<GameReport | null> {
        await this.load(gameId);
        if (!this.game) return null;

        const baseScore = this.game.score || 0;
        const startTime = this.game.lastUpdate
            ? new Date(this.game.lastUpdate).getTime()
            : Date.now();
        const endTime = Date.now();
        const duration = endTime - startTime;

        // 时间奖励：越快完成奖励越高（简化计算）
        const timeBonus = Math.max(0, Math.floor((1000 - duration / 1000) / 10));

        // 完成奖励：根据状态判断
        const completeBonus = this.game.status === 1 ? 500 : 0; // 胜利奖励

        const totalScore = baseScore + timeBonus + completeBonus;

        await this.save({ status: 3, lastUpdate: new Date().toISOString() });

        const event: CombatEvent = {
            gameId,
            name: "game_end",
            type: 0,
            data: { gameId },
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

    /**
     * 通知游戏结束
     * 职责：
     * 1. 更新 TacticalMonster 本地游戏状态为 "ended"
     * 2. 通知 Tournament 模块游戏结束
     * 3. 处理 Battle Pass 积分和任务事件（异步，不阻塞）
     * 
     * 注意：
     * - 不处理奖励分配（奖励在玩家 claim 时处理）
     * - 不处理排名和分数计算（由 Tournament 模块负责）
     */
    async notifyGameEnd(gameId: string): Promise<{
        ok: boolean;
        alreadyEnded?: boolean;
        isSinglePlayer?: boolean;
        matchInProgress?: boolean;
        matchCompleted?: boolean;
        message?: string;
    }> {
        const { TournamentProxyService } = await import("../tournament/tournamentProxyService");

        // 1. 获取游戏信息
        await this.load(gameId);
        if (!this.game) {
            throw new Error("游戏不存在");
        }

        // 获取数据库中的游戏记录（用于状态检查和更新）
        const gameDoc = await this.dbCtx.db
            .query("mr_games")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
            .first();

        if (!gameDoc) {
            throw new Error("游戏不存在");
        }

        if (gameDoc.status === 3) {  // 3: game over
            // 游戏已经结束，避免重复处理
            return { ok: true, alreadyEnded: true };
        }

        // 2. 更新游戏状态为 3 (game over)
        await this.dbCtx.db.patch(gameDoc._id, {
            status: 3,
            lastUpdate: new Date().toISOString(),
        });

        // 3. 判断是否为 Tournament 模式
        const isTournamentMode = !!(gameDoc.matchId && gameDoc.matchId !== "");

        if (!isTournamentMode) {
            // 单玩家模式：直接返回，不处理奖励
            return {
                ok: true,
                isSinglePlayer: true,
                message: "单玩家游戏已结束",
            };
        }

        // 4. Tournament 模式：通知 Tournament 模块游戏结束
        // Tournament 模块会：
        // - 更新 player_matches 状态为 COMPLETED
        // - 检查 match 中所有游戏是否都结束
        // - 如果都结束，结算 tournament 并保存到 player_tournaments
        const tournamentResult = await TournamentProxyService.notifyGameEnd({
            gameId: gameId,
            matchId: (gameDoc as any).matchId,
            finalScore: this.game.score || 0,
        });

        if (!tournamentResult.ok) {
            throw new Error(tournamentResult.error || "通知 Tournament 模块失败");
        }

        // 5. 处理 Battle Pass 积分和任务事件（异步，不阻塞）
        // 注意：这里需要获取玩家的排名信息，但新设计中 Tournament 不返回奖励决策
        // 所以我们需要从 participant 中获取信息，或者只处理基础的事件
        // 为了不阻塞，这里先获取参与者信息
        const participants = await this.dbCtx.db
            .query("mr_game_participants")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
            .collect();

        // 异步处理 Battle Pass 和任务事件（不阻塞游戏结束流程）
        if (participants.length > 0) {
            // 注意：Battle Pass 积分现在通过 Tournament 模块在结算时统一处理
            // 这里只处理任务事件
            const { TaskIntegration } = await import("../task/taskIntegration");

            // 异步处理，不阻塞
            Promise.all(participants.map(async (participant: any) => {
                if (participant.status === "finished") {
                    try {
                        // 计算 Battle Pass 积分（使用临时排名，实际排名由 Tournament 计算）
                        // 这里先给一个基础积分，或者等到 claim 时再处理
                        // 为了简化，这里只处理任务事件

                        // 处理任务事件（游戏完成）
                        // 注意：实际排名需要在 Tournament 结算后才知道，这里先标记为完成
                        await TaskIntegration.onGameComplete({
                            uid: participant.uid,
                            gameType: "tacticalMonster",
                            isWin: false, // 实际排名需要等 Tournament 结算
                            matchId: (gameDoc as any).matchId,
                            tournamentId: (gameDoc as any).tournamentId,
                            score: participant.finalScore || 0,
                        });
                    } catch (error) {
                        console.error(`为玩家 ${participant.uid} 处理任务事件失败:`, error);
                    }
                }
            })).catch((error) => {
                console.error("处理 Battle Pass 和任务事件失败:", error);
            });
        }

        // 6. 返回结果
        if (tournamentResult.matchCompleted) {
            return {
                ok: true,
                matchCompleted: true,
                message: "游戏已结束，match 已完成结算",
            };
        } else {
            return {
                ok: true,
                matchInProgress: true,
                message: "游戏已结束，等待其他玩家完成",
            };
        }
    }
}

// Convex 函数接口
export const createGame = internalMutation({
    args: {
        uid: v.string(),
        gameId: v.string(),
        ruleId: v.string(),
        stageId: v.string(),
    },
    handler: async (ctx, { uid, gameId, ruleId, stageId }) => {
        console.log("createGame...", uid, gameId, ruleId, stageId);
        const gameManager = new TacticalMonsterGameManager(ctx);
        const game = await gameManager.createGame(uid, gameId, ruleId, stageId);
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
        const game = await gameManager.load(gameId);

        if (!game) {
            return { ok: false };
        }

        const baseScore = game.score || 0;
        const timeBonus = 0; // 可以计算时间奖励
        const completeBonus = game.status === 1 ? 500 : 0;
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
        monsterId: v.string(),
        to: v.object({ q: v.number(), r: v.number() }),
    },
    handler: async (ctx, { gameId, uid, monsterId, to }) => {
        console.log("walk", gameId, uid, monsterId, to);
        const gameManager = new TacticalMonsterGameManager(ctx);
        await gameManager.load(gameId);
        const result = await gameManager.walk(gameId, uid, monsterId, to);
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
                monsterId: v.string(),
                skillSelect: v.string(),
            }),
            target: v.object({
                uid: v.string(),
                monsterId: v.string(),
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
            .query("mr_game_event")
            .withIndex("by_game", (q: any) => q.eq("gameId", gameId));

        if (lastTime) {
            query = query.filter((q: any) => q.gt(q.field("time"), lastTime));
        }

        const events = await query.collect();
        return events.map((e: any) => ({ ...e, _creationTime: undefined }));
    },
});

/**
 * 游戏结束
 * 处理游戏结束流程（阶段2：所有玩家完成或超时后）
 */
export const endGame = internalMutation({
    args: {
        gameId: v.string(),
    },
    handler: async (ctx, args) => {
        const gameManager = new TacticalMonsterGameManager(ctx);
        return await gameManager.notifyGameEnd(args.gameId);
    },
});

/**
 * 通知游戏结束（包装函数）
 * 供其他模块使用，使用 TacticalMonsterGameManager 类方法
 */
export async function notifyGameEnd(ctx: any, gameId: string): Promise<{
    ok: boolean;
    alreadyEnded?: boolean;
    isSinglePlayer?: boolean;
    matchInProgress?: boolean;
    matchCompleted?: boolean;
    message?: string;
}> {
    const gameManager = new TacticalMonsterGameManager(ctx);
    return await gameManager.notifyGameEnd(gameId);
}

export default TacticalMonsterGameManager;

