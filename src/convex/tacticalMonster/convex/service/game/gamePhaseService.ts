/**
 * 游戏阶段管理服务
 * 负责阶段推进、被动技能触发
 */

import { internal } from "../../_generated/api";
import { CharacterIdentifier, CombatEvent, GameRound, GameTurn, PhaseChanges, TriggeredPassiveSkill } from "../../types/gameTypes";
import { GameMonster } from "../../types/monsterTypes";
import { processStatusEffects } from "../skill/StatusEffectProcessor";
import { SkillManager } from "../skill/skillManager";
import { CharacterQueryService } from "./characterQueryService";
import { CharacterUpdateService } from "./characterUpdateService";
import { GameEventService } from "./gameEventService";
import { GameLifecycleService } from "./gameLifecycleService";
import { getModeTypeForRuleId } from "../../utils/tournamentModeType";
import { GameRuleConfigService } from "./gameRuleConfigService";
import { GameScoreService } from "./gameScoreService";
import { TutorialProgressService } from "./tutorialProgressService";
import { RoundService } from "./roundService";

export class GamePhaseService {
    constructor(
        private dbCtx: any,
        private characterQueryService: CharacterQueryService,
        private characterUpdateService: CharacterUpdateService,
        private roundService: RoundService,
        private lifecycleService: GameLifecycleService,
        private scoreService: GameScoreService
    ) { }

    /** 按标识符在 roundDoc.turns 中查找对应回合（identifier 的 monsterId/bossId/minionId 即实例 id，与 turn.character_id 一致） */
    private findTurnByIdentifier(roundDoc: { turns: GameTurn[] }, characterIdentifier: CharacterIdentifier): GameTurn | undefined {
        const characterId = characterIdentifier.monsterId ?? characterIdentifier.bossId ?? characterIdentifier.minionId;
        if (!characterId) return undefined;
        return roundDoc.turns.find((turn: GameTurn) => turn.character_id === characterId);
    }

    /** 判断两条 turn 是否指向同一角色 */
    private turnsMatch(turn: GameTurn, turnToMatch: GameTurn): boolean {
        return turn.uid === turnToMatch.uid && turn.character_id === turnToMatch.character_id;
    }

    /** 返回 status===0 且按 order 排序后的第一个回合。若已有 status===1（进行中），则返回 undefined，避免跳过当前回合去处理后面的 turn。 */
    private getNextPendingTurn(roundDoc: { turns: GameTurn[] }): GameTurn | undefined {
        const hasInProgress = roundDoc.turns.some((t: GameTurn) => t.status === 1);
        if (hasInProgress) return undefined;
        return roundDoc.turns
            .filter((turn: GameTurn) => turn.status === 0)
            .sort((a: GameTurn, b: GameTurn) => (a.order || 0) - (b.order || 0))[0];
    }

    /** 按 gameId、roundNo 查询 mr_game_round 文档（有重复时取最新） */
    private async loadRoundDoc(gameId: string, roundNo: number): Promise<{ _id: any; turns: GameTurn[] } | null> {
        return await this.roundService.getRoundDoc(gameId, roundNo);
    }

    /** 与 advanceTurnAndRound 一致：从 DB 读当前轮 turns，供 phaseChanges 片段带权威快照 */
    private async buildRoundSnapshot(gameId: string, roundNo: number): Promise<GameRound | undefined> {
        const doc = await this.loadRoundDoc(gameId, roundNo);
        if (!doc?.turns?.length) return undefined;
        return {
            no: roundNo,
            turns: doc.turns.map((t: GameTurn) => ({ ...t })),
        };
    }

