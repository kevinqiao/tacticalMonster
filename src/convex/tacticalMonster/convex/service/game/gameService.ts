import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../../_generated/server";
import { calculateBossPower, getBossConfig, getMergedBossConfig } from "../../data/bossConfigs";
import { MONSTER_CONFIGS_MAP } from "../../data/monsterConfigs";
import { DEFAULT_SCORING_CONFIG_VERSION } from "../../data/scoringConfigs";
import { getSkillConfig, skillExists } from "../../data/skillConfigs";
import { calculateGameMonster, GameBoss, GameMinion, GameMonster, PlayerMonster } from "../../types/monsterTypes";
import { HexCoord, hexDistance } from "../../utils/hexUtils";
import { SkillManager } from "../skill/skillManager";
import { TeamService } from "../team/teamService";
import { CharacterEnricher } from "./characterEnricher";
import { CharacterPositionService } from "./characterPositionService";
import { CharacterUpdateService } from "./characterUpdateService";
import { CharacterGetter, GameActionValidator } from "./gameActionValidator";
import { GameEventService } from "./gameEventService";
import { RoundService } from "./roundService";
import { GameResult, sharedScoreService } from "./sharedScoreService";

/**
 * 游戏状态枚举
 * 0: waiting - 等待中
 * 1: won - 胜利
 * 2: lost - 失败
 * 3: game over - 游戏结束
 */
export type GameStatus = 0 | 1 | 2 | 3;

/**
 * GameModel - 游戏模型（运行时数据结构）
 * 对应数据库表 mr_games，包含完整的游戏状态信息
 */
export interface GameModel {
    // ========== 基础标识 ==========
    gameId: string;
    matchId?: string;
    stageId: string;
    uid: string;  // 玩家 UID

    // ========== 队伍和Boss数据 ==========
    teamPower: number;
    team: GameMonster[];  // 玩家队伍（使用 GameMonster 类型）
    boss: GameBoss;  // Boss数据（使用 GameBoss 类型）

    // ========== 地图数据 ==========
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

    // ========== 游戏状态和分数 ==========
    status: GameStatus;  // 游戏状态：0: waiting, 1: won, 2: lost, 3: game over
    score: number;
    scoringConfigVersion?: string;  // ✅ 计分配置版本号
    lastUpdate: string;  // ISO 字符串格式
    createdAt: string;  // ISO 字符串格式

    // ========== 运行时字段（不在数据库中，但用于代码逻辑）==========
    round?: number;  // 当前回合数
}

/**
 * GameReport - 游戏报告
 * 包含游戏结束后的分数统计信息
 */
export interface GameReport {
    gameId: string;
    baseScore: number;
    timeBonus?: number;
    completeBonus?: number;
    totalScore: number;
}

/**
 * CombatTurn - 战斗回合
 * 表示一个战斗回合中的行动信息
 */
export interface CombatTurn {
    uid: string;
    monsterId: string;
    skills?: string[];
    skillSelect?: string;
    status: number;  // 回合状态：0: pending, 1: in_progress, 2: completed
    startTime?: number;
    endTime?: number;
}

/**
 * CharacterIdentifier - 角色标识符
 * 用于唯一标识一个角色，三个字段中只有一个存在
 */
export interface CharacterIdentifier {
    monsterId?: string;  // 玩家角色的monsterId
    bossId?: string;     // Boss主体的bossId
    minionId?: string;   // 小怪的minionId
}

/**
 * CombatEvent - 战斗事件
 * 记录战斗过程中发生的各种事件
 */
export interface CombatEvent {
    gameId: string;
    name: string;
    type?: number;  // 事件类型：0: round, 1: movement, 2: attack, etc.
    data?: any;
    time: number;
}

/**
 * TacticalMonsterGameManager - 战术怪物游戏管理器
 * 负责游戏的创建、加载、保存和状态管理
 */
export class TacticalMonsterGameManager implements CharacterGetter {
    private dbCtx: any;
    private game: GameModel | null;
    private validator: GameActionValidator | null = null;
    private eventService: GameEventService;
    private positionService: CharacterPositionService;
    private roundService: RoundService;
    private characterUpdateService: CharacterUpdateService;

    constructor(dbCtx: any) {
        this.dbCtx = dbCtx;
        this.game = null;
        this.eventService = new GameEventService(dbCtx);
        this.positionService = new CharacterPositionService(dbCtx);
        this.roundService = new RoundService(dbCtx);
        this.characterUpdateService = new CharacterUpdateService(dbCtx);
    }

    /**
     * 获取验证器实例（延迟初始化）
     */
    private getValidator(): GameActionValidator {
        if (!this.validator) {
            this.validator = new GameActionValidator(this.dbCtx, this.game, this);
        } else {
            // 更新游戏状态引用
            (this.validator as any).game = this.game;
        }
        return this.validator;
    }


    /**
     * 辅助方法：根据标识符获取 GameMonster
     * 
     * 查找规则：
     * - 如果提供了 monsterId：查找玩家角色（玩家队伍中的monster不会重复）
     * - 如果提供了 bossId：查找Boss主体
     * - 如果提供了 minionId：查找小怪（小怪的monsterId可能重复，必须使用minionId）
     * 
     * 注意：三个参数每次只有一个存在，用来区分角色类型
     * 
     * @param monsterId 玩家角色的monsterId（可选）
     * @param bossId Boss的bossId（可选）
     * @param minionId 小怪的minionId（可选）
     * @returns GameMonster 或 null
     */
    getCharacter(
        monsterId?: string,
        bossId?: string,
        minionId?: string
    ): GameMonster | null {
        if (!this.game) return null;

        // 检查参数：应该只有一个存在
        const paramCount = [monsterId, bossId, minionId].filter(Boolean).length;
        if (paramCount !== 1) {
            return null;  // 参数错误：应该只有一个标识符
        }

        if (bossId) {
            // Boss主体：使用 bossId 定位
            if (bossId === this.game.boss.bossId) {
                return CharacterEnricher.enrichBossAsGameMonster(this.game.boss);
            }
            return null;
        } else if (minionId) {
            // 小怪：使用 minionId 定位（小怪的monsterId可能重复）
            const minion = this.game.boss.minions.find((m) => m.minionId === minionId);
            return minion ? CharacterEnricher.enrichMinionAsGameMonster(minion) : null;
        } else if (monsterId) {
            // 玩家角色：使用 monsterId 定位（玩家队伍中的monster不会重复）
            return this.game.team.find((m) => m.monsterId === monsterId) || null;
        }

        return null;
    }

