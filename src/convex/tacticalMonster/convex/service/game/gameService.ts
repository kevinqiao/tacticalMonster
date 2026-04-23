import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../../_generated/server";
import { CharacterIdentifier, CombatEvent, GameModel, GameStatus, PhaseChanges, SkillEffectItem } from "../../types/gameTypes";
import { GameMonster } from "../../types/monsterTypes";
import { CharacterPositionService } from "./characterPositionService";
import { CharacterQueryService } from "./characterQueryService";
import { CharacterUpdateService } from "./characterUpdateService";
import { GameActionService } from "./gameActionService";
import { CharacterGetter, GameActionValidator } from "./gameActionValidator";
import { GameEventService } from "./gameEventService";
import { GameLifecycleService } from "./gameLifecycleService";
import { GamePhaseService } from "./gamePhaseService";
import { GameScoreService } from "./gameScoreService";
import { RoundService } from "./roundService";
import { buildEndGameScoreResult, GameResult } from "./sharedScoreService";
import { SkillTargetService } from "./skillTargetService";

/**
 * GameService - 战术怪物游戏服务
 * 负责游戏的创建、加载、保存和状态管理
 * 
 * 简化版本：将所有方法委托给新创建的服务
 */
export class GameService implements CharacterGetter {
    private dbCtx: any;
    private ctx: any; // 存储 Convex context（用于调度）

    // 新的服务实例
    private characterQueryService: CharacterQueryService;
    private skillTargetService: SkillTargetService;
    private gameLifecycleService: GameLifecycleService;
    private gameScoreService: GameScoreService;
    private gamePhaseService: GamePhaseService;
    private validator: GameActionValidator | null = null;

    // 保留的服务（用于 GameActionService 和 GamePhaseService）
    private eventService: GameEventService;
    private positionService: CharacterPositionService;
    private characterUpdateService: CharacterUpdateService;
    private roundService: RoundService;

    constructor(dbCtx: any) {
        this.dbCtx = dbCtx;
        this.ctx = dbCtx; // Convex mutation/query 的 ctx 包含 db 和 scheduler

        // 初始化基础服务
        this.eventService = new GameEventService(dbCtx);
        this.positionService = new CharacterPositionService(dbCtx);
        this.characterUpdateService = new CharacterUpdateService(dbCtx);
        this.roundService = new RoundService(dbCtx);

        // 初始化新的服务（按依赖顺序）
        this.characterQueryService = new CharacterQueryService();
        this.skillTargetService = new SkillTargetService(this.characterQueryService);
        this.gameLifecycleService = new GameLifecycleService(dbCtx);
        this.gameScoreService = new GameScoreService(dbCtx, this.gameLifecycleService, this.eventService);
        this.gamePhaseService = new GamePhaseService(
            dbCtx,
            this.characterQueryService,
            this.characterUpdateService,
            this.roundService,
            this.gameLifecycleService,
            this.gameScoreService
        );

        // GameActionService 需要很多依赖，延迟初始化
        // this.gameActionService 将在第一次使用时初始化
    }

    /**
     * 获取验证器实例（延迟初始化）
     */
    private getValidator(): GameActionValidator {
        if (!this.validator) {
            this.validator = new GameActionValidator(this.dbCtx, null, this);
        }
        return this.validator;
    }

    /**
     * 获取 GameActionService 实例（延迟初始化）
     */
    private getActionService(): GameActionService {
        // GameActionService 需要所有服务，延迟初始化
        if (!(this as any).gameActionService) {
            (this as any).gameActionService = new GameActionService(
                this.dbCtx,
                this.characterQueryService,
                this.skillTargetService,
                this.characterUpdateService,
                this.positionService,
                this.eventService,
                this.getValidator(),
                this.gamePhaseService,
                this.gameLifecycleService,
                this.gameScoreService,
                this.roundService
            );
        }
        return (this as any).gameActionService;
    }


    /**
     * CharacterGetter 接口实现：根据标识符获取 GameMonster
     * 委托给 CharacterQueryService
     */
    getCharacter(
        monsterId?: string,
        bossId?: string,
        minionId?: string
    ): GameMonster | null {
        return this.characterQueryService.getCharacter(monsterId, bossId, minionId);
    }