    /** 将匹配 turnToMatch 的回合状态改为 newStatus 并写回数据库；status=2 时写入 actionOrder 记录实际出手顺序 */
    private async patchTurnStatus(
        roundDoc: { _id: any; turns: GameTurn[] },
        turnToMatch: GameTurn,
        newStatus: number
    ): Promise<void> {
        const fresh = await this.dbCtx.db.get(roundDoc._id);
        const turns = (fresh?.turns ?? roundDoc.turns) as GameTurn[];
        const completedCount = turns.filter((t: GameTurn) => (t.status ?? 0) === 2).length;
        const updatedTurns = turns.map((turn: GameTurn) => {
            if (!this.turnsMatch(turn, turnToMatch)) return turn;
            const updated = { ...turn, status: newStatus };
            if (newStatus === 2) {
                (updated as GameTurn).actionOrder = completedCount + 1;
            }
            return updated;
        });
        await this.dbCtx.db.patch(roundDoc._id, { turns: updatedTurns });
    }

    /**
     * 统一处理「开启该玩家回合」：tick、更新 DB、重载 game、设置 turnStart；死亡/眩晕则标记完成并返回 skipToNext。
     */
    private async processPlayerTurnStart(
        gameId: string,
        roundNo: number,
        nextTurn: GameTurn,
        roundDoc: { _id: any; turns: GameTurn[] },
        gameRef: { current: any },
        changes: PhaseChanges
    ): Promise<{ skipToNext: boolean }> {
        changes.turnStart = {
            uid: nextTurn.uid,
            character_id: nextTurn.character_id,
            round: roundNo,
        };

        const { monsterId: turnMonsterId, bossId: turnBossId, minionId: turnMinionId } =
            this.characterQueryService.getCharacterParams(nextTurn.uid, nextTurn.character_id);
        const turnCharacter = this.characterQueryService.getCharacter(turnMonsterId, turnBossId, turnMinionId);
        if (turnCharacter) {
            // 每回合开始：玩家角色 +5 能量
            if (turnCharacter.uid !== "boss" && turnCharacter.stats) {
                if (!turnCharacter.stats.energy) {
                    turnCharacter.stats.energy = { current: 0, max: 100 };
                }
                const cur = turnCharacter.stats.energy.current ?? 0;
                const max = turnCharacter.stats.energy.max ?? 100;
                turnCharacter.stats.energy.current = Math.min(max, cur + 5);
            }
            const tickResult = processStatusEffects(turnCharacter);
            if ((turnCharacter.stats?.hp?.current ?? 0) <= 0) turnCharacter.status = "dead";
            await this.characterUpdateService.updateCharacterInDatabase(gameId, turnCharacter, gameRef.current);
            const reloaded = await this.lifecycleService.load(gameId);
            if (reloaded) {
                gameRef.current = reloaded;
                this.characterQueryService.setGame(reloaded);
            }
            if (changes.turnStart) {
                (changes.turnStart as any).statusEffectChanges = {
                    expired: tickResult.expired.map((e) => ({ id: e.id, type: e.type, name: e.name })),
                    ticked: tickResult.ticked,
                    characterState: tickResult.characterState,
                };
            }
            if (turnCharacter.status === "dead" || turnCharacter.status === "stunned") {
                await this.patchTurnStatus(roundDoc, nextTurn, 2);
                return { skipToNext: true };
            }
            const turnStartPassiveSkills = await this.triggerPassiveSkills(gameId, "turn_start", turnCharacter);
            if (changes.turnStart) (changes.turnStart as any).triggeredPassiveSkills = turnStartPassiveSkills;
        }
        await this.patchTurnStatus(roundDoc, nextTurn, 1);
        // turnStart 标记后重新加载，确保后续 currentRound 快照包含 status=1
        const reloadedAfterTurnStart = await this.lifecycleService.load(gameId);
        if (reloadedAfterTurnStart) {
            gameRef.current = reloadedAfterTurnStart;
            this.characterQueryService.setGame(reloadedAfterTurnStart);
        }
        return { skipToNext: false };
    }

