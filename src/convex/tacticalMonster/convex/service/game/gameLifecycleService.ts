/**
 * 游戏生命周期服务
 * 负责游戏的创建、加载、保存
 */

import { calculateBossPower, getBossConfig, getMergedBossConfig } from "../../data/bossConfigs";
import { calculateGameMonster, MONSTER_CONFIGS_MAP } from "../../data/monsterConfigs";
import { DEFAULT_SCORING_CONFIG_VERSION } from "../../data/scoringConfigs";
import { GameModel, GameRound, GameStatus, getMrGameStageMode, TutorialProgressState } from "../../types/gameTypes";
import { GameBoss, GameMinion, GameMonster, PlayerMonster } from "../../types/monsterTypes";
import { GameRuleConfigService } from "./gameRuleConfigService";
import { TeamService } from "../team/teamService";
import { buildGameTeamFromStageRule } from "./teamPresetService";
import { GameEventService } from "./gameEventService";
import { RoundService } from "./roundService";
import { getModeTypeForRuleId } from "../../utils/tournamentModeType";

export class GameLifecycleService {
    private eventService: GameEventService;
    private roundService: RoundService;

    constructor(private dbCtx: any) {
        this.eventService = new GameEventService(dbCtx);
        this.roundService = new RoundService(dbCtx);
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
        console.log("createGame params", uid, gameId, ruleId, stageId);
        const stageRuleConfig = GameRuleConfigService.getGameRuleConfig(ruleId);

        // 1. 根据 uid 获取玩家队伍（从 mr_player_monsters 表）
        const playerTeamMonsters = await TeamService.getPlayerTeam(this.dbCtx, uid);

        // 2. 根据 stageId 获取数据库 mr_stage 的 stage 数据
        const stage = await this.dbCtx.db
            .query("mr_stage")
            .withIndex("by_stageId", (q: any) => q.eq("stageId", stageId))
            .first();

        if (!stage) {
            throw new Error(`Stage 不存在: ${stageId}`);
        }

        // 3. 按关卡 teamPreset（none / override / merge）生成最终 team 与 teamPower
        const { team, totalTeamPower } = await buildGameTeamFromStageRule(
            uid,
            playerTeamMonsters ?? [],
            stageRuleConfig
        );

        // 4. 获取 Boss 配置
        const bossConfig = getBossConfig(stage.bossId);
        if (!bossConfig) {
            throw new Error(`Boss配置不存在: ${stage.bossId}`);
        }

        // 5. 使用计算出的 teamPower（用于 Boss 缩放）
        const teamPower = totalTeamPower;

        // 6. 根据 StageRuleConfig 决定 Boss 属性：固定数值 or 基于战力缩放
        const mergedBossConfig = getMergedBossConfig(stage.bossId);
        if (!mergedBossConfig) {
            throw new Error(`无法获取合并后的Boss配置: ${stage.bossId}`);
        }
        const stageBossOverrides = stageRuleConfig?.stageContent?.bossOverrides;
        const effectiveBossConfig = stageBossOverrides
            ? {
                ...mergedBossConfig,
                baseHp: stageBossOverrides.baseHp ?? mergedBossConfig.baseHp,
                baseDamage: stageBossOverrides.baseDamage ?? mergedBossConfig.baseDamage,
                baseDefense: stageBossOverrides.baseDefense ?? mergedBossConfig.baseDefense,
                baseSpeed: stageBossOverrides.baseSpeed ?? mergedBossConfig.baseSpeed,
            }
            : mergedBossConfig;

        // 首通：无 mr_player_first_clear 记录时强制固定 Boss；挑战模式：使用配置
        const firstClear = await this.dbCtx.db
            .query("mr_player_first_clear")
            .withIndex("by_uid_ruleId", (q: any) => q.eq("uid", uid).eq("ruleId", ruleId))
            .unique();
        const isFirstClearAttempt = !firstClear;
        const powerBasedScaling = isFirstClearAttempt
            ? false
            : (stageRuleConfig?.stageContent?.difficultyAdjustment?.powerBasedScaling !== false);

        let bossScale: number;
        if (powerBasedScaling) {
            // 缩放模式：Boss Power = teamPower * difficulty
            const baseBossPower = calculateBossPower(effectiveBossConfig);
            const targetBossPower = teamPower * stage.difficulty;
            bossScale = Math.max(0.1, Math.min(10.0, targetBossPower / baseBossPower));
        } else {
            // 固定 Boss 基准 + 关卡难度系数：Boss 属性 = 基础值 × difficultyMultiplier
            // 实现每关递进变难，tier 内 1→2→3→4→5 单调递增
            bossScale = Math.max(0.5, Math.min(3.0, stage.difficulty ?? 1.0));
        }

        // 应用缩放到 Boss 属性
        const scaledBossStats = {
            hp: Math.floor((effectiveBossConfig.baseHp ?? 0) * bossScale),
            attack: Math.floor((effectiveBossConfig.baseDamage ?? 0) * bossScale),
            defense: Math.floor((effectiveBossConfig.baseDefense ?? 0) * bossScale),
            speed: Math.floor((effectiveBossConfig.baseSpeed ?? 0) * bossScale),
        };

        // 8. 构建 Boss 数据（包括小怪）
        const bossMainPosition = stageBossOverrides?.position || (bossConfig as any).position || { q: 0, r: 0 };

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
        const bossSkills = effectiveBossConfig.skills?.map((s: any) => s.skillId || s.id) || [];

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
        const stageMode = getModeTypeForRuleId(ruleId);
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
                bossId: bossData.bossId,
                monsterId: bossData.monsterId,  // 角色配置ID
                position: {  // 使用 position 对象（符合 schema）
                    q: bossData.q,
                    r: bossData.r,
                },
                minions: bossData.minions.map((minion: GameMinion) => ({
                    monsterId: minion.monsterId,  // 角色配置ID
                    position: {  // 使用 position 对象（符合 schema）
                        q: minion.q,
                        r: minion.r,
                    },
                    // 向后兼容字段（从 stats 提取）
                    hp: minion.stats.hp.current,
                    damage: minion.stats.attack,
                    defense: minion.stats.defense,
                    speed: minion.stats.speed,
                    // 运行时状态（可选）
                    stats: minion.stats,
                    statusEffects: minion.statusEffects || [],
                    cooldowns: minion.skillCooldowns || {},  // schema 中使用 cooldowns
                })),
                stats: bossData.stats,
                statusEffects: bossData.statusEffects || [],
                cooldowns: bossData.skillCooldowns || {},  // schema 中使用 cooldowns
                skills: bossData.skills || [],
                currentPhase: bossData.currentPhase || "phase1",
                behaviorSeed: bossData.behaviorSeed,
            },
            map: mapForGame,
            stageId,
            ruleId,
            ...(stageMode !== undefined ? { mode: stageMode } : {}),
            gameId,
            status: 0,  // 0: waiting
            score: 0,
            scoringConfigVersion: DEFAULT_SCORING_CONFIG_VERSION,  // ✅ 记录配置版本
            lastUpdate: now,
            createdAt: now,
            bossCurrentPhase: "phase1",
        });

        // 11. 构建并返回 GameModel（包含完整的 GameMonster 数组）
        const game: GameModel = {
            gameId,
            stageId,
            ruleId,
            ...(stageMode !== undefined ? { mode: stageMode } : {}),
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
            currentRound: { no: 0, turns: [] },
        };

        // 12. ✅ 创建第一个 round（round 1）
        const roundCreated = await this.roundService.createRound(gameId, 1, game);
        if (roundCreated) {
            // 更新数据库中的 round 字段
            const gameDoc = await this.dbCtx.db
                .query("mr_games")
                .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
                .first();

            if (gameDoc) {
                await this.dbCtx.db.patch(gameDoc._id, {
                    round: 1,
                    lastUpdate: new Date().toISOString(),
                });
            }

            // 重新加载 round 数据以更新 currentRound
            const roundDoc = await this.roundService.getRoundDoc(gameId, 1);

            if (roundDoc) {
                // 更新 game 的 currentRound
                game.currentRound = {
                    no: roundDoc.no,
                    turns: roundDoc.turns || [],
                };
            }
        }

        // 13. 创建 gameInit 事件（包含完整初始状态，用于重播）
        await this.eventService.createEvent({
            gameId: game.gameId,
            name: "gameInit",
            type: 0,
            data: {
                // 包含完整的初始状态
                gameId: game.gameId,
                matchId: game.matchId,
                stageId: game.stageId,
                ruleId,
                uid: game.uid,
                teamPower: game.teamPower,
                team: game.team.map(m => ({
                    ...m,
                    // 确保包含所有字段
                })),
                boss: {
                    ...game.boss,
                    // 确保包含所有字段
                },
                map: game.map,
                status: 0,
                score: 0,
                lastUpdate: game.lastUpdate,
                createdAt: game.createdAt,
                round: game.currentRound?.no || 1,
            },
            time: Date.now(),
        });

        return game;
    }

    /**
     * 加载游戏数据
     * 从数据库读取游戏记录并转换为 GameModel
     * @param gameId 游戏ID
     * @returns GameModel 或 null（如果游戏不存在）
     */
    async load(gameId: string): Promise<GameModel | null> {
        try {
            // 查询 mr_games 表
            const game = await this.dbCtx.db
                .query("mr_games")
                .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
                .first();

            if (!game) {
                console.log("loadGame: game not found in database", gameId);
                return null;
            }

            // 获取当前回合数（mr_games.round 可能未及时写入；从 mr_game_round 回退，否则 turns 为空导致仿真/客户端无活跃回合）
            let roundNumber = (game as any).round ?? 0;
            if (roundNumber === 0) {
                const roundDocs = await this.dbCtx.db
                    .query("mr_game_round")
                    .withIndex("by_game_round", (q: any) => q.eq("gameId", gameId))
                    .collect();
                if (roundDocs.length > 0) {
                    roundNumber = roundDocs.reduce((max: number, d: any) => Math.max(max, d.no), 0);
                }
            }

            // 从数据库读取 GameMonster 数组（统一使用stats，与GameBoss保持一致）
            const team: GameMonster[] = await Promise.all(
                (game.team || []).map(async (teamMember: any) => {
                    try {
                        // 获取怪物配置（用于补充配置字段）
                        const monsterConfig = MONSTER_CONFIGS_MAP[teamMember.monsterId];
                        if (!monsterConfig) {
                            console.error(`怪物配置不存在: ${teamMember.monsterId}`);
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

                            // 从数据库查询 PlayerMonster 以获取 unlockedSkills
                            const dbPlayerMonster = await this.dbCtx.db
                                .query("mr_player_monsters")
                                .withIndex("by_uid", (q: any) => q.eq("uid", game.uid))
                                .filter((q: any) =>
                                    q.and(
                                        q.eq(q.field("monsterId"), teamMember.monsterId),
                                        q.eq(q.field("inTeam"), 1)
                                    )
                                )
                                .first();

                            return {
                                // 基础标识（character_id 区分同 monsterId 多实例，如召唤）
                                character_id: teamMember.character_id ?? teamMember.monsterId,
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
                                // 技能系统（从数据库读取或使用 teamMember.skills）
                                skills: dbPlayerMonster?.unlockedSkills || teamMember.skills || [],  // ✅ 从数据库读取或使用 teamMember.skills
                                unlockSkills: dbPlayerMonster?.unlockedSkills || teamMember.skills || [],  // ✅ 保持向后兼容
                                // 特殊属性（从配置推断）
                                isFlying: monsterConfig.race === "Flying",
                                flightHeight: monsterConfig.race === "Flying" ? 1.5 : undefined,
                                canIgnoreObstacles: monsterConfig.race === "Flying",
                            } as GameMonster;
                        }

                        // 向后兼容：如果没有 stats，从简化数据重建
                        // 从数据库查询 PlayerMonster 以获取 unlockedSkills
                        const dbPlayerMonster = await this.dbCtx.db
                            .query("mr_player_monsters")
                            .withIndex("by_uid", (q: any) => q.eq("uid", game.uid))
                            .filter((q: any) =>
                                q.and(
                                    q.eq(q.field("monsterId"), teamMember.monsterId),
                                    q.eq(q.field("inTeam"), 1)
                                )
                            )
                            .first();

                        const playerMonster: PlayerMonster = {
                            uid: game.uid,
                            monsterId: teamMember.monsterId,
                            level: teamMember.level,
                            stars: teamMember.stars,
                            experience: 0,
                            shards: 0,
                            isUnlocked: true,
                            unlockedSkills: dbPlayerMonster?.unlockedSkills || teamMember.skills || [],  // ✅ 从数据库读取或使用 teamMember.skills
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

                        // character_id 区分同 monsterId 多实例（如召唤）
                        (gameMonster as any).character_id = teamMember.character_id ?? teamMember.monsterId;
                        return gameMonster;
                    } catch (error: any) {
                        console.error("loadGame: error processing teamMember", teamMember.monsterId, error?.message);
                        throw error; // 重新抛出异常，让外层的 try-catch 捕获
                    }
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
                    // 优先使用 stats，如果没有则从向后兼容字段构建
                    const minionStats = minion.stats || {
                        hp: {
                            current: minion.hp || 0,
                            max: minion.hp || 0,
                        },
                        attack: minion.damage || 0,
                        defense: minion.defense || 0,
                        speed: minion.speed || 0,
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

            // ✅ 从数据库加载当前回合的完整数据（包括所有 turns 及其状态）
            let currentRound: GameRound = { no: roundNumber, turns: [] };
            if (roundNumber > 0) {
                const roundDocs = await this.dbCtx.db
                    .query("mr_game_round")
                    .withIndex("by_game_round", (q: any) =>
                        q.eq("gameId", gameId).eq("no", roundNumber)
                    )
                    .collect();
                const roundDoc = roundDocs.length > 0
                    ? roundDocs.reduce((a: any, b: any) => (a._creationTime > b._creationTime ? a : b))
                    : null;

                if (roundDoc && roundDoc.turns) {
                    const mappedTurns = roundDoc.turns.map((turn: any) => ({
                        uid: turn.uid,
                        character_id: turn.character_id,
                        skillSelect: turn.skillSelect,
                        status: turn.status ?? 0,
                        dueTime: turn.dueTime,
                        order: turn.order,
                        stepsUsed: turn.stepsUsed,
                    }));
                    // console.log("mappedTurns", mappedTurns)
                    currentRound = {
                        no: roundDoc.no,
                        turns: mappedTurns,
                    };
                }
            }

            // 构建 GameModel（符合 mr_games 表结构）
            return {
                gameId: game.gameId,
                matchId: game.matchId,
                stageId: game.stageId,
                ruleId: (game as any).ruleId,
                mode: getMrGameStageMode(game as any),
                uid: game.uid,
                teamPower: game.teamPower,
                team: team,  // 使用重建的 GameMonster 数组
                boss: bossData,  // 使用重建的 GameBoss 对象
                map: game.map,
                // 缺省视为进行中；避免 undefined 被误判为「已结束」
                status: (game as any).status ?? 0,
                score: game.score,
                scoringConfigVersion: game.scoringConfigVersion,  // ✅ 加载配置版本
                lastUpdate: game.lastUpdate,
                createdAt: game.createdAt,
                tutorialProgress: (game as any).tutorialProgress,
                currentRound,  // ✅ 包含完整的 turns 数据及其状态
            };
        } catch (error: any) {
            console.error("loadGame error", gameId, error?.message, error?.stack);
            // ✅ 如果加载过程中出现异常，返回 null
            return null;
        }
    }

    /**
     * 保存游戏数据
     * 更新游戏的部分字段到数据库
     * @param gameId 游戏ID
     * @param data 要更新的字段
     */
    async save(gameId: string, data: {
        round?: number;
        status?: GameStatus;
        score?: number;
        lastUpdate?: number | string;
        tutorialProgress?: TutorialProgressState;
    }): Promise<void> {
        const updateData: any = {};
        if (data.status !== undefined) updateData.status = data.status;
        if (data.round !== undefined) updateData.round = data.round;
        if (data.score !== undefined) updateData.score = data.score;
        if (data.tutorialProgress !== undefined) updateData.tutorialProgress = data.tutorialProgress;
        if (data.lastUpdate !== undefined) {
            updateData.lastUpdate = typeof data.lastUpdate === 'string'
                ? data.lastUpdate
                : new Date(data.lastUpdate).toISOString();
        }

        if (Object.keys(updateData).length > 0) {
            // 更新 mr_games 表
            const gameDoc = await this.dbCtx.db
                .query("mr_games")
                .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
                .first();

            if (!gameDoc) {
                throw new Error(`游戏不存在: ${gameId}`);
            }

            await this.dbCtx.db.patch(gameDoc._id, updateData);
        }
    }
}