    /**
     * CharacterGetter 接口实现：获取所有可攻击的角色
     * 委托给 CharacterQueryService
     */
    getAllCharacters(): GameMonster[] {
        return this.characterQueryService.getAllCharacters();
    }




    /**
     * 加载游戏数据
     * 从数据库读取游戏记录并转换为 GameModel
     * 委托给 GameLifecycleService
     * @param gameId 游戏ID
     * @returns GameModel 或 null（如果游戏不存在）
     */
    async load(gameId: string): Promise<GameModel | null> {
        const game = await this.gameLifecycleService.load(gameId);
        if (!game) {
            return null;
        }

        // 更新 characterQueryService 的游戏状态
        this.characterQueryService.setGame(game);

        // 更新验证器的游戏状态引用（确保 validator 已初始化，避免延迟初始化导致 game 为 null）
        const validator = this.getValidator();
        (validator as any).game = game;

        return game;
    }

    /**
     * 保存游戏数据
     * 更新游戏的部分字段到数据库
     * 委托给 GameLifecycleService
     * @param gameId 游戏ID
     * @param data 要更新的字段
     */
    async save(gameId: string, data: {
        round?: number;
        status?: GameStatus;
        score?: number;
        lastUpdate?: number | string;
    }): Promise<void> {
        await this.gameLifecycleService.save(gameId, data);
    }

    /**
     * 创建新游戏
     * 根据玩家队伍和关卡配置创建完整的游戏实例
     * @param uid 玩家UID
     * @param gameId 游戏ID
     * @param ruleId 规则ID
     * @param stageId 关卡ID
     * @returns GameModel 和 phaseChanges（如果创建失败，game 为 null）
     */
    async createGame(
        uid: string,
        gameId: string,
        ruleId: string,
        stageId: string
    ): Promise<{ game: GameModel | null; phaseChanges?: PhaseChanges }> {
        // console.log("createGame params", uid, gameId, ruleId, stageId);
        const game = await this.gameLifecycleService.createGame(uid, gameId, ruleId, stageId);
        if (!game) return { game: null };

        // 更新 characterQueryService 的游戏状态
        this.characterQueryService.setGame(game);

        // 更新验证器的游戏状态引用（确保 validator 已初始化）
        const validator = this.getValidator();
        (validator as any).game = game;

        // ✅ 启动第一个 round 的第一个 turn（触发 round_start 和 turn_start 被动技能，处理 Boss AI）
        let phaseChanges: PhaseChanges | undefined;
        if (game.currentRound && game.currentRound.no > 0) {
            phaseChanges = await this.gamePhaseService.startFirstTurn(
                gameId,
                game.currentRound.no,
                this.ctx
            );

            console.log("First turn started with phaseChanges:", phaseChanges);
        }

        // ✅ 返回执行 phaseChanges 之前的状态，让前端根据 phaseChanges 逐步应用变化并播放动画
        // 前端会根据 phaseChanges 来更新角色状态（HP、位置等），并播放相应的动画
        // 这样用户体验更好，可以看到状态变化的完整过程
        return { game, phaseChanges };
    }

    /**
     * 原子操作：移动后攻击
     * 委托给 GameActionService
     */
    async walkAndAttack(
        gameId: string,
        data: {
            to: { q: number; r: number };
            steps: number;
            identifier: CharacterIdentifier;
            skillId: string;
            targets?: CharacterIdentifier[];
        }
    ): Promise<{
        success: boolean;
        message?: string;
        phaseChanges?: PhaseChanges;
        effects?: SkillEffectItem[];
    }> {
        await this.load(gameId);
        return await this.getActionService().walkAndAttack(gameId, data);
    }

    /**
     * 移动角色
     * 更新角色在战场上的位置
     * 委托给 GameActionService
     * 
     * @param gameId 游戏ID
     * @param to 目标位置（Hex坐标）
     * @param identifier 角色标识符（monsterId/bossId/minionId 三选一）
     * @param options.steps 实际行走步数（路径长度），必填
     * @param options.endTurn @deprecated 已忽略，由后端根据步数是否用尽自动判定
     * @param options.forceEndTurn @deprecated 已忽略
     * @returns 移动结果，包含可能的阶段变化
     */
    async walk(
        gameId: string,
        to: { q: number; r: number },
        identifier: CharacterIdentifier,
        options?: { endTurn?: boolean; steps?: number; forceEndTurn?: boolean; deferTurnEnd?: boolean }
    ): Promise<{
        success: boolean;
        message?: string;
        phaseChanges?: PhaseChanges;
        endTurn?: boolean;
    }> {
        return await this.getActionService().walk(gameId, to, identifier, options);
    }