    /**
     * 处理单次 Boss 回合：tick、被动、执行 Boss AI、标记完成，返回一个 bossAIActions 项。
     */
    private async processBossTurn(
        gameId: string,
        roundNo: number,
        nextTurn: GameTurn,
        roundDoc: { _id: any; turns: GameTurn[] },
        gameRef: { current: any },
        ctx: any
    ): Promise<{
        turnStart: any;
        decision: any;
        executionResults: any;
        phaseTransition?: any;
        currentRoundWhenTurnActive?: GameRound;
        currentRoundWhenTurnComplete?: GameRound;
    }> {
        const turnStartInfo: any = {
            uid: nextTurn.uid,
            character_id: nextTurn.character_id,
            round: roundNo,
        };
        console.log("processBossTurn turnStartInfo", turnStartInfo);

        let turnStartPassiveSkills: any[] = [];
        const { monsterId: turnMonsterId, bossId: turnBossId, minionId: turnMinionId } =
            this.characterQueryService.getCharacterParams(nextTurn.uid, nextTurn.character_id);
        let turnCharacter = this.characterQueryService.getCharacter(turnMonsterId, turnBossId, turnMinionId);
        if (turnCharacter) {
            console.log("processBossTurn turnCharacter", turnCharacter);
            const tickResult = processStatusEffects(turnCharacter);
            if ((turnCharacter.stats?.hp?.current ?? 0) <= 0) turnCharacter.status = "dead";
            await this.characterUpdateService.updateCharacterInDatabase(gameId, turnCharacter, gameRef.current);
            const reloaded = await this.lifecycleService.load(gameId);
            if (reloaded) {
                gameRef.current = reloaded;
                this.characterQueryService.setGame(reloaded);
            }
            turnStartInfo.statusEffectChanges = {
                expired: tickResult.expired.map((e) => ({ id: e.id, type: e.type, name: e.name })),
                ticked: tickResult.ticked,
                characterState: tickResult.characterState,
            };
            if (turnCharacter.status !== "dead" && turnCharacter.status !== "stunned") {
                turnStartPassiveSkills = await this.triggerPassiveSkills(gameId, "turn_start", turnCharacter);
            }
        }
        turnStartInfo.triggeredPassiveSkills = turnStartPassiveSkills;

        // 标记 Boss 回合为进行中（status 1），否则 executeBossAction 内的 validateTurn 会失败
        await this.patchTurnStatus(roundDoc, nextTurn, 1);
        const currentRoundWhenTurnActive = await this.buildRoundSnapshot(gameId, roundNo);

        const skipBossAI = turnCharacter && (turnCharacter.status === "dead" || turnCharacter.status === "stunned");
        let bossActionResult: any = null;
        if (ctx && !skipBossAI) {
            bossActionResult = await ctx.runMutation(
                internal.service.boss.ai.bossTurnHandler.handleBossTurn,
                { gameId, round: roundNo }
            );
        }

        await this.patchTurnStatus(roundDoc, nextTurn, 2);
        const currentRoundWhenTurnComplete = await this.buildRoundSnapshot(gameId, roundNo);

        const bossTurnStart = { ...turnStartInfo };
        if (bossActionResult?.ok && bossActionResult.decision) {
            return {
                turnStart: bossTurnStart,
                decision: bossActionResult.decision,
                executionResults: bossActionResult.executionResults || { boss: { ok: true }, minions: [] },
                phaseTransition: bossActionResult.phaseTransition,
                currentRoundWhenTurnActive,
                currentRoundWhenTurnComplete,
            };
        }
        if (skipBossAI && turnStartInfo.statusEffectChanges) {
            return {
                turnStart: bossTurnStart,
                decision: null,
                executionResults: { skipped: true },
                currentRoundWhenTurnActive,
                currentRoundWhenTurnComplete,
            };
        }
        return {
            turnStart: bossTurnStart,
            decision: null,
            executionResults: null,
            currentRoundWhenTurnActive,
            currentRoundWhenTurnComplete,
        };
    }

