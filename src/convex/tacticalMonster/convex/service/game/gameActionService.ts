/**
 * 游戏动作执行服务
 * 负责执行游戏动作（walk, attack, useSkill, selectSkill）
 */

import { DEFAULT_SCORING_CONFIG_VERSION } from "../../data/scoringConfigs";
import { getSkillConfig } from "../../data/skillConfigs";
import { CharacterIdentifier, CombatEvent, GameTurn, PhaseChanges } from "../../types/gameTypes";
import { GameMonster } from "../../types/monsterTypes";
import { SkillManager } from "../skill/skillManager";
import { CharacterPositionService } from "./characterPositionService";
import { CharacterQueryService } from "./characterQueryService";
import { CharacterUpdateService } from "./characterUpdateService";
import { GameActionValidator } from "./gameActionValidator";
import { GameEventService } from "./gameEventService";
import { GameLifecycleService } from "./gameLifecycleService";
import { GamePhaseService } from "./gamePhaseService";
import { GameScoreService } from "./gameScoreService";
import { sharedScoreService } from "./sharedScoreService";
import { SkillTargetService } from "./skillTargetService";

export class GameActionService {
    constructor(
        private dbCtx: any,
        private characterQueryService: CharacterQueryService,
        private skillTargetService: SkillTargetService,
        private characterUpdateService: CharacterUpdateService,
        private positionService: CharacterPositionService,
        private eventService: GameEventService,
        private validator: GameActionValidator,
        private phaseService: GamePhaseService,
        private lifecycleService: GameLifecycleService,
        private scoreService: GameScoreService
    ) { }

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
    ): Promise<{
        success: boolean;
        phaseChanges?: PhaseChanges;
    }> {
        const game = await this.lifecycleService.load(gameId);
        if (!game) return { success: false };

        this.characterQueryService.setGame(game);

        const { monsterId, bossId, minionId } = identifier;

        // 检查参数：应该只有一个存在
        const paramCount = [monsterId, bossId, minionId].filter(Boolean).length;
        if (paramCount !== 1) {
            return { success: false };  // 参数错误：应该只有一个标识符
        }

        // === 验证层 ===
        const character = this.characterQueryService.getCharacter(monsterId, bossId, minionId);
        if (!character) return { success: false };

        const from = { q: character.q ?? 0, r: character.r ?? 0 };
        const validationResult = await this.validator.validateAction(identifier, {
            validatePosition: { from, to }
        });

        if (!validationResult.valid) {
            console.error("Walk validation failed:", validationResult.message);
            return { success: false };
        }

        // 使用位置服务更新位置
        const success = await this.positionService.updatePosition(
            gameId,
            identifier,
            to,
            game
        );

        if (!success) return { success: false };

        // 使用事件服务创建和插入事件
        const event = this.eventService.createWalkEvent(gameId, identifier, to);
        await this.eventService.createEvent(event);
        await this.lifecycleService.save(gameId, { lastUpdate: new Date().toISOString() });

        // ✅ 移动不结束回合，允许在同一回合内移动后执行攻击/技能
        // 回合结束由攻击/技能使用操作（useSkill）负责
        // 这样前端可以先移动，然后在同一回合内执行攻击
        return {
            success: true,
            // 不返回 phaseChanges，因为移动不触发回合推进
        };
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
        const game = await this.lifecycleService.load(gameId);
        if (!game) return null;

        this.characterQueryService.setGame(game);

        // === 验证层 ===
        const validationResult = await this.validator.validateAction(data.attacker);

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
        const attacker = this.characterQueryService.getCharacter(
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
        await this.lifecycleService.save(gameId, { lastUpdate: new Date().toISOString() });

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
        const game = await this.lifecycleService.load(gameId);
        if (!game || game.currentRound === undefined) return false;

        const { skillId } = data;
        const roundNumber = game.currentRound?.no ?? 0;

        // 从数据库查询当前回合
        const roundDoc = await this.dbCtx.db
            .query("mr_game_round")
            .withIndex("by_game_round", (q: any) =>
                q.eq("gameId", gameId).eq("no", roundNumber)
            )
            .unique();

        if (!roundDoc) return false;

        const currentTurn = roundDoc.turns?.find(
            (turn: GameTurn) => turn.status === 1
        );

        if (!currentTurn) return false;

        currentTurn.skillSelect = skillId;

        await this.dbCtx.db.patch(roundDoc._id, {
            turns: roundDoc.turns,
        });

        await this.lifecycleService.save(gameId, { lastUpdate: new Date().toISOString() });

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
            isPassive?: boolean;  // ✅ 标记为被动技能效果
            passiveSkillId?: string;  // ✅ 记录被动技能ID
            triggerType?: string;  // ✅ 记录触发类型
        }>;
        phaseChanges?: PhaseChanges;
    }> {
        const game = await this.lifecycleService.load(gameId);
        if (!game) {
            return {
                success: false,
                message: "游戏不存在",
            };
        }

        this.characterQueryService.setGame(game);
        (this.skillTargetService as any).characterQueryService = this.characterQueryService;

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
        const validationResult = await this.validator.validateAction(characterIdentifier);

        if (!validationResult.valid) {
            return {
                success: false,
                message: validationResult.message || "验证失败",
            };
        }

        // 1. 获取使用者角色（使用辅助方法）
        const caster = this.characterQueryService.getCharacter(monsterId, bossId, minionId);
        if (!caster) {
            return {
                success: false,
                message: `角色不存在: monsterId=${monsterId}, bossId=${bossId}, minionId=${minionId}`,
            };
        }

        // ✅ 记录执行者的初始状态（用于计算 stateChanges）
        const casterStateBefore = {
            q: caster.q ?? 0,
            r: caster.r ?? 0,
            hp: caster.stats?.hp?.current ?? 0,
            mp: caster.stats?.mp?.current ?? 0,
            shield: caster.stats?.shield?.current ?? 0,
            status: caster.status || 'normal',
        };
        const casterStatusEffectsBefore = caster.statusEffects ? [...caster.statusEffects] : [];
        const casterSkillCooldownsBefore = caster.skillCooldowns ? { ...caster.skillCooldowns } : {};

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
            const calculatedTargets = this.skillTargetService.calculateTargetsBySkillRange(caster, skillId);
            // 转换格式：从 { uid, monsterId } 转换为 CharacterIdentifier
            finalTargets = calculatedTargets.map((t) => {
                const params = this.characterQueryService.getCharacterParams(t.uid, t.monsterId);
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
            const targetMonster = this.characterQueryService.getCharacter(target.monsterId, target.bossId, target.minionId);
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

        // 3. ✅ 保存目标之前的状态（用于检测击败和计算 stateChanges）
        const targetHpBefore = new Map<string, number>();
        const targetStatesBefore: Array<{
            identifier: CharacterIdentifier;
            hp: number;
            mp: number;
            shield: number;
            status: 'normal' | 'stunned' | 'dead';
        }> = [];
        const targetStatusEffectsBefore: Map<string, any[]> = new Map();
        const targetSkillCooldownsBefore: Map<string, Record<string, number>> = new Map();

        targetMonsters.forEach(target => {
            const key = target.monsterId;  // 使用 monsterId 作为唯一标识
            targetHpBefore.set(key, target.stats?.hp?.current ?? 0);

            // 记录目标初始状态（用于计算 stateChanges）
            const targetParams = this.characterQueryService.getCharacterParams(target.uid, target.monsterId);
            targetStatesBefore.push({
                identifier: {
                    monsterId: targetParams.monsterId,
                    bossId: targetParams.bossId,
                    minionId: targetParams.minionId,
                },
                hp: target.stats?.hp?.current ?? 0,
                mp: target.stats?.mp?.current ?? 0,
                shield: target.stats?.shield?.current ?? 0,
                status: target.status || 'normal',
            });

            // 记录目标的状态效果和技能冷却
            targetStatusEffectsBefore.set(key, target.statusEffects ? [...target.statusEffects] : []);
            targetSkillCooldownsBefore.set(key, target.skillCooldowns ? { ...target.skillCooldowns } : {});
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
        await this.characterUpdateService.updateCharacterInDatabase(gameId, caster, game);

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
                        const boss = game?.boss;
                        if (boss && boss.monsterId === target.monsterId) {
                            killedBoss = true;
                        } else if (boss?.minions?.some(m => m.monsterId === target.monsterId)) {
                            killedMinion = true;
                        }
                    }
                }

                // 更新目标状态
                await this.characterUpdateService.updateCharacterInDatabase(gameId, target, game);
            }
        }

        // 6.5. ✅ 触发被动技能（在更新目标状态后）
        // 检查目标是否有被动技能需要触发（如反击）
        const passiveSkillEffects: Array<{
            effect: any;
            targetId?: string;
            applied: boolean;
            isPassive?: boolean;  // ✅ 标记为被动技能效果
            passiveSkillId?: string;  // ✅ 记录被动技能ID
            triggerType?: string;  // ✅ 记录触发类型
        }> = [];

        if (skillResult.success && targetMonsters.length > 0) {
            const skill = getSkillConfig(skillId);
            const canTriggerCounter = skill?.canTriggerCounter ?? false;

            // 检查技能是否造成伤害（用于触发 on_hit 类型的被动技能）
            const hasDamage = skillResult.effects?.some((effect: any) =>
                effect.effect?.type === 'damage'
            ) ?? false;

            for (const target of targetMonsters) {
                // 只检查存活的目标
                if (!target.stats || (target.stats.hp?.current ?? 0) <= 0) {
                    continue;
                }

                if (!target.skills || !Array.isArray(target.skills)) {
                    continue;
                }

                // 检查所有被动技能
                for (const passiveSkillId of target.skills) {
                    // 检查是否应该触发被动技能
                    let triggerType: string | null = null;

                    // 如果技能可以触发反击，检查 on_skill_attacked
                    if (canTriggerCounter) {
                        if (SkillManager.shouldTriggerPassiveSkill(passiveSkillId, target, 'on_skill_attacked')) {
                            triggerType = 'on_skill_attacked';
                        }
                    }

                    // 如果造成伤害，检查 on_hit
                    if (hasDamage && !triggerType) {
                        if (SkillManager.shouldTriggerPassiveSkill(passiveSkillId, target, 'on_hit')) {
                            triggerType = 'on_hit';
                        }
                    }

                    if (triggerType) {
                        // 获取被动技能效果
                        const effects = SkillManager.getPassiveSkillEffects(passiveSkillId, triggerType);

                        // 应用效果到触发目标（通常是攻击者）
                        for (const effect of effects) {
                            const applied = SkillManager.applyEffectToTarget(effect, caster, target);

                            // ✅ 记录被动技能效果（包含完整的 effect 对象，以便前端显示伤害数字和播放正确的动画）
                            passiveSkillEffects.push({
                                effect: {
                                    id: effect.id,
                                    type: effect.type,
                                    name: effect.name,
                                    // ✅ 添加完整的 effect 信息
                                    value: effect.value,                      // 伤害值/治疗值等
                                    damage_type: effect.damage_type,          // 伤害类型（physical/magical）
                                    target_attribute: effect.target_attribute, // 目标属性（hp/mp等）
                                    duration: effect.duration,                 // 持续时间（用于BUFF/DEBUFF）
                                    modifiers: effect.modifiers,              // 属性修改器（用于BUFF/DEBUFF）
                                    modifier_type: effect.modifier_type,      // 修改类型（add/multiply）
                                    icon: effect.icon,                        // 效果图标
                                    damage_falloff: effect.damage_falloff,    // 伤害衰减
                                    area_type: effect.area_type,              // 作用范围类型
                                    area_size: effect.area_size,              // 作用范围大小
                                },
                                targetId: caster.monsterId,
                                applied,
                                isPassive: true,  // ✅ 标记为被动技能效果
                                passiveSkillId: passiveSkillId,  // ✅ 记录被动技能ID
                                triggerType: triggerType,  // ✅ 记录触发类型
                            });
                        }

                        // 更新目标状态（被动技能触发者）
                        await this.characterUpdateService.updateCharacterInDatabase(gameId, target, game);

                        // 更新攻击者状态（被动技能效果的目标）
                        await this.characterUpdateService.updateCharacterInDatabase(gameId, caster, game);
                    }
                }
            }
        }

        // 7. 重新加载游戏状态（确保内存中的 game 对象与数据库同步）
        const updatedGame = await this.lifecycleService.load(gameId);
        if (!updatedGame) {
            return {
                success: false,
                message: "游戏状态不存在",
            };
        }

        this.characterQueryService.setGame(updatedGame);

        // 8. ✅ 使用共享服务计算行动得分
        const configVersion = updatedGame.scoringConfigVersion || DEFAULT_SCORING_CONFIG_VERSION;
        const actionType = skillId === "basic_attack" ? 'attack' : 'skill';
        const scoreDelta = sharedScoreService.calculateActionScore({
            actionType,
            killed: killedBoss || killedMinion,
            killedType: killedBoss ? 'boss' : (killedMinion ? 'minion' : undefined),
            skillId: skillId === "basic_attack" ? undefined : skillId
        }, configVersion);

        // 9. ✅ 更新 baseScore
        if (scoreDelta > 0) {
            await this.scoreService.updateScore(gameId, scoreDelta);
        }

        // 10. 创建技能使用事件
        const event = this.eventService.createUseSkillEvent(gameId, {
            identifier: { monsterId, bossId, minionId },
            skillId,
            targets: finalTargets,
            result: skillResult,
        });

        await this.eventService.createEvent(event);
        await this.lifecycleService.save(gameId, { lastUpdate: new Date().toISOString() });

        // 11. ✅ 检查游戏是否结束
        await this.scoreService.checkAndUpdateGameStatus(gameId);

        // 12. ✅ 推进回合和阶段（自动处理turnEnd, roundEnd, roundStart, turnStart, Boss AI）
        const phaseChanges = await this.phaseService.advanceTurnAndRound(gameId, { monsterId, bossId, minionId }, (this as any).ctx);

        // ✅ 13. 计算 stateChanges（参考 executeBossAction 的实现）
        const casterAfter = this.characterQueryService.getCharacter(monsterId, bossId, minionId);
        const stateChanges: any = {
            actor: null,
            targets: [],
        };

        // ✅ 执行者的状态变化
        if (casterAfter) {
            const casterStateAfter = {
                q: casterAfter.q ?? 0,
                r: casterAfter.r ?? 0,
                hp: casterAfter.stats?.hp?.current ?? 0,
                mp: casterAfter.stats?.mp?.current ?? 0,
                shield: casterAfter.stats?.shield?.current ?? 0,
                status: casterAfter.status || 'normal',
            };

            const hasChanged =
                casterStateBefore.q !== casterStateAfter.q ||
                casterStateBefore.r !== casterStateAfter.r ||
                casterStateBefore.hp !== casterStateAfter.hp ||
                casterStateBefore.mp !== casterStateAfter.mp ||
                casterStateBefore.shield !== casterStateAfter.shield ||
                casterStateBefore.status !== casterStateAfter.status;

            if (hasChanged) {
                stateChanges.actor = {
                    identifier: characterIdentifier,
                    before: casterStateBefore,
                    after: casterStateAfter,
                    positionChanged: casterStateBefore.q !== casterStateAfter.q || casterStateBefore.r !== casterStateAfter.r,
                    hpChanged: casterStateBefore.hp !== casterStateAfter.hp,
                    mpChanged: casterStateBefore.mp !== casterStateAfter.mp,
                    shieldChanged: casterStateBefore.shield !== casterStateAfter.shield,
                    statusChanged: casterStateBefore.status !== casterStateAfter.status,
                };
            }

            // ✅ 检查状态效果变化
            const casterStatusEffectsAfter = casterAfter.statusEffects ? [...casterAfter.statusEffects] : [];
            const statusEffectsChanged = JSON.stringify(casterStatusEffectsBefore) !== JSON.stringify(casterStatusEffectsAfter);
            if (statusEffectsChanged) {
                if (!stateChanges.statusEffects) {
                    stateChanges.statusEffects = [];
                }
                stateChanges.statusEffects.push({
                    characterIdentifier,
                    statusEffects: casterStatusEffectsAfter,
                });
            }

            // ✅ 检查技能冷却变化
            const casterSkillCooldownsAfter = casterAfter.skillCooldowns ? { ...casterAfter.skillCooldowns } : {};
            const cooldownsChanged = JSON.stringify(casterSkillCooldownsBefore) !== JSON.stringify(casterSkillCooldownsAfter);
            if (cooldownsChanged) {
                if (!stateChanges.skillCooldowns) {
                    stateChanges.skillCooldowns = [];
                }
                stateChanges.skillCooldowns.push({
                    characterIdentifier,
                    cooldowns: casterSkillCooldownsAfter,
                });
            }
        }

        // ✅ 目标的状态变化
        for (const targetStateBefore of targetStatesBefore) {
            const targetAfter = this.characterQueryService.getCharacter(
                targetStateBefore.identifier.monsterId,
                targetStateBefore.identifier.bossId,
                targetStateBefore.identifier.minionId
            );

            if (targetAfter) {
                const targetKey = targetStateBefore.identifier.monsterId || targetStateBefore.identifier.bossId || targetStateBefore.identifier.minionId || '';
                const targetStateAfter = {
                    hp: targetAfter.stats?.hp?.current ?? 0,
                    mp: targetAfter.stats?.mp?.current ?? 0,
                    shield: targetAfter.stats?.shield?.current ?? 0,
                    status: targetAfter.status || 'normal',
                };

                const hasChanged =
                    targetStateBefore.hp !== targetStateAfter.hp ||
                    targetStateBefore.mp !== targetStateAfter.mp ||
                    targetStateBefore.shield !== targetStateAfter.shield ||
                    targetStateBefore.status !== targetStateAfter.status;

                if (hasChanged) {
                    stateChanges.targets.push({
                        identifier: targetStateBefore.identifier,
                        before: {
                            hp: targetStateBefore.hp,
                            mp: targetStateBefore.mp,
                            shield: targetStateBefore.shield,
                            status: targetStateBefore.status,
                        },
                        after: targetStateAfter,
                        hpChanged: targetStateBefore.hp !== targetStateAfter.hp,
                        mpChanged: targetStateBefore.mp !== targetStateAfter.mp,
                        shieldChanged: targetStateBefore.shield !== targetStateAfter.shield,
                        statusChanged: targetStateBefore.status !== targetStateAfter.status,
                    });
                }

                // ✅ 检查目标的状态效果变化
                const targetStatusEffectsAfter = targetAfter.statusEffects ? [...targetAfter.statusEffects] : [];
                const targetStatusEffectsBeforeArray = targetStatusEffectsBefore.get(targetKey) || [];
                const statusEffectsChanged = JSON.stringify(targetStatusEffectsBeforeArray) !== JSON.stringify(targetStatusEffectsAfter);
                if (statusEffectsChanged) {
                    if (!stateChanges.statusEffects) {
                        stateChanges.statusEffects = [];
                    }
                    stateChanges.statusEffects.push({
                        characterIdentifier: targetStateBefore.identifier,
                        statusEffects: targetStatusEffectsAfter,
                    });
                }

                // ✅ 检查目标的技能冷却变化
                const targetSkillCooldownsAfter = targetAfter.skillCooldowns ? { ...targetAfter.skillCooldowns } : {};
                const targetSkillCooldownsBeforeObj = targetSkillCooldownsBefore.get(targetKey) || {};
                const cooldownsChanged = JSON.stringify(targetSkillCooldownsBeforeObj) !== JSON.stringify(targetSkillCooldownsAfter);
                if (cooldownsChanged) {
                    if (!stateChanges.skillCooldowns) {
                        stateChanges.skillCooldowns = [];
                    }
                    stateChanges.skillCooldowns.push({
                        characterIdentifier: targetStateBefore.identifier,
                        cooldowns: targetSkillCooldownsAfter,
                    });
                }
            }
        }

        // ✅ 14. 将 stateChanges 添加到 phaseChanges.playerAction.executionResults
        if (!phaseChanges.playerAction) {
            phaseChanges.playerAction = {
                action: {
                    type: 'use_skill',
                    skillId,
                    targets: finalTargets.length > 0 ? finalTargets : undefined,
                },
                executionResults: {},
            };
        }

        if (!phaseChanges.playerAction.executionResults) {
            phaseChanges.playerAction.executionResults = {};
        }

        // 只有在有状态变化时才设置 stateChanges
        if (stateChanges.actor || stateChanges.targets.length > 0) {
            phaseChanges.playerAction.executionResults.stateChanges = stateChanges;
        }

        // 合并主动技能效果和被动技能效果
        const allEffects = [
            ...(skillResult.effects || []),
            ...passiveSkillEffects,
        ];

        // ✅ 将 effects 也添加到 executionResults
        if (allEffects.length > 0) {
            phaseChanges.playerAction.executionResults.effects = allEffects;
        }

        return {
            ...skillResult,
            effects: allEffects,
            phaseChanges,
        };
    }
}