    /**
     * 执行防守
     * 委托给 GameActionService
     * @param gameId 游戏ID
     * @param identifier 角色标识符
     */
    async defend(
        gameId: string,
        identifier: CharacterIdentifier
    ): Promise<{ success: boolean; message?: string; phaseChanges?: PhaseChanges }> {
        await this.load(gameId);
        return await this.getActionService().executeDefend(gameId, identifier);
    }

    /**
     * 结束回合（待机，无防守 buff）
     */
    async standby(
        gameId: string,
        identifier: CharacterIdentifier
    ): Promise<{ success: boolean; message?: string; phaseChanges?: PhaseChanges }> {
        await this.load(gameId);
        return await this.getActionService().executeStandby(gameId, identifier);
    }

    /**
     * 执行攻击
     * 委托给 GameActionService
     * @param gameId 游戏ID
     * @param data 攻击数据
     * @returns CombatEvent 或 null（如果失败）
     */
    async attack(
        gameId: string,
        data: {
            attacker: CharacterIdentifier;
            skillSelect?: string;
            targets: CharacterIdentifier[];
        }
    ): Promise<CombatEvent | null> {
        return await this.getActionService().attack(gameId, data);
    }

    /**
     * 选择技能
     * 委托给 GameActionService
     * @param gameId 游戏ID
     * @param data 技能数据
     * @returns 是否成功
     */
    async selectSkill(
        gameId: string,
        data: { skillId: string }
    ): Promise<{ success: boolean; message?: string }> {
        return await this.getActionService().selectSkill(gameId, data);
    }

    /**
     * 使用技能
     * 委托给 GameActionService
     * @param gameId 游戏ID
     * @param data 技能使用数据
     * @returns 技能使用结果
     */
    async useSkill(
        gameId: string,
        data: CharacterIdentifier & {
            skillId: string;
            targets?: CharacterIdentifier[];
        }
    ): Promise<{
        success: boolean;
        message?: string;
        cooldownSet?: number;
        resourcesConsumed?: {
            mp?: number;
            hp?: number;
            stamina?: number;
        };
        effects?: SkillEffectItem[];
        phaseChanges?: PhaseChanges;
    }> {
        // ✅ 首先检查 characterQueryService 中是否已有游戏
        let game = (this.characterQueryService as any).game;

        // ✅ 如果 characterQueryService 中没有游戏，或者 gameId 不匹配，则加载游戏
        if (!game || game.gameId !== gameId) {
            game = await this.load(gameId);
            if (!game) {
                return {
                    success: false,
                    message: "游戏不存在",
                };
            }
            // ✅ 确保 characterQueryService 设置了游戏状态（仅在重新加载后设置）
            this.characterQueryService.setGame(game);
        }

        // ✅ 验证游戏是否正确设置
        const finalGame = (this.characterQueryService as any).game;
        if (!finalGame || finalGame.gameId !== gameId) {
            return {
                success: false,
                message: "游戏状态错误",
            };
        }

        // ✅ 确保 validator 的游戏状态引用已更新
        const validator = this.getValidator();
        (validator as any).game = finalGame;

        return await this.getActionService().useSkill(gameId, data);
    }

    /**
     * 开始新回合
     * 创建新的战斗回合记录，使用完全速度排序
     * 
     * 排序规则：
     * 1. 所有角色（玩家队伍 + Boss + 小怪）统一按速度排序
     * 2. 速度相同时，玩家优先（PVE中玩家应该有一定优势）
     * 3. 只包含存活的角色（HP > 0）
     * 
     * @param gameId 游戏ID
     * @returns 是否成功
     */
    async startNewRound(gameId: string): Promise<boolean> {
        const game = await this.load(gameId);
        if (!game) return false;

        const newRoundNo = (game.currentRound?.no ?? 0) + 1;

        // 使用回合服务创建新回合
        const success = await this.roundService.createRound(gameId, newRoundNo, game);
        if (!success) return false;

        // 创建新回合事件
        const event = this.eventService.createNewRoundEvent(gameId, newRoundNo);
        await this.eventService.createEvent(event);
        await this.save(gameId, { round: newRoundNo, lastUpdate: new Date().toISOString() });

        return true;
    }