    /**
     * 连续处理回合直到遇到玩家回合：循环取下一待执行回合，若是玩家则 processPlayerTurnStart 后 break（或 continue 若 skipToNext），若是 Boss 则 processBossTurn 并 continue。
     */
    private async processConsecutiveTurnsUntilPlayer(
        gameId: string,
        roundNo: number,
        gameRef: { current: any },
        changes: PhaseChanges,
        ctx: any
    ): Promise<void> {
        const bossAIActions: Array<{
            turnStart: any;
            decision: any;
            executionResults: any;
            phaseTransition?: any;
            currentRoundWhenTurnActive?: GameRound;
            currentRoundWhenTurnComplete?: GameRound;
        }> = [];
        const maxBossTurns = 10;

        for (let i = 0; i < maxBossTurns; i++) {
            const roundDoc = await this.loadRoundDoc(gameId, roundNo);
            if (!roundDoc) break;

            const nextTurn = this.getNextPendingTurn(roundDoc);
            if (!nextTurn) break;

            if (nextTurn.uid !== "boss") {
                const { skipToNext } = await this.processPlayerTurnStart(
                    gameId,
                    roundNo,
                    nextTurn,
                    roundDoc,
                    gameRef,
                    changes
                );
                if (skipToNext) continue;
                break;
            }

            const bossItem = await this.processBossTurn(
                gameId,
                roundNo,
                nextTurn,
                roundDoc,
                gameRef,
                ctx
            );
            bossAIActions.push(bossItem);
        }

        if (bossAIActions.length > 0) {
            changes.bossAIActions = bossAIActions;
        }
    }

    /** round 过渡后若缺少 turnStart，执行完整的 processPlayerTurnStart（含 tick、turn_start 被动技能、状态更新） */
    private async ensureTurnStartAfterRoundTransition(
        gameId: string,
        newRoundNo: number,
        gameRef: { current: any },
        changes: PhaseChanges
    ): Promise<void> {
        const roundDoc = await this.loadRoundDoc(gameId, newRoundNo);
        if (!roundDoc?.turns?.length) return;
        const nextTurn = [...roundDoc.turns]
            .filter((t: GameTurn) => t.status === 0 || t.status === 1)
            .sort((a: GameTurn, b: GameTurn) => (a.order || 0) - (b.order || 0))[0];
        if (!nextTurn || nextTurn.uid === "boss") return;
        await this.processPlayerTurnStart(gameId, newRoundNo, nextTurn, roundDoc, gameRef, changes);
    }

    /** 完成当前 round 并过渡到下一个 round：结束当前 round → 创建新 round → 处理连续 Boss turns → 确保 turnStart */
    private async transitionToNextRound(
        gameId: string,
        roundNumber: number,
        game: any,
        changes: PhaseChanges,
        ctx: any
    ): Promise<boolean> {
        const newRoundNo = await this.finishRoundAndStartNext(gameId, roundNumber, game, changes);
        if (newRoundNo === null) return false;
        const updatedGame = await this.lifecycleService.load(gameId);
        if (!updatedGame) return false;
        this.characterQueryService.setGame(updatedGame);
        const gameRef = { current: updatedGame };
        await this.processConsecutiveTurnsUntilPlayer(gameId, newRoundNo, gameRef, changes, ctx);
        if (changes.roundStart && !changes.turnStart) {
            await this.ensureTurnStartAfterRoundTransition(gameId, newRoundNo, gameRef, changes);
        }
        // 与 advanceTurnAndRound 一致：有 turnStart 时带最新 currentRound
        if (changes.turnStart && gameRef.current?.currentRound) {
            const round = gameRef.current.currentRound;
            const latestRoundDoc = await this.loadRoundDoc(gameId, round.no);
            const latestTurns = latestRoundDoc?.turns ?? round.turns ?? [];
            changes.currentRound = {
                no: round.no,
                turns: latestTurns.map((t: GameTurn) => ({ ...t })),
            };
        }
        return true;
    }

    /** 本轮结束时移除「仅在本轮生效」的防守减伤（defendRoundNo === 已结束轮号） */
    private async stripDefendingBuffsForCompletedRound(gameId: string, completedRoundNo: number): Promise<void> {
        const game = await this.lifecycleService.load(gameId);
        if (!game) return;
        this.characterQueryService.setGame(game);
        const chars = this.characterQueryService.getAllCharacters();
        let anyChanged = false;
        for (const char of chars) {
            if (!char.statusEffects?.length) continue;
            const next = char.statusEffects.filter(
                (se) => !(se.id === "defending" && se.defendRoundNo === completedRoundNo)
            );
            if (next.length !== char.statusEffects.length) {
                char.statusEffects = next;
                anyChanged = true;
                await this.characterUpdateService.updateCharacterInDatabase(gameId, char, game);
            }
        }
        if (anyChanged) {
            await this.lifecycleService.save(gameId, { lastUpdate: new Date().toISOString() });
        }
    }

