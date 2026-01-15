/**
 * 游戏阶段管理服务
 * 负责阶段推进、被动技能触发
 */

import { internal } from "../../../_generated/api";
import { GameBoss, GameMinion, GameMonster } from "../../types/monsterTypes";
import { CharacterIdentifier, CombatTurn } from "../../types/gameTypes";
import { PhaseChanges } from "../../types/gameTypes";
import { SkillManager } from "../skill/skillManager";
import { CharacterQueryService } from "./characterQueryService";
import { CharacterUpdateService } from "./characterUpdateService";
import { RoundService } from "./roundService";
import { GameLifecycleService } from "./gameLifecycleService";
import { GameScoreService } from "./gameScoreService";

export class GamePhaseService {
    constructor(
        private dbCtx: any,
        private characterQueryService: CharacterQueryService,
        private characterUpdateService: CharacterUpdateService,
        private roundService: RoundService,
        private lifecycleService: GameLifecycleService,
        private scoreService: GameScoreService
    ) {}

    /**
     * 触发被动技能
     * @param gameId 游戏ID
     * @param triggerType 触发类型（如 "round_start", "turn_start"）
     * @param targetCharacter 目标角色（可选，如果提供则只检查该角色，否则检查所有存活角色）
     */
    async triggerPassiveSkills(
        gameId: string,
        triggerType: "round_start" | "turn_start",
        targetCharacter?: GameMonster
    ): Promise<void> {
        const game = await this.lifecycleService.load(gameId);
        if (!game) return;

        this.characterQueryService.setGame(game);

        const charactersToCheck: GameMonster[] = targetCharacter
            ? [targetCharacter]
            : this.characterQueryService.getAllCharacters().filter(char => (char.stats?.hp?.current ?? 0) > 0);

        for (const character of charactersToCheck) {
            if (!character.skills || !Array.isArray(character.skills)) continue;

            // 检查所有技能（skills 是 string[]）
            for (const skillId of character.skills) {
                const skillIdStr = skillId;

                // 检查是否应该触发被动技能
                if (SkillManager.shouldTriggerPassiveSkill(skillIdStr, character, triggerType)) {
                    // 获取被动技能效果
                    const effects = SkillManager.getPassiveSkillEffects(skillIdStr, triggerType);

                    // 应用效果到角色自身（被动技能通常作用于自身）
                    for (const effect of effects) {
                        SkillManager.applyEffectToTarget(effect, character, character);
                    }

                    // 更新角色到数据库（统一使用 updateCharacterInDatabase，它会自动处理玩家、Boss、小怪）
                    await this.characterUpdateService.updateCharacterInDatabase(
                        gameId,
                        character,
                        game
                    );
                }
            }
        }

        // 重新加载游戏状态以同步更新
        await this.lifecycleService.load(gameId);
    }