    /**
     * 结束回合
     * 标记当前回合为已完成
     * @param gameId 游戏ID
     * @returns 是否成功
     */
    async endRound(gameId: string): Promise<boolean> {
        const game = await this.load(gameId);
        if (!game) return false;
        if (game.currentRound === undefined) return false;

        const roundNumber = game.currentRound?.no ?? 0;

        // 使用回合服务结束回合
        const success = await this.roundService.endRound(gameId, roundNumber);
        if (!success) return false;

        // 创建结束回合事件
        const event = this.eventService.createEndRoundEvent(gameId, roundNumber);
        await this.eventService.createEvent(event);
        await this.save(gameId, { lastUpdate: new Date().toISOString() });

        return true;
    }

    // /**
    //  * 计算分数（已废弃，使用 sharedScoreService）
    //  * @deprecated 使用 sharedScoreService.calculateActionScore 代替
    //  */
    // calculateScore(action: any, actionType: string): number {
    //     // 保持向后兼容，但实际使用 sharedScoreService
    //     const actionData = {
    //         actionType: actionType as 'attack' | 'skill' | 'walk',
    //         killed: action.data?.killed,
    //         killedType: action.data?.killedType as 'boss' | 'minion' | undefined
    //     };
    //     return sharedScoreService.calculateActionScore(
    //         actionData,
    //         this.game?.scoringConfigVersion
    //     );
    // }

    /**
     * 更新分数
     * 委托给 GameScoreService
     * @param gameId 游戏ID
     * @param scoreDelta 分数变化量
     * @returns 是否成功
     */
    async updateScore(gameId: string, scoreDelta: number): Promise<boolean> {
        return await this.gameScoreService.updateScore(gameId, scoreDelta);
    }

    /**
     * 检查并更新游戏状态
     * 委托给 GameScoreService
     */
    async checkAndUpdateGameStatus(gameId: string): Promise<{
        result: GameResult;
        reason: string;
        isGameOver: boolean;
    } | null> {
        return await this.gameScoreService.checkAndUpdateGameStatus(gameId);
    }


    /**
     * 推进回合和阶段
     * 委托给 GamePhaseService
     * @param gameId 游戏ID
     * @param characterIdentifier 执行动作的角色标识符
     * @param ctx Convex context（用于调用 internal mutation）
     * @returns 阶段变化信息
     */
    async advanceTurnAndRound(gameId: string, characterIdentifier: CharacterIdentifier, ctx?: any): Promise<PhaseChanges> {
        return await this.gamePhaseService.advanceTurnAndRound(gameId, characterIdentifier, ctx);
    }

    /**
     * 仿真专用：当前回合轮到 Boss 侧时执行 Boss AI 并标记该 turn 完成（与线上 phase 流程一致）。
     */
    async runSimulatorBossTurn(gameId: string): Promise<void> {
        await this.gamePhaseService.resolveSimulatorBossTurn(gameId, this.ctx);
    }

    async ensureSimulatorRoundProgress(gameId: string): Promise<void> {
        await this.gamePhaseService.ensureSimulatorRoundProgress(gameId, this.ctx);
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
    async surrender(gameId: string): Promise<{
        ok: boolean;
        message?: string;
    }> {

        // 获取数据库中的游戏记录（用于状态检查和更新）
        const gameDoc = await this.dbCtx.db
            .query("mr_games")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
            .first();

        if (!gameDoc) {
            throw new Error("游戏不存在");
        }
        // 2. 更新游戏状态为 3 (game over)
        await this.dbCtx.db.patch(gameDoc._id, {
            status: 3,
            lastUpdate: new Date().toISOString(),
        });

        return { ok: true };
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
        console.log("createGame params", uid, gameId, ruleId, stageId);
        const gameManager = new GameService(ctx);
        const result = await gameManager.createGame(uid, gameId, ruleId, stageId);

        // 返回格式：{ ok: true, data: game, phaseChanges?: PhaseChanges }
        if (result.game) {
            return { ok: true, data: result.game, phaseChanges: result.phaseChanges };
        }
        return { ok: false };
    },
});