    /** 结束当前轮、创建新轮、round_start 事件与 changes.roundStart；若游戏结束则返回 null，否则返回新轮号。 */
    private async finishRoundAndStartNext(
        gameId: string,
        roundNumber: number,
        game: any,
        changes: PhaseChanges
    ): Promise<number | null> {
        const lastRoundDoc = await this.loadRoundDoc(gameId, roundNumber);
        const lastRound: GameRound | undefined = lastRoundDoc?.turns?.length
            ? {
                no: roundNumber,
                turns: [...lastRoundDoc.turns]
                    .filter((t: GameTurn) => t.status !== 2)
                    .sort((a: GameTurn, b: GameTurn) => (a.order ?? 0) - (b.order ?? 0))
                    .concat(
                        [...lastRoundDoc.turns]
                            .filter((t: GameTurn) => t.status === 2)
                            .sort((a: GameTurn, b: GameTurn) =>
                                (a.actionOrder ?? a.order ?? 0) - (b.actionOrder ?? b.order ?? 0)
                            ),
                    ),
            }
            : undefined;
        await this.roundService.endRound(gameId, roundNumber);
        await this.stripDefendingBuffsForCompletedRound(gameId, roundNumber);
        changes.roundEnd = { round: roundNumber, ...(lastRound && { lastRound }) };
        const gameStatus = await this.scoreService.checkAndUpdateGameStatus(gameId);
        if (gameStatus?.isGameOver) {
            changes.gameOver = { result: gameStatus.result, reason: gameStatus.reason };
            return null;
        }
        // 教学关回合上限：默认 6 回合（可通过 starRatingConfig.threeStarMaxRounds 覆盖）
        const latestAfterCheck = await this.lifecycleService.load(gameId);
        const ruleId = (latestAfterCheck as any)?.ruleId;
        if (ruleId) {
            const ruleConfig = GameRuleConfigService.getGameRuleConfig(ruleId);
            if (getModeTypeForRuleId(ruleId) === "tutorial") {
                const tutorialRoundLimit = ruleConfig.starRatingConfig?.threeStarMaxRounds ?? 6;
                if (roundNumber >= tutorialRoundLimit) {
                    await this.lifecycleService.save(gameId, {
                        status: 3,
                        lastUpdate: new Date().toISOString(),
                    });
                    const eventService = new GameEventService(this.dbCtx);
                    await eventService.createEvent(eventService.createGameEndEvent(gameId));
                    changes.gameOver = {
                        result: 3,
                        reason: `教学关回合上限（${tutorialRoundLimit}）已达到`,
                    };
                    return null;
                }
            }
        }
        const newRoundNo = roundNumber + 1;
        // 使用最新 game 创建新回合，避免漏掉召唤等本回合末写入的数据
        let latestGame = await this.lifecycleService.load(gameId);
        if (!latestGame) return null;
        const roundStarted = await this.roundService.createRound(gameId, newRoundNo, latestGame);
        if (!roundStarted) return null;

        const roundStartPassiveSkills = await this.triggerPassiveSkills(gameId, "round_start");

        // round_start 被动可能修改 speed，重排新回合以确保 roundStart 是最新速度顺序
        latestGame = await this.lifecycleService.load(gameId);
        if (latestGame) {
            await this.roundService.resortRoundTurnsBySpeed(gameId, newRoundNo, latestGame);
        }

        const roundDoc = await this.roundService.getRoundDoc(gameId, newRoundNo);
        const round: GameRound = roundDoc
            ? { no: roundDoc.no, turns: roundDoc.turns || [] }
            : { no: newRoundNo, turns: [] };
        const eventService = new GameEventService(this.dbCtx);
        const event = eventService.createNewRoundEvent(gameId, newRoundNo);
        if (event.data) (event.data as any).triggeredPassiveSkills = roundStartPassiveSkills;
        await eventService.createEvent(event);
        await this.lifecycleService.save(gameId, { round: newRoundNo, lastUpdate: new Date().toISOString() });
        changes.roundStart = { round, triggeredPassiveSkills: roundStartPassiveSkills };
        return newRoundNo;
    }

