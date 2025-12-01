/**
 * Tactical Monster 战斗操作处理器
 * 参考 solitaireSolo 的 useActHandler 模式
 */

import { useConvex } from "convex/react";
import { useCallback, useEffect, useRef } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../../../../convex/tacticalMonster/convex/_generated/api";
import usePlayAttack from "../../animation/usePlayAttack";
import usePlaySkillSelect from "../../animation/usePlaySkillSelect";
import usePlayWalk from "../../animation/usePlayWalk";
import { Skill } from "../../types/CharacterTypes";
import { ACT_CODE, CombatAction, GameCharacter, GameModel } from "../../types/CombatTypes";
import { findPath } from "../../utils/PathFind";
import { useCombatManager } from "../CombatManager";
import { SkillManager } from "../SkillManager";
import { BossAIDecision, BossAILocal } from "../boss/BossAILocal";
import { useBossAIPredictor } from "../boss/useBossAIPredictor";

const useCombatActHandler = () => {
    const { playSkillSelect } = usePlaySkillSelect();
    const { playAttack } = usePlayAttack();
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
        eventQueue
    } = useCombatManager();
    const convex = useConvex();

    // Boss AI预测器
    const bossAIPredictor = useBossAIPredictor();
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

    const attack = useCallback(async (character: GameCharacter) => {
        if (!gameId || !currentRound || !characters) return;

        const currentTurn = currentRound.turns.find(
            (t: any) => t.status === 1 || t.status === 2
        );
        if (!currentTurn) return;

        // 如果是 AI 回合，不执行玩家操作
        if (currentTurn.uid !== playerUid) return;

        const skillId = currentTurn.skillSelect ?? currentTurn.skills?.[0];
        if (!skillId) return;

        const attackerChar = characters.find(
            c => c.uid === currentTurn.uid && c.character_id === currentTurn.character_id
        );
        if (!attackerChar) return;

        const eventData = {
            attacker: {
                uid: currentTurn.uid,
                character_id: currentTurn.character_id,
                skillSelect: skillId
            },
            target: {
                uid: character.uid,
                character_id: character.character_id
            }
        };

        // 直接执行动画（参考 solitaireSolo 的方式）
        playAttack(
            {
                uid: eventData.attacker.uid,
                character_id: eventData.attacker.character_id,
                skillId: skillId
            },
            eventData.target,
            async () => {
                // 动画完成后保存到后端
                try {
                    const result = await convex.mutation((api as any).service.game.gameService.attack, {
                        gameId,
                        data: eventData
                    });

                    if (result.ok) {
                        // 计算得分
                        if (ruleManager && config) {
                            const action: CombatAction = {
                                uid: currentTurn.uid,
                                character: currentTurn.character_id,
                                act: ACT_CODE.ATTACK,
                                data: eventData
                            };
                            const scoreDelta = ruleManager.calculateActionScore(action, config);
                            if (scoreDelta > 0) {
                                await updateScore(scoreDelta);
                            }
                        }
                    }
                } catch (error) {
                    console.error("Attack failed", error);
                }
            }
        );
    }, [convex, currentRound, gameId, characters, playerUid, ruleManager, config, updateScore, playAttack]);

    const walk = useCallback(async (to: { q: number; r: number }) => {
        if (!gameId || !characters || !gridCells || !currentRound || !map) return;

        const currentTurn = currentRound.turns.find(
            (t) => t.status === 1 || t.status === 2
        );
        if (!currentTurn) return;

        // 如果是 AI 回合，不执行玩家操作
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
            canIgnoreObstacles  // 传递飞行标志
        );

        if (!path) return;

        // 立即更新本地状态
        const finalPos = path[path.length - 1];
        character.q = finalPos.x;
        character.r = finalPos.y;

        // 直接执行动画（参考 solitaireSolo 的方式）
        playWalk(character, path, async () => {
            // 动画完成后保存到后端
            try {
                const result = await convex.mutation((api as any).service.game.gameService.walk, {
                    gameId,
                    uid,
                    characterId: character_id,
                    to: { q: col, r: to.r }
                });

                if (result.ok) {
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
                }
            } catch (error) {
                console.error("Walk failed", error);
            }
        });
    }, [playerUid, map, gameId, characters, currentRound, gridCells, convex, ruleManager, config, updateScore, playWalk]);

    const selectSkill = useCallback(async (skill: Skill) => {
        if (!currentRound || !gameId) return;

        const currentTurn = currentRound.turns.find(
            (t) => t.status === 1 || t.status === 2
        );
        if (!currentTurn) return;

        // 如果是 AI 回合，不执行玩家操作
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

    const standBy = useCallback((character: GameCharacter) => {
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
    const handleBossTurn = useCallback(async (bossCharacter: GameCharacter) => {
        if (!gameId || !game || !currentRound || !characters) return;

        const round = currentRound.no || 0;

        // 避免重复处理同一回合
        if (bossTurnProcessedRef.current.has(round)) {
            return;
        }
        bossTurnProcessedRef.current.add(round);

        // 获取seed（后端返回的数据中有seed，但类型定义中没有）
        const behaviorSeed = (game as any).seed || "";

        // 获取玩家角色（目标）
        const targets = characters.filter(
            (c) => c.uid === playerUid && (c.stats?.hp?.current || 0) > 0
        );

        // 获取Boss配置（可以从游戏状态或默认配置获取）
        const phaseConfig = (game as any).config?.bossPhaseConfig || null;

        // === 步骤1：预测执行 ===
        const predictedDecision = bossAIPredictor.predictBossAction({
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

        // 检查是否是Boss回合
        // 注意：所有敌人都是Boss相关的（Boss本体 + 小怪），都使用 uid === "boss"
        const isBossTurn = currentTurn.uid === "boss" || currentTurn.uid?.startsWith("boss_");
        const character = characters.find(
            (c) => c.uid === currentTurn.uid && c.character_id === currentTurn.character_id
        );

        if (isBossTurn && character) {
            // Boss回合：使用预测执行
            handleBossTurn(character);
        }
        // 注意：移除了普通AI分支，因为游戏中所有敌人都是Boss相关的
        // 如果未来需要普通AI敌人，可以在这里添加 else if 分支
    }, [game, currentRound, characters, playerUid, handleBossTurn]);

    /**
     * 使用技能（执行技能效果）
     */
    const useSkill = useCallback(async (skillId: string, target?: GameCharacter) => {
        if (!gameId || !characters || !currentRound || !game) return;

        const currentTurn = currentRound.turns.find(
            (t) => t.status === 1 || t.status === 2
        );
        if (!currentTurn) return;

        // 如果是 AI 回合，不执行玩家操作
        if (currentTurn.uid !== playerUid) return;

        const { uid, character_id } = currentTurn;
        const character = characters.find(
            c => c.character_id === character_id && c.uid === uid
        );
        if (!character) return;

        // 创建技能管理器
        const gameModel: GameModel = {
            gameId: gameId,
            map: map!,
            playerUid: playerUid,
            characters: characters,
            currentRound: currentRound
        };
        const skillManager = new SkillManager(character, gameModel);

        // 使用技能（本地处理技能效果）
        await skillManager.useSkill(skillId, target);

        // 注意：技能使用通常通过 selectSkill + attack 完成
        // 角色的状态更改会通过后续的 attack/walk 等动作自动同步到服务器
    }, [gameId, characters, currentRound, playerUid, map, game]);

    // 监听Boss AI确认事件（验证预测）
    useEffect(() => {
        if (!eventQueue || !Array.isArray(eventQueue) || eventQueue.length === 0) return;

        eventQueue.forEach((event: any) => {
            if (event.name === "bossAIDecision" && event.data && event.status === 0) {
                const { decision, round, seed } = event.data;

                // 验证预测
                const predicted = predictedActionRef.current;
                if (predicted) {
                    const isConsistent = BossAILocal.isDecisionConsistent(
                        predicted.bossAction,
                        decision,
                        { targetChange: true } // 允许目标变化（如目标已死亡）
                    );

                    if (!isConsistent) {
                        console.warn("⚠️ Boss AI预测不一致，需要回滚", {
                            predicted: predicted.bossAction,
                            server: decision,
                            round,
                        });

                        // TODO: 实现回滚逻辑
                        // 这里需要回滚之前的动画和状态
                        // 然后重新执行服务器决策
                        predictedActionRef.current = null;
                    } else {
                        console.log("✅ Boss AI预测正确", { round });
                        predictedActionRef.current = null;
                    }
                }

                // 清理已处理的回合记录
                bossTurnProcessedRef.current.delete(round);
            }
        });
    }, [eventQueue]);

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