export const loadGame = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        console.log("loading game", gameId);
        const gameManager = new GameService(ctx);
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
        const gameManager = new GameService(ctx);
        const game = await gameManager.load(gameId);
        return game;
    },
});

export const findReport = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new GameService(ctx);
        const game = await gameManager.load(gameId);

        if (!game) {
            return { ok: false };
        }

        const st = (game as { status?: number }).status;
        const gr: GameResult | null =
            st === 1 ? GameResult.WIN : st === 2 ? GameResult.LOSE : st === 3 ? GameResult.DRAW : null;
        const recomputed = gr != null ? buildEndGameScoreResult(game as any, gr) : null;
        const persisted = (game as { score?: number }).score;
        const totalScore =
            gr != null
                ? (typeof persisted === "number" ? persisted : (recomputed?.totalScore ?? 0))
                : (persisted ?? 0);

        return {
            ok: true,
            data: {
                gameId,
                totalScore,
                roundBonus: recomputed?.roundBonus,
                survivalBonus: recomputed?.survivalBonus,
                resultScore: recomputed?.resultScore,
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
        const gameManager = new GameService(ctx);
        const result = await gameManager.updateScore(gameId, scoreDelta);
        return { ok: result };
    },
});

export const getGame = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new GameService(ctx);
        return await gameManager.load(gameId);
    },
});

export const getGameStatus = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new GameService(ctx);
        const game = await gameManager.load(gameId);
        return { status: game?.status ?? -1 };
    },
});

export const walk = mutation({
    args: {
        gameId: v.string(),
        to: v.object({ q: v.number(), r: v.number() }),
        identifier: v.object({
            monsterId: v.optional(v.string()),
            bossId: v.optional(v.string()),
            minionId: v.optional(v.string()),
        }),
        endTurn: v.optional(v.boolean()),
        steps: v.optional(v.number()),
        forceEndTurn: v.optional(v.boolean()),
    },
    handler: async (ctx, { gameId, to, identifier, endTurn, steps, forceEndTurn }) => {
        // console.log("walk", gameId, identifier, to, endTurn ?? "(auto)", steps ?? "(auto)", forceEndTurn ?? false);
        const gameManager = new GameService(ctx);
        await gameManager.load(gameId);
        try {
            const options =
                endTurn !== undefined || steps !== undefined || forceEndTurn !== undefined
                    ? { endTurn, steps, forceEndTurn }
                    : undefined;
            const result = await gameManager.walk(gameId, to, identifier, options);
            return {
                ok: true,
                success: result.success,
                phaseChanges: result.phaseChanges,
                endTurn: result.endTurn,
                ...(result.success === false && result.message && { message: result.message }),
            };
        } catch (error) {
            console.error("walk error", error);
            return {
                ok: false,
                error: error instanceof Error ? error.message : "未知错误",
            };
        }

    },
});

export const walkAndAttack = mutation({
    args: {
        gameId: v.string(),
        to: v.object({ q: v.number(), r: v.number() }),
        steps: v.number(),
        identifier: v.object({
            monsterId: v.optional(v.string()),
            bossId: v.optional(v.string()),
            minionId: v.optional(v.string()),
        }),
        skillId: v.string(),
        targets: v.optional(
            v.array(
                v.object({
                    monsterId: v.optional(v.string()),
                    bossId: v.optional(v.string()),
                    minionId: v.optional(v.string()),
                })
            )
        ),
    },
    handler: async (ctx, { gameId, to, steps, identifier, skillId, targets }) => {
        const gameManager = new GameService(ctx);
        try {
            const result = await gameManager.walkAndAttack(gameId, {
                to,
                steps,
                identifier,
                skillId,
                targets,
            });
            if (result.success) {
                return {
                    ok: true,
                    success: true,
                    phaseChanges: result.phaseChanges,
                    effects: result.effects,
                };
            }
            return {
                ok: false,
                error: result.message ?? "移动或攻击失败",
            };
        } catch (error) {
            console.error("walkAndAttack error", error);
            return {
                ok: false,
                error: error instanceof Error ? error.message : "未知错误",
            };
        }
    },
});

