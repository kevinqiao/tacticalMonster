/**
 * Tactical Monster 战斗操作处理器
 * PVE模式：玩家 vs Boss（Boss本体 + 小怪，uid="boss"）
 * 参考 solitaireSolo 的 useActHandler 模式
 */

import { useConvex } from "convex/react";
import gsap from "gsap";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../../../../convex/tacticalMonster/convex/_generated/api";
import usePlaySkill from "../../animation/usePlaySkill";
import usePlaySkillSelect from "../../animation/usePlaySkillSelect";
import usePlayWalk from "../../animation/usePlayWalk";
import { Skill } from "../../types/CharacterTypes";
import { ACT_CODE, CombatAction, MonsterSprite } from "../../types/CombatTypes";
import { findPath } from "../../utils/PathFind";
import { toCharacterIdentifier } from "../../utils/characterIdentifierUtils";
import type { CharacterIdentifier } from "../../utils/typeAdapter";
import { useCombatManager } from "../CombatManager";
import { BossAIDecision, BossAILocal } from "../boss/BossAILocal";
import { useBossAIPredictor } from "../boss/useBossAIPredictor";
import { BackendValidator } from "../optimistic/BackendValidator";
import { OperationQueue } from "../optimistic/OperationQueue";
import { OptimisticSkillExecutor } from "../optimistic/OptimisticSkillExecutor";
import { StateSnapshot } from "../optimistic/StateSnapshot";