    /**
     * 触发被动技能
     * @param gameId 游戏ID
     * @param triggerType 触发类型（如 "round_start", "turn_start"）
     * @param targetCharacter 目标角色（可选，如果提供则只检查该角色，否则检查所有存活角色）
     * @returns 被触发的被动技能列表，用于前端播放动画
     */
    async triggerPassiveSkills(
        gameId: string,
        triggerType: "round_start" | "turn_start",
        targetCharacter?: GameMonster,
        game?: any  // ✅ 可选：传入游戏对象（GameModel），避免重复加载
    ): Promise<TriggeredPassiveSkill[]> {
        const triggeredSkills: TriggeredPassiveSkill[] = [];

        // ✅ 如果传入了游戏对象，使用它；否则从数据库加载
        let currentGame = game;
        if (!currentGame) {
            currentGame = await this.lifecycleService.load(gameId);
        }
        if (!currentGame) return triggeredSkills;

        this.characterQueryService.setGame(currentGame);

        const charactersToCheck: GameMonster[] = targetCharacter
            ? [targetCharacter]
            : this.characterQueryService.getAllCharacters().filter(char => (char.stats?.hp?.current ?? 0) > 0);

        const passiveRoundNo = currentGame?.currentRound?.no ?? 0;

        for (const character of charactersToCheck) {
            if (!character.skills || !Array.isArray(character.skills)) continue;

            // 检查所有技能（skills 是 string[]）
            for (const skillId of character.skills) {
                const skillIdStr = skillId;
                const phaseContext = {
                    roundNumber: passiveRoundNo,
                    triggerChance: Math.random(),
                };

                // 检查是否应该触发被动技能
                if (await SkillManager.shouldTriggerPassiveSkill(skillIdStr, character, triggerType, phaseContext)) {
                    // 获取被动技能效果
                    const effects = SkillManager.getPassiveSkillEffects(skillIdStr, triggerType);

                    // 应用效果到角色自身（被动技能通常作用于自身）
                    for (const effect of effects) {
                        SkillManager.applyEffectToTarget(effect, character, character, undefined, passiveRoundNo);
                    }

                    // ✅ 记录被触发的技能（用于前端播放动画）
                    // 注意：对于小怪，需要包含 minionId 来区分相同 monsterId 的小怪
                    triggeredSkills.push({
                        uid: character.uid,
                        character_id: (character as any).character_id ?? (character as any).bossId ?? (character as any).minionId ?? character.monsterId,
                        skillId: skillIdStr,
                        effects: effects.map(effect => ({
                            id: effect.id,
                            type: effect.type,
                            name: effect.name,
                        })),
                    });

                    // 更新角色到数据库（统一使用 updateCharacterInDatabase，它会自动处理玩家、Boss、小怪）
                    await this.characterUpdateService.updateCharacterInDatabase(
                        gameId,
                        character,
                        currentGame
                    );
                }
            }
        }

        // ✅ 如果更新了数据库，需要重新加载游戏状态以同步更新
        // 但如果调用者会自己重新加载，可以跳过这一步（通过返回值指示是否需要重新加载）
        // 这里暂时保留重新加载，但可以通过返回值优化
        if (triggeredSkills.length > 0) {
            // 有被动技能被触发，需要重新加载
            currentGame = await this.lifecycleService.load(gameId);
            if (currentGame) {
                this.characterQueryService.setGame(currentGame);
            }
        }

        return triggeredSkills;
    }

