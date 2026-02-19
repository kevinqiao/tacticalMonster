/**
 * 游戏阶段管理服务
 * 负责阶段推进、被动技能触发
 */

import { internal } from "../../_generated/api";
import { CharacterIdentifier, CombatEvent, GameTurn, PhaseChanges, TriggeredPassiveSkill } from "../../types/gameTypes";
import { GameMonster } from "../../types/monsterTypes";
import { processStatusEffects } from "../skill/StatusEffectProcessor";
import { SkillManager } from "../skill/skillManager";
import { CharacterQueryService } from "./characterQueryService";
import { CharacterUpdateService } from "./characterUpdateService";
import { GameEventService } from "./gameEventService";
import { GameLifecycleService } from "./gameLifecycleService";
import { GameScoreService } from "./gameScoreService";
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

    /** 按标识符在 roundDoc.turns 中查找对应回合 */
    private findTurnByIdentifier(roundDoc: { turns: GameTurn[] }, characterIdentifier: CharacterIdentifier): GameTurn | undefined {
        const { monsterId, bossId, minionId } = characterIdentifier;
        return roundDoc.turns.find((turn: GameTurn) => {
            if (monsterId) return turn.uid !== "boss" && turn.monsterId === monsterId;
            if (bossId) return turn.uid === "boss" && turn.bossId === bossId;
            if (minionId) return turn.uid === "boss" && turn.minionId === minionId;
            return false;
        });
    }

    /** 判断两条 turn 是否指向同一角色（uid + bossId/minionId/monsterId） */
    private turnsMatch(turn: GameTurn, turnToMatch: GameTurn): boolean {
        return turn.uid === turnToMatch.uid && (
            (turnToMatch.bossId && turn.bossId === turnToMatch.bossId) ||
            (turnToMatch.minionId && turn.minionId === turnToMatch.minionId) ||
            (!turnToMatch.bossId && !turnToMatch.minionId && turn.monsterId === turnToMatch.monsterId)
        );
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

    /** 将匹配 turnToMatch 的回合状态改为 newStatus 并写回数据库 */
    private async patchTurnStatus(
        roundDoc: { _id: any; turns: GameTurn[] },
        turnToMatch: GameTurn,
        newStatus: number
    ): Promise<void> {
        const updatedTurns = roundDoc.turns.map((turn: GameTurn) =>
            this.turnsMatch(turn, turnToMatch) ? { ...turn, status: newStatus } : turn
        );
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
        const turnStartPayload: any = {
            uid: nextTurn.uid,
            monsterId: nextTurn.monsterId,
            round: roundNo,
        };
        if (nextTurn.bossId) turnStartPayload.bossId = nextTurn.bossId;
        if (nextTurn.minionId) turnStartPayload.minionId = nextTurn.minionId;
        changes.turnStart = turnStartPayload;

        const { monsterId: turnMonsterId, bossId: turnBossId, minionId: turnMinionId } =
            this.characterQueryService.getCharacterParams(nextTurn.uid, nextTurn.monsterId);
        const turnCharacter = this.characterQueryService.getCharacter(turnMonsterId, turnBossId, turnMinionId);
        if (turnCharacter) {
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
    }> {
        const turnStartInfo: any = {
            uid: nextTurn.uid,
            monsterId: nextTurn.monsterId,
            round: roundNo,
        };
        console.log("processBossTurn turnStartInfo", turnStartInfo);
        if (nextTurn.bossId) turnStartInfo.bossId = nextTurn.bossId;
        if (nextTurn.minionId) turnStartInfo.minionId = nextTurn.minionId;

        let turnStartPassiveSkills: any[] = [];
        const { monsterId: turnMonsterId, bossId: turnBossId, minionId: turnMinionId } =
            this.characterQueryService.getCharacterParams(nextTurn.uid, nextTurn.monsterId);
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

        const skipBossAI = turnCharacter && (turnCharacter.status === "dead" || turnCharacter.status === "stunned");
        let bossActionResult: any = null;
        if (ctx && !skipBossAI) {
            bossActionResult = await ctx.runMutation(
                internal.service.boss.ai.bossTurnHandler.handleBossTurn,
                { gameId, round: roundNo }
            );
        }

        await this.patchTurnStatus(roundDoc, nextTurn, 2);

        const bossTurnStart = { ...turnStartInfo };
        if (bossActionResult?.ok && bossActionResult.decision) {
            return {
                turnStart: bossTurnStart,
                decision: bossActionResult.decision,
                executionResults: bossActionResult.executionResults || { boss: { ok: true }, minions: [] },
                phaseTransition: bossActionResult.phaseTransition,
            };
        }
        if (skipBossAI && turnStartInfo.statusEffectChanges) {
            return { turnStart: bossTurnStart, decision: null, executionResults: { skipped: true } };
        }
        return { turnStart: bossTurnStart, decision: null, executionResults: null };
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

    /** 结束当前轮、创建新轮、round_start 事件与 changes.roundStart；若游戏结束则返回 null，否则返回新轮号。 */
    private async finishRoundAndStartNext(
        gameId: string,
        roundNumber: number,
        game: any,
        changes: PhaseChanges
    ): Promise<number | null> {
        await this.roundService.endRound(gameId, roundNumber);
        changes.roundEnd = { round: roundNumber };
        const gameStatus = await this.scoreService.checkAndUpdateGameStatus(gameId);
        if (gameStatus?.isGameOver) {
            changes.gameOver = { result: gameStatus.result, reason: gameStatus.reason };
            return null;
        }
        const newRoundNo = roundNumber + 1;
        const roundStarted = await this.roundService.createRound(gameId, newRoundNo, game);
        if (!roundStarted) return null;
        const roundStartPassiveSkills = await this.triggerPassiveSkills(gameId, "round_start");
        const eventService = new GameEventService(this.dbCtx);
        const event = eventService.createNewRoundEvent(gameId, newRoundNo);
        if (event.data) (event.data as any).triggeredPassiveSkills = roundStartPassiveSkills;
        await eventService.createEvent(event);
        await this.lifecycleService.save(gameId, { round: newRoundNo, lastUpdate: new Date().toISOString() });
        changes.roundStart = { round: newRoundNo, triggeredPassiveSkills: roundStartPassiveSkills };
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

                    // ✅ 记录被触发的技能（用于前端播放动画）
                    // 注意：对于小怪，需要包含 minionId 来区分相同 monsterId 的小怪
                    const skillInfo: TriggeredPassiveSkill = {
                        uid: character.uid,
                        monsterId: character.monsterId,
                        skillId: skillIdStr,
                        effects: effects.map(effect => ({
                            id: effect.id,
                            type: effect.type,
                            name: effect.name,
                        })),
                    };

                    // ✅ 如果是 Boss 主体，添加 bossId
                    if (character.uid === "boss" && (character as any).bossId) {
                        skillInfo.bossId = (character as any).bossId;
                    }
                    // ✅ 如果是小怪，添加 minionId（用于区分相同 monsterId 的小怪）
                    else if (character.uid === "boss" && (character as any).minionId) {
                        skillInfo.minionId = (character as any).minionId;
                    }

                    triggeredSkills.push(skillInfo);

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

        // ✅ 1. 先触发所有存活角色的 round_start 被动技能并收集信息（传入当前游戏对象）
        const roundStartPassiveSkills = await this.triggerPassiveSkills(gameId, "round_start", undefined, game);

        // ✅ 2. 创建第一个 round 的 new_round 事件（用于 watch/replay 模式），包含被动技能信息
        const eventService = new GameEventService(this.dbCtx);
        const roundStartEvent = eventService.createNewRoundEvent(gameId, roundNumber);
        // ✅ 将被动技能信息添加到事件 data 中，供 watch/replay 模式使用
        if (roundStartEvent.data) {
            (roundStartEvent.data as any).triggeredPassiveSkills = roundStartPassiveSkills;
        }
        await eventService.createEvent(roundStartEvent);

        // 记录 roundStart 变化
        changes.roundStart = {
            round: roundNumber,
            triggeredPassiveSkills: roundStartPassiveSkills, // ✅ 将被动技能信息添加到 phaseChanges
        };

        // 2. 如果触发了被动技能，重新加载游戏状态以获取最新状态
        let currentGame = game;
        if (roundStartPassiveSkills.length > 0) {
            const reloadedGame = await this.lifecycleService.load(gameId);
            if (!reloadedGame || !reloadedGame.currentRound) return changes;
            currentGame = reloadedGame;
            this.characterQueryService.setGame(currentGame);
        } else {
            // 没有被动技能触发，继续使用当前游戏对象
            if (currentGame) {
                this.characterQueryService.setGame(currentGame);
            }
        }

        // 3. 获取当前回合文档
        const roundDoc = await this.loadRoundDoc(gameId, roundNumber);

        if (!roundDoc || roundDoc.turns.length === 0) return changes;

        // 4. 找到第一个 turn（按 order 排序，取 status === 0 的第一个）
        const firstTurn = roundDoc.turns
            .filter((turn: GameTurn) => turn.status === 0)
            .sort((a: GameTurn, b: GameTurn) => (a.order || 0) - (b.order || 0))[0];

        if (!firstTurn) return changes;

        // 5. 支持多个连续的 Boss turn：循环处理直到遇到玩家 turn
        const bossAIActions: Array<{
            turnStart: { uid: string; monsterId: string; round: number };
            decision: any;
            executionResults: any;
            phaseTransition?: any;
        }> = [];

        let currentRoundDoc = roundDoc;
        let processedBossTurns = 0;
        const maxBossTurns = 10; // 防止无限循环

        // 循环处理连续的 Boss turn
        while (processedBossTurns < maxBossTurns) {
            // 重新加载当前回合文档以获取最新状态
            const reloaded = await this.loadRoundDoc(gameId, roundNumber);
            if (!reloaded) break;
            currentRoundDoc = reloaded;

            const nextTurn = this.getNextPendingTurn(currentRoundDoc);
            if (!nextTurn) break;

            // 如果下一个 turn 是玩家 turn，停止循环
            if (nextTurn.uid !== "boss") {
                // 记录玩家 turn 的开始
                changes.turnStart = {
                    uid: nextTurn.uid,
                    monsterId: nextTurn.monsterId,
                    round: roundNumber,
                };

                // 先处理状态效果 tick，再触发 turn_start 被动技能
                let turnStartPassiveSkills: Array<{ uid: string; monsterId: string; bossId?: string; minionId?: string; skillId: string; effects: any[] }> = [];
                const { monsterId: turnMonsterId, bossId: turnBossId, minionId: turnMinionId } =
                    this.characterQueryService.getCharacterParams(nextTurn.uid, nextTurn.monsterId);
                const turnCharacter = this.characterQueryService.getCharacter(turnMonsterId, turnBossId, turnMinionId);
                if (turnCharacter && currentGame) {
                    const tickResult = processStatusEffects(turnCharacter);
                    if ((turnCharacter.stats?.hp?.current ?? 0) <= 0) turnCharacter.status = "dead";
                    await this.characterUpdateService.updateCharacterInDatabase(gameId, turnCharacter, currentGame);
                    const reloadedAfterTick = await this.lifecycleService.load(gameId);
                    if (reloadedAfterTick) {
                        currentGame = reloadedAfterTick;
                        this.characterQueryService.setGame(currentGame);
                    }
                    if (changes.turnStart) {
                        changes.turnStart.statusEffectChanges = {
                            expired: tickResult.expired.map((e) => ({ id: e.id, type: e.type, name: e.name })),
                            ticked: tickResult.ticked,
                            characterState: tickResult.characterState,
                        };
                    }
                    turnStartPassiveSkills = await this.triggerPassiveSkills(gameId, "turn_start", turnCharacter, currentGame);
                    if (turnStartPassiveSkills.length > 0) {
                        const reloadedGame = await this.lifecycleService.load(gameId);
                        if (reloadedGame) {
                            currentGame = reloadedGame;
                            this.characterQueryService.setGame(currentGame);
                        }
                    }
                    if (changes.turnStart) {
                        changes.turnStart.triggeredPassiveSkills = turnStartPassiveSkills;
                    }
                }

                const turnStartEvent: CombatEvent = {
                    gameId,
                    name: "turnStart",
                    type: 0,
                    data: {
                        uid: nextTurn.uid,
                        monsterId: nextTurn.monsterId,
                        round: roundNumber,
                        triggeredPassiveSkills: turnStartPassiveSkills,
                    },
                    time: Date.now(),
                };
                await eventService.createEvent(turnStartEvent);

                const updatedTurns = currentRoundDoc.turns.map((turn: GameTurn) => {
                    const isMatch = turn.uid === nextTurn.uid && (
                        (nextTurn.bossId && turn.bossId === nextTurn.bossId) ||
                        (nextTurn.minionId && turn.minionId === nextTurn.minionId) ||
                        (!nextTurn.bossId && !nextTurn.minionId && turn.monsterId === nextTurn.monsterId)
                    );
                    return isMatch ? { ...turn, status: 1 } : turn;
                });
                await this.dbCtx.db.patch(currentRoundDoc._id, { turns: updatedTurns });
                break;
            }

            processedBossTurns++;
            const turnStartInfo: { uid: string; monsterId: string; round: number; bossId?: string; minionId?: string; triggeredPassiveSkills?: any[]; statusEffectChanges?: any } = {
                uid: nextTurn.uid,
                monsterId: nextTurn.monsterId,
                round: roundNumber,
                ...(nextTurn.bossId ? { bossId: nextTurn.bossId } : {}),
                ...(nextTurn.minionId ? { minionId: nextTurn.minionId } : {}),
            };

            let turnStartPassiveSkills: Array<{ uid: string; monsterId: string; bossId?: string; minionId?: string; skillId: string; effects: any[] }> = [];
            const { monsterId: turnMonsterId, bossId: turnBossId, minionId: turnMinionId } =
                this.characterQueryService.getCharacterParams(nextTurn.uid, nextTurn.monsterId);
            const turnCharacter = this.characterQueryService.getCharacter(turnMonsterId, turnBossId, turnMinionId);
            if (turnCharacter && currentGame) {
                const tickResult = processStatusEffects(turnCharacter);
                if ((turnCharacter.stats?.hp?.current ?? 0) <= 0) turnCharacter.status = "dead";
                await this.characterUpdateService.updateCharacterInDatabase(gameId, turnCharacter, currentGame);
                const reloadedAfterTick = await this.lifecycleService.load(gameId);
                if (reloadedAfterTick) {
                    currentGame = reloadedAfterTick;
                    this.characterQueryService.setGame(currentGame);
                }
                turnStartInfo.statusEffectChanges = {
                    expired: tickResult.expired.map((e) => ({ id: e.id, type: e.type, name: e.name })),
                    ticked: tickResult.ticked,
                    characterState: tickResult.characterState,
                };
                turnStartPassiveSkills = await this.triggerPassiveSkills(gameId, "turn_start", turnCharacter, currentGame);
                if (turnStartPassiveSkills.length > 0) {
                    const reloadedGame = await this.lifecycleService.load(gameId);
                    if (reloadedGame) {
                        currentGame = reloadedGame;
                        this.characterQueryService.setGame(currentGame);
                    }
                }
            }

            // ✅ 2. 每个 Boss turn 都执行 AI 决策并执行当前 turn 对应的动作
            // 注意：每个 turn 都会重新决策（基于最新的游戏状态，包括已触发的被动技能），但只执行当前 turn 对应的动作
            let currentBossActionResult: any = null;
            if (ctx) {
                // ✅ 使用当前游戏对象（如果被动技能已更新，currentGame 已是最新状态）
                if (currentGame) {
                    this.characterQueryService.setGame(currentGame);
                }

                // ✅ 获取 Boss AI 决策（只获取决策，不执行动作）
                const decision = await ctx.runMutation(
                    internal.service.boss.ai.bossAIActions.getBossAIDecision,
                    {
                        gameId,
                        round: roundNumber,
                    }
                );

                if (decision) {
                    // ✅ 从决策中提取当前 turn 对应的动作
                    let currentAction: any = null;
                    let currentExecutionResult: any = null;

                    if (turnBossId) {
                        // 当前 turn 是 Boss 本体
                        currentAction = decision.bossAction;
                    } else if (turnMinionId) {
                        // 当前 turn 是小怪，从 minionActions 中找到对应的动作
                        const minionAction = decision.minionActions?.find(
                            (ma: any) => ma.minionId === turnMinionId
                        );
                        if (minionAction) {
                            currentAction = minionAction.action;
                        }
                    }

                    // ✅ 执行当前 turn 对应的动作
                    if (currentAction && currentAction.type !== "standby") {
                        const identifier = turnBossId
                            ? { bossId: turnBossId }
                            : turnMinionId
                                ? { minionId: turnMinionId }
                                : null;

                        if (identifier) {
                            currentExecutionResult = await ctx.runMutation(
                                (internal as any).service.boss.ai.bossAIActions.executeBossAction,
                                {
                                    gameId,
                                    action: currentAction,
                                    identifier,
                                }
                            );
                        }
                    }

                    // ✅ 构建当前 turn 的 AI 动作结果
                    if (currentAction) {
                        currentBossActionResult = {
                            ok: true,
                            decision: {
                                bossAction: turnBossId ? currentAction : undefined,
                                minionActions: turnMinionId ? [{ minionId: turnMinionId, action: currentAction }] : undefined,
                            },
                            executionResults: {
                                boss: turnBossId ? currentExecutionResult : undefined,
                                minions: turnMinionId ? [{ minionId: turnMinionId, result: currentExecutionResult }] : undefined,
                            },
                            phaseTransition: processedBossTurns === 1 ? decision.phaseTransition : undefined, // 只在第一个 turn 时包含阶段转换
                        };
                    }
                }
            }

            // ✅ 3. 收集 Boss turn 数据（不创建事件，最后统一创建一个 firstTurn 事件）

            // 4. ✅ 更新回合状态为完成（Boss AI 执行完成后自动完成 turn）
            const updatedTurns = currentRoundDoc.turns.map((turn: GameTurn) => {
                // ✅ 使用更精确的匹配：对于Boss，使用bossId/minionId；对于玩家，使用monsterId
                const isMatch = turn.uid === nextTurn.uid && (
                    (nextTurn.bossId && turn.bossId === nextTurn.bossId) ||
                    (nextTurn.minionId && turn.minionId === nextTurn.minionId) ||
                    (!nextTurn.bossId && !nextTurn.minionId && turn.monsterId === nextTurn.monsterId)
                );
                return isMatch ? { ...turn, status: 2 } : turn; // 直接标记为完成
            });

            await this.dbCtx.db.patch(currentRoundDoc._id, {
                turns: updatedTurns,
            });

            // 5. 为每个 Boss turn 保存对应的 AI 动作结果
            if (currentBossActionResult?.ok && currentBossActionResult.decision) {
                const bossTurnStart = {
                    ...turnStartInfo,
                    triggeredPassiveSkills: turnStartPassiveSkills, // ✅ 添加被动技能信息
                };

                bossAIActions.push({
                    turnStart: bossTurnStart,
                    decision: currentBossActionResult.decision,
                    executionResults: currentBossActionResult.executionResults,
                    phaseTransition: currentBossActionResult.phaseTransition,
                });
            }

            // 继续循环处理下一个 turn
        }

        // ✅ 设置 Boss AI 动作（支持多个连续的 Boss turn）
        // 注意：bossAIActions 数组的顺序就是执行顺序（按照 turns 的 order 排序）
        if (bossAIActions.length > 0) {
            changes.bossAIActions = bossAIActions;

            // ✅ 创建一个 firstTurn 事件（用于 watch/replay 模式），包含所有连续 Boss turn 的数据
            // 注意：只在有连续 Boss turn 时创建，如果没有（直接是玩家 turn），则使用正常的 turnStart 事件
            const firstTurnEvent: CombatEvent = {
                gameId,
                name: "firstTurn",
                type: 0,
                data: {
                    round: roundNumber,
                    phaseChanges: changes, // ✅ 包含所有 phaseChanges（roundStart, bossAIActions, turnStart）
                },
                time: Date.now(),
            };
            await eventService.createEvent(firstTurnEvent);
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
        console.log("advanceTurnAndRound currentTurn", currentTurn, characterIdentifier);
        if (currentTurn && currentTurn.status !== 2) {
            await this.patchTurnStatus(roundDoc, currentTurn, 2);
            changes.turnEnd = {
                uid: currentTurn.uid,
                monsterId: currentTurn.monsterId,
                round: roundNumber,
            };
        }

        const allTurnsCompleted = roundDoc.turns.every((turn: GameTurn) => turn.status === 2);

        if (allTurnsCompleted) {
            const newRoundNo = await this.finishRoundAndStartNext(gameId, roundNumber, game, changes);
            if (newRoundNo === null) return changes;

            let updatedGame = await this.lifecycleService.load(gameId);
            if (!updatedGame) return changes;
            this.characterQueryService.setGame(updatedGame);

            const gameRef = { current: updatedGame };
            await this.processConsecutiveTurnsUntilPlayer(gameId, newRoundNo, gameRef, changes, ctx);
            if (changes.roundStart && !changes.turnStart) {
                await this.ensureTurnStartAfterRoundTransition(gameId, newRoundNo, gameRef, changes);
            }
            return changes;
        }

        // 还有未完成的回合，推进到下一个回合
        const gameRef = { current: game };
        await this.processConsecutiveTurnsUntilPlayer(gameId, roundNumber, gameRef, changes, ctx);

        const roundAfterBoss = await this.loadRoundDoc(gameId, roundNumber);
        if (roundAfterBoss && roundAfterBoss.turns.every((t: GameTurn) => t.status === 2)) {
            const newRoundNo = await this.finishRoundAndStartNext(gameId, roundNumber, game, changes);
            if (newRoundNo === null) return changes;

            const updatedGame = await this.lifecycleService.load(gameId);
            if (updatedGame) this.characterQueryService.setGame(updatedGame);
            const gameRef2 = { current: updatedGame || game };
            await this.processConsecutiveTurnsUntilPlayer(gameId, newRoundNo, gameRef2, changes, ctx);
            // 确保 round 过渡后必有 turnStart，否则前端会停留在 Boss 高亮
            if (changes.roundStart && !changes.turnStart) {
                await this.ensureTurnStartAfterRoundTransition(gameId, newRoundNo, gameRef2, changes);
            }
        }

        return changes;
    }
}