    /**
     * 推进回合和阶段
     * 在玩家动作执行后调用，自动处理：
     * 1. 标记当前回合为完成
     * 2. 检查是否所有回合都完成
     * 3. 如果完成，结束当前回合并开始新回合
     * 4. 新回合开始时，如果是Boss回合，自动执行Boss AI动作
     * 5. 触发被动技能（round_start, turn_start）
     * 6. 返回所有阶段变化信息（供前端直接使用，不再依赖事件）
     * 
     * @param gameId 游戏ID
     * @param characterIdentifier 执行动作的角色标识符
     * @param ctx Convex context（用于调用 internal mutation）
     * @returns 阶段变化信息
     */
    async advanceTurnAndRound(gameId: string, characterIdentifier: CharacterIdentifier, ctx?: any): Promise<PhaseChanges> {
        const changes: PhaseChanges = {};
        const game = await this.lifecycleService.load(gameId);
        if (!game || !game.currentRound) return changes;

        this.characterQueryService.setGame(game);

        const currentRound = game.currentRound;
        const roundNumber = currentRound.no;

        // 1. 标记当前回合为完成
        const roundDoc = await this.dbCtx.db
            .query("tacticalMonster_game_round")
            .withIndex("by_game_round", (q: any) =>
                q.eq("gameId", gameId).eq("no", roundNumber)
            )
            .unique();

        if (!roundDoc) return changes;

        // 找到当前回合并标记为完成
        const { monsterId, bossId, minionId } = characterIdentifier;
        const currentTurn = roundDoc.turns.find((turn: CombatTurn) => {
            if (monsterId) {
                return turn.uid !== "boss" && turn.monsterId === monsterId;
            } else if (bossId) {
                return turn.uid === "boss" && turn.monsterId === game?.boss?.monsterId;
            } else if (minionId) {
                return turn.uid === "boss" && turn.monsterId === game?.boss?.minions?.find((m: any) => m.minionId === minionId)?.monsterId;
            }
            return false;
        });

        if (currentTurn && currentTurn.status !== 3) {
            // 更新回合状态为完成
            const updatedTurns = roundDoc.turns.map((turn: CombatTurn) =>
                turn.uid === currentTurn.uid && turn.monsterId === currentTurn.monsterId
                    ? { ...turn, status: 3, endTime: Date.now() }
                    : turn
            );

            await this.dbCtx.db.patch(roundDoc._id, {
                turns: updatedTurns,
            });

            // 记录 turnEnd 变化（不再发送事件，直接返回）
            changes.turnEnd = {
                uid: currentTurn.uid,
                monsterId: currentTurn.monsterId,
                round: roundNumber,
            };
        }

        // 2. 检查是否所有回合都完成
        const allTurnsCompleted = roundDoc.turns.every((turn: CombatTurn) => turn.status === 3);

        if (allTurnsCompleted) {
            // 3. 结束当前回合
            await this.roundService.endRound(gameId, roundNumber);

            // 记录 roundEnd 变化
            changes.roundEnd = { round: roundNumber };

            // 4. 检查游戏是否结束
            const gameStatus = await this.scoreService.checkAndUpdateGameStatus(gameId);
            if (gameStatus?.isGameOver) {
                changes.gameOver = {
                    result: gameStatus.result,
                    reason: gameStatus.reason,
                };
                return changes; // 游戏结束，不再推进
            }

            // 5. 开始新回合
            const newRoundNo = roundNumber + 1;
            const roundStarted = await this.roundService.createRound(gameId, newRoundNo, game);
            if (!roundStarted) return changes;

            // 创建新回合事件
            const { GameEventService } = await import("./gameEventService");
            const eventService = new GameEventService(this.dbCtx);
            const event = eventService.createNewRoundEvent(gameId, newRoundNo);
            await eventService.createEvent(event);
            await this.lifecycleService.save(gameId, { round: newRoundNo, lastUpdate: new Date().toISOString() });

            // 记录 roundStart 变化
            changes.roundStart = { round: newRoundNo };

            // 6. 触发所有存活角色的 round_start 被动技能
            await this.triggerPassiveSkills(gameId, "round_start");

            // 7. 重新加载游戏状态以获取新回合信息
            const updatedGame = await this.lifecycleService.load(gameId);
            if (!updatedGame || !updatedGame.currentRound) return changes;

            this.characterQueryService.setGame(updatedGame);

            // 7. 检查新回合的第一个回合是否是Boss回合
            const newRoundDoc = await this.dbCtx.db
                .query("tacticalMonster_game_round")
                .withIndex("by_game_round", (q: any) =>
                    q.eq("gameId", gameId).eq("no", newRoundNo)
                )
                .unique();

            if (newRoundDoc && newRoundDoc.turns.length > 0) {
                const firstTurn = newRoundDoc.turns[0];

                // 记录 turnStart 变化
                changes.turnStart = {
                    uid: firstTurn.uid,
                    monsterId: firstTurn.monsterId,
                    round: newRoundNo,
                };

                // 获取当前回合的角色并触发 turn_start 被动技能
                const { monsterId: turnMonsterId, bossId: turnBossId, minionId: turnMinionId } = 
                    this.characterQueryService.getCharacterParams(firstTurn.uid, firstTurn.monsterId);
                const turnCharacter = this.characterQueryService.getCharacter(turnMonsterId, turnBossId, turnMinionId);
                if (turnCharacter) {
                    await this.triggerPassiveSkills(gameId, "turn_start", turnCharacter);
                }

                // 更新回合状态为进行中
                const updatedTurns = newRoundDoc.turns.map((turn: CombatTurn) =>
                    turn.uid === firstTurn.uid && turn.monsterId === firstTurn.monsterId
                        ? { ...turn, status: 1, startTime: Date.now() }
                        : turn
                );

                await this.dbCtx.db.patch(newRoundDoc._id, {
                    turns: updatedTurns,
                });

                // 如果是Boss回合，立即执行Boss AI动作并返回结果
                if (firstTurn.uid === "boss" && ctx) {
                    // 直接调用 handleBossTurn（内部mutation，同步执行）
                    const bossActionResult = await ctx.runMutation(
                        internal.service.boss.ai.bossTurnHandler.handleBossTurn,
                        {
                            gameId,
                            round: newRoundNo,
                        }
                    );

                    if (bossActionResult?.ok && bossActionResult.decision) {
                        changes.bossAIAction = {
                            decision: bossActionResult.decision,
                            executionResults: bossActionResult.executionResults || { boss: { ok: true }, minions: [] },
                            phaseTransition: bossActionResult.phaseTransition,
                        };
                    }
                }
            }
        } else {
            // 还有未完成的回合，推进到下一个回合
            const nextTurn = roundDoc.turns.find((turn: CombatTurn) => turn.status === 0);
            if (nextTurn) {
                // 更新下一个回合状态为进行中
                const updatedTurns = roundDoc.turns.map((turn: CombatTurn) =>
                    turn.uid === nextTurn.uid && turn.monsterId === nextTurn.monsterId
                        ? { ...turn, status: 1, startTime: Date.now() }
                        : turn
                );

                await this.dbCtx.db.patch(roundDoc._id, {
                    turns: updatedTurns,
                });

                // 记录 turnStart 变化
                changes.turnStart = {
                    uid: nextTurn.uid,
                    monsterId: nextTurn.monsterId,
                    round: roundNumber,
                };

                // 获取当前回合的角色并触发 turn_start 被动技能
                const { monsterId: turnMonsterId, bossId: turnBossId, minionId: turnMinionId } = 
                    this.characterQueryService.getCharacterParams(nextTurn.uid, nextTurn.monsterId);
                const turnCharacter = this.characterQueryService.getCharacter(turnMonsterId, turnBossId, turnMinionId);
                if (turnCharacter) {
                    await this.triggerPassiveSkills(gameId, "turn_start", turnCharacter);
                }

                // 如果是Boss回合，立即执行Boss AI动作并返回结果
                if (nextTurn.uid === "boss" && ctx) {
                    // 直接调用 handleBossTurn（内部mutation，同步执行）
                    const bossActionResult = await ctx.runMutation(
                        internal.service.boss.ai.bossTurnHandler.handleBossTurn,
                        {
                            gameId,
                            round: roundNumber,
                        }
                    );

                    if (bossActionResult?.ok && bossActionResult.decision) {
                        changes.bossAIAction = {
                            decision: bossActionResult.decision,
                            executionResults: bossActionResult.executionResults || { boss: { ok: true }, minions: [] },
                            phaseTransition: bossActionResult.phaseTransition,
                        };
                    }
                }
            }
        }

        return changes;
    }
}