    /**
     * 启动第一个 round 的第一个 turn
     * 在游戏创建后调用，用于初始化第一个 turn 的状态和被动技能
     * @param gameId 游戏ID
     * @param roundNumber 回合编号（通常是 1）
     * @param ctx Convex context（用于调度 Boss AI）
     * @returns PhaseChanges 包含 turnStart 和可能的 bossAIActions
     */
    async startFirstTurn(gameId: string, roundNumber: number, ctx?: any): Promise<PhaseChanges> {
        const changes: PhaseChanges = {};
        const game = await this.lifecycleService.load(gameId);
        if (!game || !game.currentRound) return changes;

        this.characterQueryService.setGame(game);

        const roundStartPassiveSkills = await this.triggerPassiveSkills(gameId, "round_start", undefined, game);

        const eventService = new GameEventService(this.dbCtx);
        const roundStartEvent = eventService.createNewRoundEvent(gameId, roundNumber);
        if (roundStartEvent.data) {
            (roundStartEvent.data as any).triggeredPassiveSkills = roundStartPassiveSkills;
        }
        await eventService.createEvent(roundStartEvent);

        const round: GameRound = game.currentRound
            ? { no: game.currentRound.no, turns: game.currentRound.turns }
            : { no: roundNumber, turns: [] };
        changes.roundStart = {
            round,
            triggeredPassiveSkills: roundStartPassiveSkills,
        };

        let currentGame = game;
        if (roundStartPassiveSkills.length > 0) {
            const reloadedGame = await this.lifecycleService.load(gameId);
            if (!reloadedGame || !reloadedGame.currentRound) return changes;
            currentGame = reloadedGame;
        }
        this.characterQueryService.setGame(currentGame);

        const gameRef = { current: currentGame };
        await this.processConsecutiveTurnsUntilPlayer(gameId, roundNumber, gameRef, changes, ctx);

        if (changes.bossAIActions && changes.bossAIActions.length > 0) {
            const firstTurnEvent: CombatEvent = {
                gameId,
                name: "firstTurn",
                type: 0,
                data: {
                    round: roundNumber,
                    phaseChanges: changes,
                },
                time: Date.now(),
            };
            await eventService.createEvent(firstTurnEvent);
        } else if (changes.turnStart) {
            const turnStartEvent: CombatEvent = {
                gameId,
                name: "turnStart",
                type: 0,
                data: {
                    uid: changes.turnStart.uid,
                    character_id: changes.turnStart.character_id,
                    round: roundNumber,
                    triggeredPassiveSkills: (changes.turnStart as any).triggeredPassiveSkills || [],
                },
                time: Date.now(),
            };
            await eventService.createEvent(turnStartEvent);
        }

        return changes;
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

        const roundNumber = game.currentRound.no;
        const roundDoc = await this.loadRoundDoc(gameId, roundNumber);
        if (!roundDoc) return changes;

        const currentTurn = this.findTurnByIdentifier(roundDoc, characterIdentifier);
        // console.log("advanceTurnAndRound currentTurn", currentTurn, characterIdentifier);
        if (currentTurn && currentTurn.status !== 2) {
            await this.patchTurnStatus(roundDoc, currentTurn, 2);
            changes.turnEnd = {
                uid: currentTurn.uid,
                character_id: currentTurn.character_id,
                round: roundNumber,
            };
            if (currentTurn.uid !== "boss") {
                const g = await this.lifecycleService.load(gameId);
                if (g) {
                    await TutorialProgressService.recordEvent(
                        gameId,
                        this.lifecycleService,
                        this.scoreService,
                        g,
                        { type: "turnEnd" },
                        { skipCheckGameStatus: true }
                    );
                }
            }
        }

        if (roundDoc.turns.every((turn: GameTurn) => turn.status === 2)) {
            await this.transitionToNextRound(gameId, roundNumber, game, changes, ctx);
            return changes;
        }

        const gameRef = { current: game };
        await this.processConsecutiveTurnsUntilPlayer(gameId, roundNumber, gameRef, changes, ctx);

        const roundAfterBoss = await this.loadRoundDoc(gameId, roundNumber);
        if (roundAfterBoss?.turns.every((t: GameTurn) => t.status === 2)) {
            await this.transitionToNextRound(gameId, roundNumber, game, changes, ctx);
        }

        // 固定逻辑：每次带 turnStart 时都带最新 currentRound，供前端整体替换以同步 order（含召唤等）
        if (changes.turnStart && gameRef.current?.currentRound) {
            const round = gameRef.current.currentRound;
            const latestRoundDoc = await this.loadRoundDoc(gameId, round.no);
            const latestTurns = latestRoundDoc?.turns ?? round.turns ?? [];
            changes.currentRound = {
                no: round.no,
                turns: latestTurns.map((t: GameTurn) => ({ ...t })),
            };
        }

        return changes;
    }

