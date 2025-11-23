/**
 * Tactical Monster 战斗操作处理器
 * 参考 solitaireSolo 的 useActHandler 模式
 */

import { useConvex } from "convex/react";
import { useCallback, useEffect, useMemo } from "react";
import { useUserManager } from "service/UserManager";
import { api } from "../../../../../../../convex/tacticalMonster/convex/_generated/api";
import usePlayAttack from "../../animation/usePlayAttack";
import usePlaySkillSelect from "../../animation/usePlaySkillSelect";
import usePlayWalk from "../../animation/usePlayWalk";
import { Skill } from "../../types/CharacterTypes";
import { ACT_CODE, CombatAction, GameCharacter, GameModel } from "../../types/CombatTypes";
import { findPath } from "../../utils/PathFind";
import AIController from "../AIController";
import { useCombatManager } from "../CombatManager";
import { SkillManager } from "../SkillManager";

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
        setActiveSkill
    } = useCombatManager();
    const convex = useConvex();

    // 创建 AI 控制器
    const aiController = useMemo(() => {
        if (!game || !gridCells || !currentRound || !playerUid) return null;
        return new AIController(game, gridCells, currentRound, playerUid);
    }, [game, gridCells, currentRound, playerUid]);

    // 更新分数
    const updateScore = useCallback(async (scoreDelta: number) => {
        if (!gameId) return;
        try {
            await convex.mutation(api.service.gameManager.updateScore, {
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
                    const result = await convex.mutation(api.service.gameManager.attack, {
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
                const result = await convex.mutation(api.service.gameManager.walk, {
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
            await convex.mutation(api.service.gameManager.selectSkill, {
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

    /**
     * 使用技能（执行技能效果）
     */
    const useSkill = useCallback(async (skillId: string, target?: GameCharacter) => {
        if (!gameId || !characters || !currentRound) return;

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
        const gameModel = {
            gameId: gameId,
            map: map!,
            playerUid: playerUid,
            characters: characters,
            currentRound: currentRound
        };
        const skillManager = new SkillManager(character, gameModel);

        // 使用技能
        await skillManager.useSkill(skillId, target);

        // 同步到服务器
        try {
            await convex.mutation(api.service.gameManager.updateCharacter, {
                gameId,
                data: {
                    uid: character.uid,
                    character_id: character.character_id,
                    character: character
                }
            });
        } catch (error) {
            console.error("Use skill failed", error);
        }
    }, [gameId, characters, currentRound, playerUid, map, convex]);

    const standBy = useCallback((character: GameCharacter) => {
        console.log("standBy", character);
    }, []);

    const defend = useCallback(() => {
        console.log("defend");
    }, []);

    const gameOver = useCallback(async () => {
        if (!gameId) return;

        try {
            const result = await convex.mutation(api.service.gameManager.gameOver, {
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

    // AI 回合自动执行
    useEffect(() => {
        if (!aiController || !game || !currentRound || !characters) return;

        const currentTurn = currentRound.turns.find(
            (t) => t.status === 1 || t.status === 2
        );
        if (!currentTurn) return;

        // 如果是 AI 回合，自动执行动作
        if (currentTurn.uid !== playerUid) {
            const character = characters.find(
                (c) => c.uid === currentTurn.uid && c.character_id === currentTurn.character_id
            );
            if (character) {
                const action = aiController.getNextAction(character);
                if (action) {
                    // 延迟执行 AI 动作（模拟思考时间）
                    const timer = setTimeout(() => {
                        if (action.type === "attack" && action.data) {
                            const target = characters.find(
                                (c) => c.uid === action.data.target.uid &&
                                    c.character_id === action.data.target.character_id
                            );
                            if (target) {
                                // AI 攻击直接调用，不需要等待
                                attack(target);
                            }
                        } else if (action.type === "walk" && action.data) {
                            // AI 移动直接调用，不需要等待
                            walk(action.data.to);
                        }
                    }, 1000); // 1 秒延迟

                    return () => clearTimeout(timer);
                }
            }
        }
    }, [aiController, game, currentRound, characters, playerUid, attack, walk]);

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

        // 使用技能
        await skillManager.useSkill(skillId, target);

        // 同步到服务器
        try {
            await convex.mutation(api.service.gameManager.updateCharacter, {
                gameId,
                data: {
                    uid: character.uid,
                    character_id: character.character_id,
                    character: character
                }
            });
        } catch (error) {
            console.error("Use skill failed", error);
        }
    }, [gameId, characters, currentRound, playerUid, map, game, convex]);

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