    /**
     * 辅助方法：从 { uid, monsterId } 格式转换为 getCharacter 的参数
     * 用于兼容现有的接口格式
     * 
     * 转换规则：
     * - uid !== "boss": monsterId（玩家角色）
     * - uid === "boss": 根据 monsterId 是否等于 boss.bossId 判断是Boss主体还是小怪
     *   - 如果等于 boss.bossId: bossId
     *   - 否则: minionId
     * 
     * @param uid 角色UID（玩家UID或"boss"）
     * @param monsterId 标识符（根据uid不同，实际含义不同）
     * @returns getCharacter 的参数对象
     */
    private getCharacterParams(uid: string, monsterId: string): {
        monsterId?: string;
        bossId?: string;
        minionId?: string;
    } {
        if (uid === "boss") {
            // 判断是Boss主体还是小怪
            // 优先检查是否匹配Boss的bossId
            if (this.game && this.game.boss && monsterId === this.game.boss.bossId) {
                return { bossId: monsterId };
            } else {
                // 否则认为是小怪的minionId
                return { minionId: monsterId };
            }
        } else {
            // 玩家角色：使用monsterId
            return { monsterId };
        }
    }

    /**
     * 辅助方法：获取所有可攻击的角色（玩家队伍 + Boss + 小怪）
     * @returns 所有角色的数组
     */
    getAllCharacters(): GameMonster[] {
        if (!this.game) return [];

        const allCharacters: GameMonster[] = [];

        // 添加玩家队伍
        allCharacters.push(...this.game.team);

        // 添加Boss本体
        const bossMonster = CharacterEnricher.enrichBossAsGameMonster(this.game.boss);
        if (bossMonster) {
            allCharacters.push(bossMonster);
        }

        // 添加小怪
        for (const minion of this.game.boss.minions) {
            const minionMonster = CharacterEnricher.enrichMinionAsGameMonster(minion);
            if (minionMonster) {
                allCharacters.push(minionMonster);
            }
        }

        return allCharacters;
    }

    /**
     * 辅助方法：根据技能范围和类型自动计算目标
     * @param caster 施法者
     * @param skillId 技能ID
     * @param primaryTarget 主要目标（可选，用于 single 和 line 类型）
     * @returns 目标角色数组
     */
    private calculateTargetsBySkillRange(
        caster: GameMonster,
        skillId: string,
        primaryTarget?: { uid: string; monsterId: string }
    ): Array<{ uid: string; monsterId: string }> {
        if (!this.game) return [];

        // 获取技能配置
        if (!skillExists(skillId)) {
            return primaryTarget ? [primaryTarget] : [];
        }

        const skill = getSkillConfig(skillId);
        if (!skill || !skill.range) {
            // 如果没有范围配置，返回主要目标或空数组
            return primaryTarget ? [primaryTarget] : [];
        }

        const range = skill.range;
        const casterPos: HexCoord = {
            q: caster.q ?? 0,
            r: caster.r ?? 0,
        };

        // 获取所有可攻击的角色
        const allCharacters = this.getAllCharacters();
        const targets: Array<{ uid: string; monsterId: string }> = [];

        // 辅助函数：获取角色的标识符（用于targets数组）
        const getCharacterIdentifier = (char: GameMonster): string => {
            if (char.uid === "boss") {
                // Boss主体：返回bossId
                if ((char as GameBoss).bossId) {
                    return (char as GameBoss).bossId;
                }
                // 小怪：返回minionId
                if ((char as GameMinion).minionId) {
                    return (char as GameMinion).minionId;
                }
            }
            // 玩家角色：返回monsterId
            return char.monsterId;
        };

        // 辅助函数：检查是否是同一个角色
        const isSameCharacter = (char1: GameMonster, char2: GameMonster): boolean => {
            if (char1.uid !== char2.uid) return false;

            if (char1.uid === "boss") {
                // Boss主体：比较bossId
                const char1BossId = (char1 as GameBoss).bossId;
                const char2BossId = (char2 as GameBoss).bossId;
                if (char1BossId && char2BossId) {
                    return char1BossId === char2BossId;
                }
                // 小怪：比较minionId（小怪的monsterId可能重复，必须使用minionId）
                const char1MinionId = (char1 as GameMinion).minionId;
                const char2MinionId = (char2 as GameMinion).minionId;
                if (char1MinionId && char2MinionId) {
                    return char1MinionId === char2MinionId;
                }
                // 如果一个是Boss主体一个是小怪，它们肯定不同
                if ((char1BossId && char2MinionId) || (char1MinionId && char2BossId)) {
                    return false;
                }
                // 向后兼容：如果都没有bossId/minionId，回退到monsterId比较
                return char1.monsterId === char2.monsterId;
            }

            // 玩家角色：比较monsterId（玩家队伍中的monster不会重复）
            return char1.monsterId === char2.monsterId;
        };

        switch (range.area_type) {
            case "single":
                // 单体目标：需要提供主要目标
                if (primaryTarget) {
                    const distance = range.distance ?? 999;
                    const targetParams = this.getCharacterParams(primaryTarget.uid, primaryTarget.monsterId);
                    const targetChar = this.getCharacter(targetParams.monsterId, targetParams.bossId, targetParams.minionId);
                    if (targetChar) {
                        const targetPos: HexCoord = {
                            q: targetChar.q ?? 0,
                            r: targetChar.r ?? 0,
                        };
                        if (hexDistance(casterPos, targetPos) <= distance) {
                            targets.push(primaryTarget);
                        }
                    }
                }
                break;

            case "circle":
                // 圆形范围：以施法者为中心
                const circleRadius = range.max_distance ?? range.distance ?? 1;
                for (const char of allCharacters) {
                    // 排除自己（除非是BUFF技能）
                    if (isSameCharacter(char, caster)) {
                        continue;
                    }

                    const charPos: HexCoord = {
                        q: char.q ?? 0,
                        r: char.r ?? 0,
                    };
                    if (hexDistance(casterPos, charPos) <= circleRadius) {
                        targets.push({
                            uid: char.uid,
                            monsterId: getCharacterIdentifier(char),  // 使用正确的标识符
                        });
                    }
                }
                break;

            case "line":
                // 直线范围：需要提供主要目标来确定方向
                if (primaryTarget) {
                    const lineDistance = range.distance ?? range.max_distance ?? 999;
                    const primaryTargetParams = this.getCharacterParams(primaryTarget.uid, primaryTarget.monsterId);
                    const primaryTargetChar = this.getCharacter(primaryTargetParams.monsterId, primaryTargetParams.bossId, primaryTargetParams.minionId);
                    if (!primaryTargetChar) break;

                    const primaryTargetPos: HexCoord = {
                        q: primaryTargetChar.q ?? 0,
                        r: primaryTargetChar.r ?? 0,
                    };

                    // 计算方向向量（简化实现：获取从施法者到主要目标方向上的所有角色）
                    for (const char of allCharacters) {
                        const charPos: HexCoord = {
                            q: char.q ?? 0,
                            r: char.r ?? 0,
                        };

                        // 检查是否在直线上（简化：检查是否在从施法者到主要目标的路径上）
                        const distToCaster = hexDistance(casterPos, charPos);
                        const distToPrimary = hexDistance(primaryTargetPos, charPos);
                        const distCasterToPrimary = hexDistance(casterPos, primaryTargetPos);

                        // 如果角色在从施法者到主要目标的路径上，且在范围内
                        if (distToCaster <= lineDistance && distToCaster + distToPrimary <= distCasterToPrimary + 1) {
                            targets.push({
                                uid: char.uid,
                                monsterId: getCharacterIdentifier(char),  // 使用正确的标识符
                            });
                        }
                    }
                }
                break;

            default:
                // 默认：返回主要目标
                if (primaryTarget) {
                    targets.push(primaryTarget);
                }
                break;
        }

        return targets;
    }