const useCombatActHandler = () => {
    const { playSkillSelect } = usePlaySkillSelect();
    const { playSkill } = usePlaySkill();
    const { playWalk } = usePlayWalk();
    const { user } = useUserManager();
    const {
        game,
        map,
        gameId,
        characters,
        gridCells,
        hexCell,
        currentRound,
        playerUid,
        ruleManager,
        config,
        submitScore,
        setActiveSkill,
        eventQueue,
        updateGame
    } = useCombatManager();
    const convex = useConvex();

    // 乐观执行相关实例（基于快照管理）
    const operationQueue = useMemo(() => new OperationQueue(), []);
    const optimisticExecutor = useMemo(() => {
        if (!game) return null;
        return new OptimisticSkillExecutor(game, operationQueue);
    }, [game, operationQueue]);

    // Boss AI预测器（传入game和operationQueue以支持乐观执行）
    const bossAIPredictor = useBossAIPredictor(game, operationQueue);
    const predictedActionRef = useRef<BossAIDecision | null>(null);
    const bossTurnProcessedRef = useRef<Set<number>>(new Set());

    // 更新分数
    const updateScore = useCallback(async (scoreDelta: number) => {
        if (!gameId) return;
        try {
            await convex.mutation((api as any).service.game.gameService.updateScore, {
                gameId,
                scoreDelta
            });
        } catch (error) {
            console.error("Failed to update score", error);
        }
    }, [gameId, convex]);

    const walk = useCallback(async (to: { q: number; r: number }) => {
        if (!gameId || !characters || !gridCells || !currentRound || !map || !game) return;

        const currentTurn = currentRound.turns.find(
            (t) => t.status === 1 || t.status === 2
        );
        if (!currentTurn) return;

        // PVE模式：如果是Boss回合（uid="boss"），不执行玩家操作
        if (currentTurn.uid !== playerUid) return;

        const { uid, character_id } = currentTurn;
        const character = characters.find(
            c => c.character_id === character_id && c.uid === uid
        );
        if (!character) return;

        const col = map.direction === 1 ? map.cols - to.q - 1 : to.q;
        // 飞行单位可以忽略障碍物
        const isFlying = character.isFlying ?? false;
        const canIgnoreObstacles = character.canIgnoreObstacles ?? isFlying;
        const path = findPath(
            gridCells,
            { x: character.q ?? 0, y: character.r ?? 0 },
            { x: col, y: to.r },
            canIgnoreObstacles
        );

        if (!path) return;

        // === 延迟更新：统一在动画完成后更新 ===
        // 1. 立即视觉反馈
        const finalPos = path[path.length - 1];

        // 1.1 高亮目标位置
        const targetCell = gridCells[to.r]?.[col];
        if (targetCell?.gridGround) {
            gsap.to(targetCell.gridGround, {
                fill: "#ffff00",      // 黄色高亮
                autoAlpha: 0.6,
                duration: 0.2
            });
        }

        // 1.2 高亮路径
        path.forEach((pos, index) => {
            const cell = gridCells[pos.y]?.[pos.x];
            if (cell?.gridGround) {
                gsap.to(cell.gridGround, {
                    fill: "#00ffff",  // 青色路径
                    autoAlpha: 0.4,
                    duration: 0.1,
                    delay: index * 0.05
                });
            }
        });

        // 1.3 角色视觉状态
        if (character.container) {
            gsap.to(character.container, {
                filter: "brightness(1.2)",
                duration: 0.2
            });
        }

        // 2. 创建状态快照（保存移动前的位置）
        const snapshot = StateSnapshot.createSnapshot(game);
        const originalQ = character.q;
        const originalR = character.r;

        // 3. 创建回滚函数
        const rollback = () => {
            if (snapshot) {
                StateSnapshot.restoreSnapshot(game, snapshot);
                updateGame(() => { }); // 触发重新渲染
            } else {
                // 如果没有快照，至少恢复位置
                character.q = originalQ;
                character.r = originalR;
                updateGame(() => { });
            }
            console.log("Walk rolled back");
        };

        // 4. 准备更新数据（不立即应用）
        const pendingUpdate = {
            q: finalPos.x,
            r: finalPos.y
        };

        // 5. 转换为 CharacterIdentifier 格式
        const bossCharacter = characters.find(c => c.uid === "boss" && c.character_id !== character.character_id);
        const bossId = bossCharacter?.character_id;
        const minions = characters.filter(c => c.uid === "boss" && c.character_id !== bossId);

        const characterIdentifier = toCharacterIdentifier(character, {
            boss: bossId ? {
                bossId,
                minions: minions.map(m => ({ minionId: m.character_id }))
            } : undefined
        });

        // 6. 添加到操作队列（基于快照管理）
        const operationId = operationQueue.addOperation({
            type: 'walk',
            timestamp: Date.now(),
            snapshot,
            rollback,
            data: {
                to: { q: col, r: to.r },
                identifier: characterIdentifier,
                characterId: character.character_id
            }
        });

        // 7. 执行动画
        playWalk(character, path, async () => {
            // === 动画完成后统一更新 ===

            // 1. 应用状态更新（乐观执行）
            character.q = pendingUpdate.q;
            character.r = pendingUpdate.r;
            updateGame(() => { }); // 触发重新渲染

            // 2. 清除视觉反馈
            if (character.container) {
                gsap.set(character.container, { filter: "none" });
            }

            // 清除路径高亮
            path.forEach(pos => {
                const cell = gridCells[pos.y]?.[pos.x];
                if (cell?.gridGround) {
                    gsap.set(cell.gridGround, { fill: "black", autoAlpha: 0.1 });
                }
            });

            // 清除目标高亮
            if (targetCell?.gridGround) {
                gsap.set(targetCell.gridGround, { fill: "black", autoAlpha: 0.1 });
            }

            // 3. 验证后端
            try {
                const result = await convex.mutation((api as any).service.game.gameService.walk, {
                    gameId,
                    to: { q: col, r: to.r },
                    identifier: characterIdentifier
                });

                if (result.ok) {
                    // 后端确认：确认操作
                    operationQueue.confirmOperation(operationId);

                    // 计算得分
                    if (ruleManager && config) {
                        const action: CombatAction = {
                            uid,
                            character: character_id,
                            act: ACT_CODE.WALK,
                            data: { to }
                        };
                        const scoreDelta = ruleManager.calculateActionScore(action, config);
                        if (scoreDelta > 0) {
                            await updateScore(scoreDelta);
                        }
                    }
                } else {
                    // 后端拒绝：回滚操作
                    operationQueue.rollbackOperation(operationId);
                    console.error("Walk rejected by backend:", result.error);
                    // TODO: 显示用户友好的错误提示
                }
            } catch (error) {
                // 网络错误：回滚操作
                console.error("Walk failed", error);
                operationQueue.rollbackOperation(operationId);
                // TODO: 显示网络错误提示
            }
        });
    }, [playerUid, map, gameId, characters, currentRound, gridCells, convex, ruleManager, config, updateScore, playWalk, game, operationQueue, updateGame]);

    const selectSkill = useCallback(async (skill: Skill) => {
        if (!currentRound || !gameId) return;

        const currentTurn = currentRound.turns.find(
            (t) => t.status === 1 || t.status === 2
        );
        if (!currentTurn) return;

        // PVE模式：如果是Boss回合（uid="boss"），不执行玩家操作
        if (currentTurn.uid !== playerUid) return;

        currentTurn.skillSelect = skill.id;
        setActiveSkill(skill);

        playSkillSelect(
            {
                uid: currentTurn.uid,
                character_id: currentTurn.character_id,
                skillId: skill.id
            },
            () => { }
        );

        try {
            await convex.mutation((api as any).service.game.gameService.selectSkill, {
                gameId,
                data: {
                    skillId: skill.id
                }
            });

            // 计算得分
            if (ruleManager && config) {
                const action: CombatAction = {
                    uid: currentTurn.uid,
                    character: currentTurn.character_id,
                    act: ACT_CODE.STAND,
                    data: { skill }
                };
                const scoreDelta = ruleManager.calculateActionScore(action, config);
                if (scoreDelta > 0) {
                    await updateScore(scoreDelta);
                }
            }
        } catch (error) {
            console.error("Select skill failed", error);
        }
    }, [currentRound, gameId, playerUid, playSkillSelect, setActiveSkill, convex, ruleManager, config, updateScore]);

    const standBy = useCallback((character: MonsterSprite) => {
        console.log("standBy", character);
    }, []);

    const defend = useCallback(() => {
        console.log("defend");
    }, []);

    const gameOver = useCallback(async () => {
        if (!gameId) return;

        try {
            const result = await convex.mutation((api as any).service.game.gameService.gameOver, {
                gameId
            });

            if (result.ok && result.data) {
                // 提交最终分数
                submitScore(result.data.totalScore);
            }
        } catch (error) {
            console.error("Game over failed", error);
        }
    }, [gameId, convex, submitScore]);

    // 处理Boss回合（预测执行）
    const handleBossTurn = useCallback(async (bossCharacter: MonsterSprite) => {
        if (!gameId || !game || !currentRound || !characters) return;

        const round = currentRound.no || 0;

        // 避免重复处理同一回合
        if (bossTurnProcessedRef.current.has(round)) {
            return;
        }
        bossTurnProcessedRef.current.add(round);

        // 获取seed（从boss.behaviorSeed获取）
        const behaviorSeed = (game as any).boss?.behaviorSeed || (game as any).seed || `game_${gameId}`;

        // 获取玩家角色（目标）
        const targets = characters.filter(
            (c) => c.uid === playerUid && (c.stats?.hp?.current || 0) > 0
        );

        // 获取Boss配置（可以从游戏状态或默认配置获取）
        const phaseConfig = (game as any).config?.bossPhaseConfig || null;

        // === 步骤1：预测执行 ===
        const predictedDecision = await bossAIPredictor.predictBossAction({
            behaviorSeed,
            round,
            bossCharacter,
            targets,
            gameState: {
                round,
                playerCount: targets.length,
            },
            phaseConfig,
        });

        if (!predictedDecision) {
            console.warn("Boss AI预测失败，等待后端决策");
            return;
        }

        // === 步骤2：立即执行预测动作（动画）===
        predictedActionRef.current = predictedDecision;

        if (predictedDecision.bossAction.type === "attack" && predictedDecision.bossAction.target) {
            const target = targets.find(
                (c) => c.character_id === predictedDecision.bossAction.target?.character_id
            );
            if (target) {
                // 立即执行攻击动画（预测）
                // 注意：这里需要执行Boss的攻击，而不是玩家攻击
                // 暂时跳过，等待后端确认后执行
                console.log("✅ Boss AI预测攻击:", predictedDecision.bossAction);
            }
        } else if (predictedDecision.bossAction.type === "move" && predictedDecision.bossAction.position) {
            console.log("✅ Boss AI预测移动:", predictedDecision.bossAction.position);
            // TODO: 实现Boss移动动画
        } else if (predictedDecision.bossAction.type === "use_skill" && predictedDecision.bossAction.target) {
            const target = targets.find(
                (c) => c.character_id === predictedDecision.bossAction.target?.character_id
            );
            if (target && predictedDecision.bossAction.skillId) {
                console.log("✅ Boss AI预测技能:", predictedDecision.bossAction);
                // TODO: 实现Boss技能动画
            }
        }

        // === 步骤3：等待后端确认 ===
        // 后端会通过事件系统发送确认，在下面的useEffect中处理
    }, [gameId, game, currentRound, characters, playerUid, bossAIPredictor]);

    // AI 回合自动执行（修改为支持Boss预测）
    useEffect(() => {
        if (!game || !currentRound || !characters) return;

        const currentTurn = currentRound.turns.find(
            (t) => t.status === 1 || t.status === 2
        );
        if (!currentTurn) return;

        // PVE模式：检查是否是Boss回合
        // 所有Boss相关的角色（Boss本体 + 小怪）都使用 uid === "boss"
        const isBossTurn = currentTurn.uid === "boss" || currentTurn.uid?.startsWith("boss_");
        const character = characters.find(
            (c) => c.uid === currentTurn.uid && c.character_id === currentTurn.character_id
        );

        if (isBossTurn && character) {
            // Boss回合：使用预测执行
            handleBossTurn(character);
        }
        // PVE模式：所有敌人都是Boss相关的，无需其他AI分支
    }, [game, currentRound, characters, playerUid, handleBossTurn]);

    /**
     * 使用技能（调用后端API）
     * 注意：根据重构计划，技能效果统一由后端处理
     * @param skillId 技能ID
     * @param target 目标角色（可选）
     */
    const useSkill = useCallback(async (skillId: string, target?: MonsterSprite) => {
        if (!gameId || !characters || !currentRound || !game || !optimisticExecutor) return;

        const currentTurn = currentRound.turns.find(
            (t) => t.status === 1 || t.status === 2
        );
        if (!currentTurn) return;

        // PVE模式：如果是Boss回合（uid="boss"），不执行玩家操作
        if (currentTurn.uid !== playerUid) return;

        const { uid, character_id } = currentTurn;
        const character = characters.find(
            c => c.character_id === character_id && c.uid === uid
        );
        if (!character) return;

        // 转换为 CharacterIdentifier 格式
        const bossCharacters = characters.filter(c => c.uid === "boss");
        const bossId = bossCharacters.length > 0 ? bossCharacters[0].character_id : undefined;
        const minions = bossCharacters.slice(1);

        const casterIdentifier = toCharacterIdentifier(character, {
            boss: bossId ? {
                bossId,
                minions: minions.map(m => ({ minionId: m.character_id }))
            } : undefined
        });

        const targetIdentifiers: CharacterIdentifier[] = [];
        if (target) {
            const targetIdentifier = toCharacterIdentifier(target, {
                boss: bossId ? {
                    bossId,
                    minions: minions.map(m => ({ minionId: m.character_id }))
                } : undefined
            });
            targetIdentifiers.push(targetIdentifier);
        }

        // 获取游戏种子和回合号
        const gameSeed = (game as any).boss?.behaviorSeed || `game_${gameId}`;
        const round = currentRound.no || 0;

        // === 延迟更新：统一在动画完成后更新 ===
        // 1. 立即视觉反馈
        if (character.container) {
            gsap.to(character.container, {
                scale: 1.05,
                duration: 0.1,
                yoyo: true,
                repeat: 1
            });
        }

        if (target && target.container) {
            gsap.to(target.container, {
                scale: 1.1,
                duration: 0.1,
                yoyo: true,
                repeat: 1
            });
        }

        // 2. 创建状态快照
        const snapshot = StateSnapshot.createSnapshot(game);
        if (!snapshot) {
            console.error("Failed to create snapshot for skill use");
            return;
        }

        // 3. 准备更新数据（不立即应用）
        const pendingUpdate = {
            snapshot,
            rollback: () => {
                if (snapshot) {
                    StateSnapshot.restoreSnapshot(game, snapshot);
                    updateGame(() => { });
                }
            }
        };

        try {
            // 4. 乐观执行（前端预先执行，但结果暂存）
            const optimisticResult = await optimisticExecutor.executeOptimistically(
                skillId,
                character,
                target ? [target] : [],
                gameSeed,
                round
            );

            // 5. 播放技能动画（使用统一的 playSkill）
            playSkill(
                character,
                skillId,
                target ? [target] : [],
                async () => {
                    // === 动画完成后统一应用更新 ===

                    // 应用乐观执行的结果（已经在 executeOptimistically 中执行了）
                    // 这里只需要触发重新渲染
                    updateGame(() => { });

                    // 清除视觉反馈
                    if (character.container) {
                        gsap.set(character.container, { scale: 1 });
                    }
                    if (target && target.container) {
                        gsap.set(target.container, { scale: 1 });
                    }

                    // 6. 发送请求到后端
                    const backendResponse = await convex.mutation((api as any).service.game.gameService.useSkill, {
                        gameId,
                        data: {
                            ...casterIdentifier,
                            skillId,
                            targets: targetIdentifiers.length > 0 ? targetIdentifiers : undefined
                        }
                    });

                    if (!backendResponse.ok) {
                        // 后端拒绝，回滚前端状态
                        console.error("Use skill failed", backendResponse.error);
                        pendingUpdate.rollback();
                        operationQueue.rollbackOperation(optimisticResult.operationId);
                        return;
                    }

                    const backendResult = backendResponse.result;

                    // 7. 验证结果
                    const validation = BackendValidator.validateOperation(
                        optimisticResult.result,
                        backendResult
                    );

                    // 8. 处理验证结果
                    if (validation.needsRollback) {
                        // 结果不一致，回滚前端状态
                        console.warn("Frontend and backend results mismatch, rolling back:", validation.differences);
                        BackendValidator.logValidationFailure(optimisticResult.operationId, validation);

                        pendingUpdate.rollback();
                        operationQueue.rollbackOperation(optimisticResult.operationId);

                        // 应用后端结果（通过事件系统同步）
                        // 注意：这里应该通过事件系统来同步后端状态，而不是直接修改
                        // 因为后端会发送事件更新前端状态
                    } else {
                        // 结果一致，确认操作
                        operationQueue.confirmOperation(optimisticResult.operationId);
                        console.log("Optimistic execution validated successfully");
                    }
                });
        } catch (error) {
            console.error("Use skill failed", error);
            // 网络错误等异常情况，回滚
            pendingUpdate.rollback();
        }
    }, [gameId, characters, currentRound, playerUid, convex, game, optimisticExecutor, operationQueue, updateGame, playSkill]);

    /**
     * 攻击方法（简化版：内部调用 useSkill）
     * attack 实际上是使用当前选择的技能（通常是普通攻击）进行攻击
     * 为了保持向后兼容和语义清晰，保留此方法作为 useSkill 的便捷包装
     */
    const attack = useCallback(async (character: MonsterSprite) => {
        if (!currentRound) return;

        const currentTurn = currentRound.turns.find(
            (t: any) => t.status === 1 || t.status === 2
        );
        if (!currentTurn) return;

        // 获取当前选择的技能ID（默认使用第一个技能，通常是普通攻击）
        const skillId = currentTurn.skillSelect ?? currentTurn.skills?.[0];
        if (!skillId) return;

        // 调用 useSkill（动画会根据技能配置自动选择）
        await useSkill(skillId, character);
    }, [currentRound, useSkill]);

    // 监听后端事件，验证Boss AI预测（使用轮询机制，避免依赖响应式更新）
    // 注意：walk 和 useSkill 的验证已在操作回调中直接处理（基于 OperationQueue），无需通过事件匹配
    useEffect(() => {
        if (!eventQueue || !Array.isArray(eventQueue)) return;

        const processEvents = () => {
            if (eventQueue.length === 0) return;

            eventQueue.forEach((backendEvent: any) => {
                // 处理 Boss AI 确认事件（验证预测）
                if (backendEvent.name === "bossAIDecision" && backendEvent.data && backendEvent.status === 0) {
                    const { decision, round, seed } = backendEvent.data;

                    const predicted = predictedActionRef.current;
                    if (predicted) {
                        const isConsistent = BossAILocal.isDecisionConsistent(
                            predicted.bossAction,
                            decision,
                            { targetChange: true }
                        );

                        const isValid = bossAIPredictor.verifyPrediction(
                            round,
                            { bossAction: decision },
                            (predictedAction, serverAction) => {
                                console.warn("Boss AI动作回滚:", {
                                    predicted: predictedAction,
                                    server: serverAction,
                                });
                            }
                        );

                        if (isValid) {
                            predictedActionRef.current = null;
                        } else {
                            predictedActionRef.current = null;
                        }
                    }

                    bossTurnProcessedRef.current.delete(round);
                    backendEvent.status = 1; // 标记为已处理
                }
            });
        };

        // 轮询处理事件（每200ms，比 useEventHandler 稍慢，因为验证不需要那么频繁）
        const intervalId = setInterval(processEvents, 200);
        return () => clearInterval(intervalId);
    }, [eventQueue, bossAIPredictor]);

    return {
        walk,
        attack,
        defend,
        standBy,
        selectSkill,
        useSkill,
        gameOver
    };
};

export default useCombatActHandler;