    /**
     * 战斗仿真：当前活跃 turn 为 Boss 侧（uid=boss, status=1）时，执行 handleBossTurn 并将该 turn 标为完成。
     * 与 processBossTurn 中 Boss AI 段一致（不再重复 turn_start tick，因 turn 已在进行中）。
     * 随后与 advanceTurnAndRound 一致：连续处理后续 Boss 回合直至玩家回合，并在整轮结束时进入下一轮。
     */
    async resolveSimulatorBossTurn(gameId: string, ctx: any): Promise<void> {
        const game = await this.lifecycleService.load(gameId);
        if (!game?.currentRound) return;

        const roundNo = game.currentRound.no;
        const roundDoc = await this.loadRoundDoc(gameId, roundNo);
        if (!roundDoc?.turns?.length) return;

        const activeTurn = roundDoc.turns.find((t: GameTurn) => (t.status ?? 0) === 1);
        if (!activeTurn || activeTurn.uid !== "boss") return;

        this.characterQueryService.setGame(game);

        const { monsterId: turnMonsterId, bossId: turnBossId, minionId: turnMinionId } =
            this.characterQueryService.getCharacterParams(activeTurn.uid, activeTurn.character_id);
        const turnCharacter = this.characterQueryService.getCharacter(turnMonsterId, turnBossId, turnMinionId);
        const skipBossAI = turnCharacter && (turnCharacter.status === "dead" || turnCharacter.status === "stunned");

        if (ctx && !skipBossAI) {
            await ctx.runMutation(internal.service.boss.ai.bossTurnHandler.handleBossTurn, {
                gameId,
                round: roundNo,
            });
        }

        const freshRoundDoc = await this.loadRoundDoc(gameId, roundNo);
        if (!freshRoundDoc) return;
        const freshTurn = freshRoundDoc.turns.find(
            (t: GameTurn) => t.uid === activeTurn.uid && t.character_id === activeTurn.character_id
        );
        if (freshTurn && (freshTurn.status ?? 0) !== 2) {
            await this.patchTurnStatus(freshRoundDoc, freshTurn, 2);
        }

        await this.advanceSimulatorPhaseAfterBossHandled(gameId, roundNo, ctx);
    }

    /**
     * 仿真：完成一次 Boss 侧处理后，与 advanceTurnAndRound 一致地推进到下一个玩家回合，并在整轮结束时进入下一轮。
     */
    private async advanceSimulatorPhaseAfterBossHandled(gameId: string, roundNo: number, ctx: any): Promise<void> {
        let gameReloaded = await this.lifecycleService.load(gameId);
        if (!gameReloaded?.currentRound) return;
        const gameRef = { current: gameReloaded };
        this.characterQueryService.setGame(gameReloaded);
        const changes: PhaseChanges = {};
        await this.processConsecutiveTurnsUntilPlayer(gameId, roundNo, gameRef, changes, ctx);

        const roundAfterBoss = await this.loadRoundDoc(gameId, roundNo);
        if (roundAfterBoss?.turns.every((t: GameTurn) => (t.status ?? 0) === 2)) {
            await this.transitionToNextRound(gameId, roundNo, gameRef.current ?? gameReloaded, changes, ctx);
        }
    }

    /**
     * 战斗仿真：当 load 后无 status=1 的 turn 时（例如旧数据 round 未写回），尝试推进阶段直到出现玩家/Boss 活跃回合。
     */
    async ensureSimulatorRoundProgress(gameId: string, ctx: any): Promise<void> {
        const game = await this.lifecycleService.load(gameId);
        if (!game?.currentRound?.no) return;
        await this.advanceSimulatorPhaseAfterBossHandled(gameId, game.currentRound.no, ctx);
    }
}