    /**
     * 加载游戏数据
     * 从数据库读取游戏记录并转换为 GameModel
     * @param gameId 游戏ID
     * @returns GameModel 或 null（如果游戏不存在）
     */
    async load(gameId: string): Promise<GameModel | null> {
        // 查询 mr_games 表
        const game = await this.dbCtx.db
            .query("mr_games")
            .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
            .first();

        if (!game) return null;

        // 获取当前回合数
        const roundNumber = (game as any).round || 0;

        // 从数据库读取 GameMonster 数组（统一使用stats，与GameBoss保持一致）
        const team: GameMonster[] = await Promise.all(
            (game.team || []).map(async (teamMember: any) => {
                // 获取怪物配置（用于补充配置字段）
                const monsterConfig = MONSTER_CONFIGS_MAP[teamMember.monsterId];
                if (!monsterConfig) {
                    throw new Error(`怪物配置不存在: ${teamMember.monsterId}`);
                }

                // 如果数据库中有完整的 stats 数据，直接使用
                if (teamMember.stats) {
                    // 确保 attack_range 类型正确（应该是 { min: number; max: number }）
                    let attackRange: { min: number; max: number } | undefined;
                    if (teamMember.attack_range) {
                        if (typeof teamMember.attack_range === 'object' && 'min' in teamMember.attack_range && 'max' in teamMember.attack_range) {
                            attackRange = teamMember.attack_range;
                        } else {
                            // 向后兼容：如果是数字，转换为对象
                            const range = typeof teamMember.attack_range === 'number' ? teamMember.attack_range : 2;
                            attackRange = { min: 1, max: range };
                        }
                    } else {
                        // 使用配置中的默认值
                        attackRange = monsterConfig.attackRange ?? { min: 1, max: 2 };
                    }

                    return {
                        // 基础标识
                        uid: teamMember.uid || game.uid,
                        monsterId: teamMember.monsterId,
                        // 从 Monster 配置组合的字段（从配置文件读取）
                        name: monsterConfig.name,
                        rarity: monsterConfig.rarity,
                        class: monsterConfig.class,
                        race: monsterConfig.race,
                        assetPath: monsterConfig.assetPath,
                        // 从数据库读取的字段
                        level: teamMember.level,
                        stars: teamMember.stars,
                        // 位置信息
                        q: teamMember.q,
                        r: teamMember.r,
                        // 运行时状态（从数据库读取）
                        stats: teamMember.stats,
                        statusEffects: teamMember.statusEffects || [],
                        skillCooldowns: teamMember.skillCooldowns || {},
                        status: teamMember.status || 'normal',  // 确保类型正确：'normal' | 'stunned' | 'dead'
                        move_range: teamMember.move_range ?? monsterConfig.moveRange ?? 3,
                        attack_range: attackRange,
                        // 特殊属性（从配置推断）
                        isFlying: monsterConfig.race === "Flying",
                        flightHeight: monsterConfig.race === "Flying" ? 1.5 : undefined,
                        canIgnoreObstacles: monsterConfig.race === "Flying",
                    } as GameMonster;
                }

                // 向后兼容：如果没有 stats，从简化数据重建
                const playerMonster: PlayerMonster = {
                    uid: game.uid,
                    monsterId: teamMember.monsterId,
                    level: teamMember.level,
                    stars: teamMember.stars,
                    experience: 0,
                    shards: 0,
                    isUnlocked: true,
                    unlockedSkills: [],
                    inTeam: 1,
                    teamPosition: { q: teamMember.q ?? 0, r: teamMember.r ?? 0 },
                    obtainedAt: "",
                    updatedAt: "",
                };

                const gameMonster = calculateGameMonster(
                    playerMonster,
                    monsterConfig,
                    { q: teamMember.q ?? 0, r: teamMember.r ?? 0 }
                );

                // 恢复当前 HP（从数据库读取的值）
                if (teamMember.hp !== undefined && gameMonster.stats.hp) {
                    gameMonster.stats.hp.current = teamMember.hp;
                }

                return gameMonster;
            })
        );

        // 从数据库读取 GameBoss 对象（统一使用stats）
        // 注意：GameBoss 继承 GameMonster，需要包含所有必需字段
        const bossMonsterConfig = game.boss?.monsterId ? MONSTER_CONFIGS_MAP[game.boss.monsterId] : null;
        const bossQ = game.boss?.q ?? game.boss?.position?.q ?? 0;
        const bossR = game.boss?.r ?? game.boss?.position?.r ?? 0;

        const bossData: GameBoss = game.boss ? {
            bossId: game.boss.bossId || game.boss.monsterId || "",  // 向后兼容：如果没有bossId，使用monsterId
            monsterId: game.boss.monsterId || "",
            uid: "boss",
            name: bossMonsterConfig?.name || game.boss.monsterId || "",
            rarity: bossMonsterConfig?.rarity || "Common",
            assetPath: bossMonsterConfig?.assetPath || "",
            level: 1,
            stars: 1,
            q: bossQ,
            r: bossR,
            minions: (game.boss.minions || []).map((minion: any): GameMinion => {
                const minionStats = minion.stats || {
                    hp: { current: 0, max: 0 },
                    attack: 0,
                    defense: 0,
                    speed: 0,
                };
                const minionConfig = minion.monsterId ? MONSTER_CONFIGS_MAP[minion.monsterId] : null;
                const minionQ = minion.q ?? minion.position?.q ?? 0;
                const minionR = minion.r ?? minion.position?.r ?? 0;
                return {
                    minionId: minion.minionId || minion.monsterId || "",  // 向后兼容：如果没有minionId，使用monsterId
                    monsterId: minion.monsterId,
                    uid: "boss",
                    name: minionConfig?.name || minion.monsterId || "",
                    rarity: minionConfig?.rarity || "Common",
                    assetPath: minionConfig?.assetPath || "",
                    level: 1,
                    stars: 1,
                    q: minionQ,
                    r: minionR,
                    stats: minionStats,
                    statusEffects: minion.statusEffects || [],
                    skillCooldowns: minion.skillCooldowns || minion.cooldowns || {},
                };
            }),
            // 运行时字段（必需：统一使用stats）
            stats: game.boss.stats,
            statusEffects: game.boss.statusEffects || [],
            skillCooldowns: game.boss.skillCooldowns || game.boss.cooldowns || {},
            skills: game.boss.skills || [],
            currentPhase: game.boss.currentPhase || "phase1",
            behaviorSeed: game.boss.behaviorSeed,
        } : {
            bossId: "",
            monsterId: "",
            uid: "boss",
            name: "",
            rarity: "Common",
            assetPath: "",
            level: 1,
            stars: 1,
            q: 0,
            r: 0,
            minions: [],
            // 必需：stats字段用于计算血量百分比
            stats: {
                hp: { current: 0, max: 0 },
                attack: 0,
                defense: 0,
                speed: 0,
            },
        };

        // 构建 GameModel（符合 mr_games 表结构）
        this.game = {
            gameId: game.gameId,
            matchId: game.matchId,
            stageId: game.stageId,
            uid: game.uid,
            teamPower: game.teamPower,
            team: team,  // 使用重建的 GameMonster 数组
            boss: bossData,  // 使用重建的 GameBoss 对象
            map: game.map,
            status: game.status,
            score: game.score,
            scoringConfigVersion: game.scoringConfigVersion,  // ✅ 加载配置版本
            lastUpdate: game.lastUpdate,
            createdAt: game.createdAt,
            round: roundNumber,
        };

        // 更新验证器的游戏状态引用
        if (this.validator) {
            (this.validator as any).game = this.game;
        }

        return this.game;
    }