export const attack = mutation({
    args: {
        gameId: v.string(),
        data: v.object({
            attacker: v.object({
                monsterId: v.optional(v.string()),
                bossId: v.optional(v.string()),
                minionId: v.optional(v.string()),
            }),
            skillSelect: v.optional(v.string()),  // 技能ID（可选，如果提供则使用技能攻击）
            targets: v.array(  // 支持多目标攻击
                v.object({
                    monsterId: v.optional(v.string()),
                    bossId: v.optional(v.string()),
                    minionId: v.optional(v.string()),
                })
            ),
        }),
    },
    handler: async (ctx, { gameId, data }) => {
        console.log("attack", gameId, data);
        const gameManager = new GameService(ctx);
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
        const gameManager = new GameService(ctx);
        await gameManager.load(gameId);
        const result = await gameManager.selectSkill(gameId, data);
        if (result.success) {
            return { ok: true };
        }
        return { ok: false, error: result.message || "选择技能失败" };
    },
});

export const useSkill = mutation({
    args: {
        gameId: v.string(),
        data: v.object({
            monsterId: v.optional(v.string()),
            bossId: v.optional(v.string()),
            minionId: v.optional(v.string()),
            skillId: v.string(),
            targets: v.optional(
                v.array(
                    v.object({
                        monsterId: v.optional(v.string()),
                        bossId: v.optional(v.string()),
                        minionId: v.optional(v.string()),
                    })
                )
            ),
        }),
    },
    handler: async (ctx, { gameId, data }) => {
        console.log("useSkill", gameId, data);
        const gameManager = new GameService(ctx);
        const result = await gameManager.useSkill(gameId, data);
        if (result.success) {
            return { ok: true, data: result };
        } else {
            return { ok: false, error: result.message || "技能使用失败" };
        }
    },
});

export const defend = mutation({
    args: {
        gameId: v.string(),
        identifier: v.object({
            monsterId: v.optional(v.string()),
            bossId: v.optional(v.string()),
            minionId: v.optional(v.string()),
        }),
    },
    handler: async (ctx, { gameId, identifier }) => {
        const gameManager = new GameService(ctx);
        await gameManager.load(gameId);
        const result = await gameManager.defend(gameId, identifier);
        if (result.success) {
            return { ok: true, phaseChanges: result.phaseChanges };
        }
        return { ok: false, error: result.message ?? "防守失败" };
    },
});

export const standby = mutation({
    args: {
        gameId: v.string(),
        identifier: v.object({
            monsterId: v.optional(v.string()),
            bossId: v.optional(v.string()),
            minionId: v.optional(v.string()),
        }),
    },
    handler: async (ctx, { gameId, identifier }) => {
        const gameManager = new GameService(ctx);
        await gameManager.load(gameId);
        const result = await gameManager.standby(gameId, identifier);
        if (result.success) {
            return { ok: true, phaseChanges: result.phaseChanges };
        }
        return { ok: false, error: result.message ?? "结束回合失败" };
    },
});

export const startNewRound = mutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new GameService(ctx);
        await gameManager.load(gameId);
        return await gameManager.startNewRound(gameId);
    },
});

export const endRound = mutation({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const gameManager = new GameService(ctx);
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
 * 查询所有事件（用于重播）
 */
export const findAllEvents = query({
    args: { gameId: v.string() },
    handler: async (ctx, { gameId }) => {
        const events = await ctx.db
            .query("mr_game_event")
            .withIndex("by_game", (q: any) => q.eq("gameId", gameId))
            .collect();

        // 按时间排序
        const sortedEvents = events.sort((a: any, b: any) => a.time - b.time);

        return sortedEvents.map((e: any) => ({
            gameId: e.gameId,
            name: e.name,
            type: e.type,
            data: e.data,
            time: e.time,
            _id: e._id,
            _creationTime: e._creationTime,
        }));
    },
});

/**
 * 游戏结束
 * 处理游戏结束流程（阶段2：所有玩家完成或超时后）
 */
export const surrender = mutation({
    args: {
        gameId: v.string(),
    },
    handler: async (ctx, args) => {
        return { ok: true };
        //     const gameManager = new GameService(ctx);
        //     return await gameManager.surrender(args.gameId);
        // },
    }
});


export default GameService;