    /**
     * 保存游戏数据
     * 更新游戏的部分字段到数据库
     * @param data 要更新的字段
     */
    async save(data: {
        round?: number;
        status?: GameStatus;
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

    /**
     * 创建新游戏
     * 根据玩家队伍和关卡配置创建完整的游戏实例
     * @param uid 玩家UID
     * @param gameId 游戏ID
     * @param ruleId 规则ID
     * @param stageId 关卡ID
     * @returns GameModel 或 null（如果创建失败）
     */
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

        // 2. 根据 stageId 获取数据库 mr_stage 的 stage 数据
        const stage = await this.dbCtx.db
            .query("mr_stage")
            .withIndex("by_stageId", (q: any) => q.eq("stageId", stageId))
            .first();

        if (!stage) {
            throw new Error(`Stage 不存在: ${stageId}`);
        }

        // 3. 计算每个 monster 的完整 GameMonster 数据和 teamPower
        let totalTeamPower = 0;
        const team: GameMonster[] = await Promise.all(
            playerTeamMonsters.map(async (playerMonster: any) => {
                // 获取怪物配置（从配置文件读取）
                const monsterConfig = MONSTER_CONFIGS_MAP[playerMonster.monsterId];

                if (!monsterConfig) {
                    throw new Error(`怪物配置不存在: ${playerMonster.monsterId}`);
                }

                // 使用 calculateGameMonster 构建完整的 GameMonster
                const gameMonster = calculateGameMonster(
                    playerMonster as PlayerMonster,
                    monsterConfig,
                    playerMonster.teamPosition || { q: 0, r: 0 }
                );

                // 计算 Power: (HP + Attack * 2 + Defense * 1.5) * StarMultiplier
                const basePower = gameMonster.stats.hp.max +
                    gameMonster.stats.attack * 2 +
                    gameMonster.stats.defense * 1.5;
                const monsterPower = Math.floor(basePower);
                totalTeamPower += monsterPower;

                return gameMonster;
            })
        );

        // 4. 获取 Boss 配置
        const bossConfig = getBossConfig(stage.bossId);
        if (!bossConfig) {
            throw new Error(`Boss配置不存在: ${stage.bossId}`);
        }

        // 5. 使用计算出的 teamPower（用于 Boss 缩放）
        const teamPower = totalTeamPower;

        // 6. 根据 stage.difficulty 自适应 Boss 的属性
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
                        // 从配置文件获取基础属性
                        const minionMonsterConfig = MONSTER_CONFIGS_MAP[minion.monsterId];

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

                    const minionPosition = positions[i] || { q: 0, r: 0 };
                    const minionMonsterConfig = MONSTER_CONFIGS_MAP[minion.monsterId];
                    const minionData: GameMinion = {
                        minionId: minion.minionId,  // 小怪配置ID
                        monsterId: minion.monsterId,  // 角色配置ID（引用 monsterConfigs.ts）
                        uid: "boss",
                        name: minionMonsterConfig?.name || minion.monsterId || "",
                        rarity: minionMonsterConfig?.rarity || "Common",
                        assetPath: minionMonsterConfig?.assetPath || "",
                        level: 1,
                        stars: 1,
                        q: minionPosition.q,
                        r: minionPosition.r,
                        // 必需：stats 字段（统一使用stats）
                        stats: {
                            hp: {
                                current: minionScaledStats.hp,
                                max: minionScaledStats.hp,
                            },
                            attack: minionScaledStats.attack,
                            defense: minionScaledStats.defense,
                            speed: minionScaledStats.speed,
                        },
                    };
                    return minionData;
                });
            })
        );

        // 获取Boss技能列表（从mergedBossConfig）
        const bossSkills = mergedBossConfig.skills?.map((s: any) => s.skillId || s.id) || [];

        // 获取Boss配置（用于填充GameMonster必需字段）
        // bossConfig.monsterId 是角色配置ID（引用 monsterConfigs.ts）
        const bossMonsterConfigForCreate = MONSTER_CONFIGS_MAP[bossConfig.monsterId];

        // 构建完整的Boss数据（统一使用stats）
        const bossData: GameBoss = {
            bossId: stage.bossId,  // Boss配置ID（如 "boss_bronze_1"）
            monsterId: bossConfig.monsterId,  // 角色配置ID（引用 monsterConfigs.ts）
            uid: "boss",
            name: bossMonsterConfigForCreate?.name || bossConfig.monsterId || "",
            rarity: bossMonsterConfigForCreate?.rarity || "Common",
            assetPath: bossMonsterConfigForCreate?.assetPath || "",
            level: 1,
            stars: 1,
            q: bossMainPosition.q,
            r: bossMainPosition.r,
            minions: minionsData,
            // 实时战斗状态（统一使用stats）
            stats: {
                hp: {
                    current: scaledBossStats.hp,
                    max: scaledBossStats.hp,
                },
                attack: scaledBossStats.attack,
                defense: scaledBossStats.defense,
                speed: scaledBossStats.speed,
            },
            statusEffects: [],
            skillCooldowns: {},
            skills: bossSkills,
            currentPhase: "phase1",  // 默认第一阶段
            behaviorSeed: stage.seed || `game_${gameId}`,
        };

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

        // 10. 创建 mr_games 记录（兼容现有 schema：从stats提取基础字段）
        const now = new Date().toISOString();
        await this.dbCtx.db.insert("mr_games", {
            uid,
            teamPower,
            team: team.map((gm: GameMonster) => ({
                // 基础标识
                uid: gm.uid,
                monsterId: gm.monsterId,
                // 从 PlayerMonster 组合的字段
                level: gm.level,
                stars: gm.stars,
                // 位置信息
                q: gm.q,
                r: gm.r,
                // 运行时状态（统一使用stats）
                stats: gm.stats,
                statusEffects: gm.statusEffects || [],
                skillCooldowns: gm.skillCooldowns || {},
                status: gm.status || 'normal',
                move_range: gm.move_range,
                attack_range: gm.attack_range,
            })),
            boss: {
                // 统一使用stats和GameMonster格式
                bossId: bossData.bossId,  // Boss配置ID
                monsterId: bossData.monsterId,  // 角色配置ID
                q: bossData.q,
                r: bossData.r,
                minions: bossData.minions.map((minion: GameMinion) => ({
                    minionId: minion.minionId,  // 小怪配置ID
                    monsterId: minion.monsterId,  // 角色配置ID
                    q: minion.q,
                    r: minion.r,
                    stats: minion.stats,
                    statusEffects: minion.statusEffects || [],
                    skillCooldowns: minion.skillCooldowns || {},
                })),
                stats: bossData.stats,
                statusEffects: bossData.statusEffects || [],
                skillCooldowns: bossData.skillCooldowns || {},
                skills: bossData.skills || [],
                currentPhase: bossData.currentPhase || "phase1",
                behaviorSeed: bossData.behaviorSeed,
            },
            map: mapForGame,
            stageId,
            ruleId,
            gameId,
            status: 0,  // 0: waiting
            score: 0,
            scoringConfigVersion: DEFAULT_SCORING_CONFIG_VERSION,  // ✅ 记录配置版本
            lastUpdate: now,
            createdAt: now,
            bossCurrentPhase: "phase1",
        });

        // 11. 构建并返回 GameModel（包含完整的 GameMonster 数组）
        this.game = {
            gameId,
            stageId,
            uid,
            teamPower,
            scoringConfigVersion: DEFAULT_SCORING_CONFIG_VERSION,  // ✅ 设置配置版本
            team: team,  // 完整的 GameMonster 数组
            boss: bossData,
            map: mapForGame,
            status: 0,
            score: 0,
            lastUpdate: now,
            createdAt: now,
            round: 0,
        };

        // 12. 创建 gameInit 事件（包含完整初始状态，用于重播）
        await this.eventService.createEvent({
            gameId: this.game.gameId,
            name: "gameInit",
            type: 0,
            data: {
                // 包含完整的初始状态
                gameId: this.game.gameId,
                matchId: this.game.matchId,
                stageId: this.game.stageId,
                uid: this.game.uid,
                teamPower: this.game.teamPower,
                team: this.game.team.map(m => ({
                    ...m,
                    // 确保包含所有字段
                })),
                boss: {
                    ...this.game.boss,
                    // 确保包含所有字段
                },
                map: this.game.map,
                status: 0,
                score: 0,
                lastUpdate: this.game.lastUpdate,
                createdAt: this.game.createdAt,
                round: 0,
            },
            time: Date.now(),
        });

        return this.game;
    }

    /**
     * 移动角色
     * 更新角色在战场上的位置
     * 
     * 定位规则：
     * - 如果 identifier.monsterId 存在：移动玩家角色
     * - 如果 identifier.bossId 存在：移动Boss主体
     * - 如果 identifier.minionId 存在：移动小怪
     * 
     * 注意：identifier 中的三个字段只有一个存在，用来区分角色类型
     * 
     * @param gameId 游戏ID
     * @param to 目标位置（Hex坐标）
     * @param identifier 角色标识符（monsterId/bossId/minionId 三选一）
     * @returns 是否成功
     */
    async walk(
        gameId: string,
        to: { q: number; r: number },
        identifier: CharacterIdentifier
    ): Promise<boolean> {
        await this.load(gameId);
        if (!this.game) return false;

        const { monsterId, bossId, minionId } = identifier;

        // 检查参数：应该只有一个存在
        const paramCount = [monsterId, bossId, minionId].filter(Boolean).length;
        if (paramCount !== 1) {
            return false;  // 参数错误：应该只有一个标识符
        }

        // === 验证层 ===
        const validator = this.getValidator();
        const character = this.getCharacter(monsterId, bossId, minionId);
        if (!character) return false;

        const from = { q: character.q ?? 0, r: character.r ?? 0 };
        const validationResult = await validator.validateAction(identifier, {
            validatePosition: { from, to }
        });

        if (!validationResult.valid) {
            console.error("Walk validation failed:", validationResult.message);
            return false;
        }

        const uid = character.uid;

        // 使用位置服务更新位置
        const success = await this.positionService.updatePosition(
            gameId,
            identifier,
            to,
            this.game
        );

        if (!success) return false;

        // 使用事件服务创建和插入事件
        const event = this.eventService.createWalkEvent(gameId, identifier, to);
        await this.eventService.createEvent(event);
        await this.save({ lastUpdate: new Date().toISOString() });

        return true;
    }

    /**
     * 执行攻击
     * 
     * 设计说明：
     * 由于普通攻击已经统一为 basic_attack 技能，attack 方法现在只是一个便捷包装：
     * - 如果没有指定技能，自动使用 basic_attack
     * - 统一通过 useSkill 方法处理
     * - 创建 attack 事件（用于统一的事件接口）
     * 
     * 注意：
     * - 普通攻击（basic_attack）：单体攻击，只攻击第一个目标
     * - 技能攻击：根据技能类型（单体/群体）自动处理
     * 
     * 标识符说明：
     * - attacker: 攻击者标识符（monsterId/bossId/minionId 三选一）
     * - targets: 目标列表，每个目标包含 monsterId/bossId/minionId 三选一
     * 
     * 如果不需要 attack 事件的特殊处理，可以直接调用 useSkill("basic_attack", targets)
     * 
     * @param gameId 游戏ID
     * @param data 攻击数据
     *   - attacker: 攻击者标识符（CharacterIdentifier）
     *   - skillSelect: 技能ID（可选，如果不提供则使用 basic_attack）
     *   - targets: 目标列表，每个目标为 CharacterIdentifier
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
        await this.load(gameId);
        if (!this.game) return null;

        // === 验证层 ===
        const validator = this.getValidator();
        const validationResult = await validator.validateAction(data.attacker);

        if (!validationResult.valid) {
            console.error("Attack validation failed:", validationResult.message);
            return null;
        }

        // 如果没有指定技能，使用基础攻击技能
        const skillId = data.skillSelect && data.skillSelect !== ""
            ? data.skillSelect
            : "basic_attack";

        // 直接调用 useSkill 方法（统一通过技能系统处理）
        const skillResult = await this.useSkill(gameId, {
            ...data.attacker,
            skillId: skillId,
            targets: data.targets,
        });

        if (!skillResult.success) {
            return null;
        }

        // 获取攻击者角色以确定uid（用于事件记录）
        const attacker = this.getCharacter(
            data.attacker.monsterId,
            data.attacker.bossId,
            data.attacker.minionId
        );
        if (!attacker) return null;

        // 创建 attack 事件（作为统一的事件接口）
        // 注意：useSkill 已经创建了 use_skill 事件
        // attack 事件用于：
        // 1. 统一的事件接口（前端可以统一监听 attack 事件）
        // 2. 语义清晰（attack 表示攻击行为，use_skill 表示技能使用）
        // 3. 可能的统计或回放需求
        const event = this.eventService.createAttackEvent(gameId, {
            attacker: data.attacker,
            skillUsed: true,
            skillId: skillId,
            targets: data.targets,
            skillResult,
        });

        await this.eventService.createEvent(event);
        await this.save({ lastUpdate: new Date().toISOString() });

        return event;
    }

    /**
     * 选择技能
     * 为当前回合选择要使用的技能
     * @param gameId 游戏ID
     * @param data 技能数据
     * @returns 是否成功
     */
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

    /**
     * 使用技能
     * 执行技能效果，包括资源消耗、冷却设置、效果应用等
     * 
     * 目标确定规则：
     * 1. 如果提供了 targets 参数，则使用提供的目标
     * 2. 如果没有提供 targets，则根据技能范围类型自动计算：
     *    - single（单体）：需要提供至少一个主要目标，否则返回空数组
     *    - circle（圆形）：以施法者为中心，自动选择范围内的所有角色
     *    - line（直线）：需要提供主要目标来确定方向，自动选择路径上的所有角色
     * 
     * 标识符说明：
     * - 施法者：通过 CharacterIdentifier 指定（monsterId/bossId/minionId 三选一）
     * - 目标列表：每个目标为 CharacterIdentifier（monsterId/bossId/minionId 三选一）
     * 
     * @param gameId 游戏ID
     * @param data 技能使用数据
     *   - identifier: 施法者标识符（CharacterIdentifier，monsterId/bossId/minionId 三选一）
     *   - skillId: 技能ID
     *   - targets: 目标列表（可选，如果不提供则根据技能范围自动计算）
     *     - 每个目标为 CharacterIdentifier
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
        effects?: Array<{
            effect: any;
            targetId?: string;
            applied: boolean;
        }>;
    }> {
        await this.load(gameId);
        if (!this.game) {
            return {
                success: false,
                message: "游戏不存在",
            };
        }

        const { monsterId, bossId, minionId, skillId, targets } = data;

        // 检查参数：应该只有一个存在
        const paramCount = [monsterId, bossId, minionId].filter(Boolean).length;
        if (paramCount !== 1) {
            return {
                success: false,
                message: "参数错误：应该只提供一个标识符（monsterId/bossId/minionId）",
            };
        }

        const characterIdentifier: CharacterIdentifier = { monsterId, bossId, minionId };

        // === 验证层 ===
        const validator = this.getValidator();
        const validationResult = await validator.validateAction(characterIdentifier);

        if (!validationResult.valid) {
            return {
                success: false,
                message: validationResult.message || "验证失败",
            };
        }

        // 1. 获取使用者角色（使用辅助方法）
        const caster = this.getCharacter(monsterId, bossId, minionId);
        if (!caster) {
            return {
                success: false,
                message: `角色不存在: monsterId=${monsterId}, bossId=${bossId}, minionId=${minionId}`,
            };
        }

        // 2. 确定目标列表
        // 如果提供了 targets，使用提供的；否则根据技能范围自动计算
        let finalTargets: CharacterIdentifier[] = [];

        if (targets && targets.length > 0) {
            // 使用提供的目标
            finalTargets = targets;
        } else {
            // 根据技能范围自动计算目标
            // 注意：对于 single 和 line 类型，需要主要目标，这里返回空数组
            // 调用方应该提供至少一个主要目标
            const calculatedTargets = this.calculateTargetsBySkillRange(caster, skillId);
            // 转换格式：从 { uid, monsterId } 转换为 CharacterIdentifier
            finalTargets = calculatedTargets.map((t) => {
                const params = this.getCharacterParams(t.uid, t.monsterId);
                return {
                    monsterId: params.monsterId,
                    bossId: params.bossId,
                    minionId: params.minionId,
                } as CharacterIdentifier;
            });
        }

        // 3. 获取目标角色列表（使用辅助方法）
        const targetMonsters: GameMonster[] = [];
        for (const target of finalTargets) {
            const targetMonster = this.getCharacter(target.monsterId, target.bossId, target.minionId);
            if (targetMonster) {
                targetMonsters.push(targetMonster);
            }
        }

        // 验证目标有效性（对于需要目标的技能）
        if (targets && targets.length > 0 && targetMonsters.length === 0) {
            return {
                success: false,
                message: "没有有效的目标",
            };
        }

        // 3. ✅ 保存目标之前的HP（用于检测击败）
        const targetHpBefore = new Map<string, number>();
        targetMonsters.forEach(target => {
            const key = target.monsterId;  // 使用 monsterId 作为唯一标识
            targetHpBefore.set(key, target.stats?.hp?.current ?? 0);
        });

        // 4. 使用技能（使用 SkillManager）
        const skillResult = SkillManager.useSkill(
            skillId,
            caster,
            targetMonsters.length > 0 ? targetMonsters : undefined
        );

        if (!skillResult.success) {
            return skillResult;
        }

        // 5. 更新数据库中的角色状态（使用角色更新服务）
        // 更新使用者状态
        if (!this.game) {
            return {
                success: false,
                message: "游戏状态不存在",
            };
        }
        await this.characterUpdateService.updateCharacterInDatabase(gameId, caster, this.game);

        // 6. ✅ 检测是否击败目标（在更新前检测）
        let killedBoss = false;
        let killedMinion = false;

        if (skillResult.effects && targetMonsters.length > 0) {
            for (const target of targetMonsters) {
                const key = target.monsterId;
                const beforeHp = targetHpBefore.get(key) || 0;

                // 从技能效果中计算伤害后的HP
                let totalDamage = 0;
                skillResult.effects.forEach((effect: any) => {
                    if (effect.effect?.type === 'damage' &&
                        (effect.targetId === key || effect.targetId === target.monsterId)) {
                        totalDamage += effect.effect.value || 0;
                    }
                });

                const afterHp = Math.max(0, beforeHp - totalDamage);

                // 检测是否击败（通过 uid 和 monsterId 判断）
                if (beforeHp > 0 && afterHp <= 0) {
                    if (target.uid === "boss") {
                        // 检查是Boss本体还是小怪
                        const boss = this.game?.boss;
                        if (boss && boss.monsterId === target.monsterId) {
                            killedBoss = true;
                        } else if (boss?.minions?.some(m => m.monsterId === target.monsterId)) {
                            killedMinion = true;
                        }
                    }
                }

                // 更新目标状态
                await this.characterUpdateService.updateCharacterInDatabase(gameId, target, this.game);
            }
        }

        // 7. 重新加载游戏状态（确保内存中的 game 对象与数据库同步）
        await this.load(gameId);

        // 8. ✅ 使用共享服务计算行动得分
        const configVersion = this.game?.scoringConfigVersion || DEFAULT_SCORING_CONFIG_VERSION;
        const actionType = skillId === "basic_attack" ? 'attack' : 'skill';
        const scoreDelta = sharedScoreService.calculateActionScore({
            actionType,
            killed: killedBoss || killedMinion,
            killedType: killedBoss ? 'boss' : (killedMinion ? 'minion' : undefined),
            skillId: skillId === "basic_attack" ? undefined : skillId
        }, configVersion);

        // 9. ✅ 更新 baseScore
        if (scoreDelta > 0) {
            await this.updateScore(gameId, scoreDelta);
        }

        // 10. 创建技能使用事件
        const event = this.eventService.createUseSkillEvent(gameId, {
            identifier: { monsterId, bossId, minionId },
            skillId,
            targets: finalTargets,
            result: skillResult,
        });

        await this.eventService.createEvent(event);
        await this.save({ lastUpdate: new Date().toISOString() });

        // 11. ✅ 检查游戏是否结束
        await this.checkAndUpdateGameStatus(gameId);

        return skillResult;
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
        await this.load(gameId);
        if (!this.game) return false;

        const newRoundNo = (this.game.round || 0) + 1;

        // 使用回合服务创建新回合
        const success = await this.roundService.createRound(gameId, newRoundNo, this.game);
        if (!success) return false;

        // 创建新回合事件
        const event = this.eventService.createNewRoundEvent(gameId, newRoundNo);
        await this.eventService.createEvent(event);
        await this.save({ round: newRoundNo, lastUpdate: new Date().toISOString() });

        return true;
    }

    /**
     * 结束回合
     * 标记当前回合为已完成
     * @param gameId 游戏ID
     * @returns 是否成功
     */
    async endRound(gameId: string): Promise<boolean> {
        await this.load(gameId);
        if (!this.game) return false;
        if (this.game.round === undefined) return false;

        const roundNumber = this.game.round;

        // 使用回合服务结束回合
        const success = await this.roundService.endRound(gameId, roundNumber);
        if (!success) return false;

        // 创建结束回合事件
        const event = this.eventService.createEndRoundEvent(gameId, roundNumber);
        await this.eventService.createEvent(event);
        await this.save({ lastUpdate: new Date().toISOString() });

        return true;
    }

    /**
     * 计算分数（已废弃，使用 sharedScoreService）
     * @deprecated 使用 sharedScoreService.calculateActionScore 代替
     */
    calculateScore(action: any, actionType: string): number {
        // 保持向后兼容，但实际使用 sharedScoreService
        const actionData = {
            actionType: actionType as 'attack' | 'skill' | 'walk',
            killed: action.data?.killed,
            killedType: action.data?.killedType as 'boss' | 'minion' | undefined
        };
        return sharedScoreService.calculateActionScore(
            actionData,
            this.game?.scoringConfigVersion
        );
    }

    /**
     * 更新分数
     * 增加或减少游戏分数
     * @param gameId 游戏ID
     * @param scoreDelta 分数变化量
     * @returns 是否成功
     */
    async updateScore(gameId: string, scoreDelta: number): Promise<boolean> {
        await this.load(gameId);
        if (!this.game) return false;

        const newScore = (this.game.score || 0) + scoreDelta;
        await this.save({ score: newScore, lastUpdate: new Date().toISOString() });

        return true;
    }

    /**
     * 游戏结束
     * 计算最终分数并生成游戏报告
     * @param gameId 游戏ID
     * @returns GameReport 或 null（如果失败）
     */
    async gameOver(gameId: string): Promise<GameReport | null> {
        await this.load(gameId);
        if (!this.game) return null;

        // ✅ 获取游戏使用的配置版本
        const configVersion = this.game.scoringConfigVersion || DEFAULT_SCORING_CONFIG_VERSION;

        // ✅ 判断游戏结果
        const gameResult = sharedScoreService.determineGameResult(this.game, configVersion);

        // 更新游戏状态
        let newStatus: GameStatus;
        switch (gameResult.result) {
            case GameResult.WIN:
                newStatus = 1;  // won
                break;
            case GameResult.LOSE:
                newStatus = 2;  // lost
                break;
            case GameResult.DRAW:
                newStatus = 3;  // draw（超时）
                break;
        }

        // ✅ 获取基础得分
        const baseScore = this.game.score || 0;

        // ✅ 计算游戏时长
        const gameStartTime = this.game.createdAt
            ? new Date(this.game.createdAt).getTime()
            : Date.now();
        const timeElapsed = Date.now() - gameStartTime;

        // ✅ 获取回合数
        const roundsUsed = this.game.round || 0;

        // ✅ 计算角色存活统计
        const survivalStats = sharedScoreService.calculateSurvivalStats(this.game.team || []);

        // ✅ 使用共享服务计算完整得分
        const scoreResult = sharedScoreService.calculateCompleteScore({
            baseScore,
            timeElapsed,
            roundsUsed,
            damageDealt: 0,  // 可选，可以从事件中统计
            skillsUsed: 0,    // 可选，可以从事件中统计
            gameResult: gameResult.result,
            survivalStats
        }, configVersion);

        // ✅ 保存游戏状态
        await this.save({
            status: newStatus,
            lastUpdate: new Date().toISOString()
        });

        // ✅ 创建游戏结束事件
        const event = this.eventService.createGameEndEvent(gameId);
        await this.eventService.createEvent(event);

        // ✅ 返回游戏报告
        return {
            gameId,
            baseScore: scoreResult.baseScore,
            timeBonus: scoreResult.timeBonus,
            completeBonus: scoreResult.survivalBonus + scoreResult.resultScore,  // 兼容旧接口
            totalScore: scoreResult.totalScore,
        };
    }

    /**
     * ✅ 检查并更新游戏状态
     */
    async checkAndUpdateGameStatus(gameId: string): Promise<{
        result: GameResult;
        reason: string;
        isGameOver: boolean;
    } | null> {
        await this.load(gameId);
        if (!this.game) return null;

        const configVersion = this.game.scoringConfigVersion || DEFAULT_SCORING_CONFIG_VERSION;
        const result = sharedScoreService.determineGameResult(this.game, configVersion);

        // 如果游戏结束，更新状态
        if (result.isGameOver) {
            let newStatus: GameStatus;
            switch (result.result) {
                case GameResult.WIN:
                    newStatus = 1;
                    break;
                case GameResult.LOSE:
                    newStatus = 2;
                    break;
                case GameResult.DRAW:
                    newStatus = 3;
                    break;
            }

            await this.save({
                status: newStatus,
                lastUpdate: new Date().toISOString()
            });

            // 创建游戏结束事件
            const event = this.eventService.createGameEndEvent(gameId);
            await this.eventService.createEvent(event);
        }

        return result;
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
        to: v.object({ q: v.number(), r: v.number() }),
        identifier: v.object({
            monsterId: v.optional(v.string()),
            bossId: v.optional(v.string()),
            minionId: v.optional(v.string()),
        }),
    },
    handler: async (ctx, { gameId, to, identifier }) => {
        console.log("walk", gameId, identifier, to);
        const gameManager = new TacticalMonsterGameManager(ctx);
        await gameManager.load(gameId);
        const result = await gameManager.walk(gameId, to, identifier);
        console.log("walk result", result);
        return { ok: result };
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
        const gameManager = new TacticalMonsterGameManager(ctx);
        const result = await gameManager.useSkill(gameId, data);
        if (result.success) {
            return { ok: true, data: result };
        } else {
            return { ok: false, error: result.message || "技能使用失败" };
        }
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

