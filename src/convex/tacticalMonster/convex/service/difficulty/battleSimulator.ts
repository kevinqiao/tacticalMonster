/**
 * 单局战斗仿真器
 * 创建游戏后循环：玩家回合用 PlayerSimulator 选动作并执行；Boss 侧回合调用 GameService.runSimulatorBossTurn（handleBossTurn + 阶段推进）
 */

import type { GameModel } from "../../types/gameTypes";
import type { BattleResult } from "./types";
import { setupCombatTestData } from "../game/tests/combat/combatTestData";
import { GameService } from "../game/gameService";
import { CharacterQueryService } from "../game/characterQueryService";
import { SkillTargetService } from "../game/skillTargetService";
import { ValidActionEnumerator } from "./validActionEnumerator";
import { PlayerSimulator } from "./playerSimulator";
import { STRATEGY_PRESETS } from "./strategyConfigs";
import type { StrategyWeights, ValidAction } from "./types";
const SIM_UID = "sim_player";
const MAX_ROUNDS = 80;

/**
 * 执行仿真选中的动作；useSkill/walk 若与后端校验不一致则回退为 defend，避免首动失败即整局退出。
 */
async function executeSimActionOrDefend(
  gameService: GameService,
  gameId: string,
  action: ValidAction
): Promise<boolean> {
  if (action.type === "useSkill") {
    const r = await gameService.useSkill(gameId, {
      ...action.identifier,
      skillId: action.skillId,
      targets: action.targets,
    });
    if (r.success) return true;
    const r2 = await gameService.defend(gameId, action.identifier);
    return r2.success;
  }
  if (action.type === "walk") {
    const r = await gameService.walk(gameId, action.to, action.identifier, { steps: action.steps });
    if (r.success) return true;
    const r2 = await gameService.defend(gameId, action.identifier);
    return r2.success;
  }
  const r = await gameService.defend(gameId, action.identifier);
  return r.success;
}

/**
 * 单局战斗仿真
 * @param ctx Convex ctx (db)
 * @param params 仿真参数
 */
export async function runBattle(
  ctx: any,
  params: {
    ruleId: string;
    difficulty: number;
    teamMonsters: Array<{ monsterId: string; level: number; stars: number }>;
    strategyId?: string;
    seed?: string;
  }
): Promise<BattleResult> {
  const { ruleId, difficulty, teamMonsters, strategyId = "greedy", seed } = params;
  const weights: StrategyWeights = STRATEGY_PRESETS[strategyId] ?? STRATEGY_PRESETS.greedy;

  const gameId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const setupResult = await setupCombatTestData(ctx, {
    uid: SIM_UID,
    gameId,
    ruleId,
    teamMonsters,
    difficultyOverride: difficulty,
    skipFirstTurn: false,
  });

  if (setupResult.errors.length > 0 || !setupResult.game) {
    return {
      win: false,
      rounds: 0,
      survivalCount: 0,
      bossHpRemaining: 0,
    };
  }

  const gameService = new GameService(ctx);
  const characterQueryService = new CharacterQueryService();
  const skillTargetService = new SkillTargetService(characterQueryService);
  const enumerator = new ValidActionEnumerator(characterQueryService, skillTargetService);

  // 首帧：若回合表未挂上或尚无进行中 turn，推进一次阶段（与循环内 !turn 分支一致）
  const warm = await gameService.load(gameId) as GameModel | null;
  if (warm && (warm.status ?? 0) === 0) {
    const turns = warm.currentRound?.turns ?? [];
    const hasActive = turns.some((t: any) => (t.status ?? 0) === 1);
    if (turns.length === 0 || !hasActive) {
      await gameService.ensureSimulatorRoundProgress(gameId);
    }
  }

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const game = await gameService.load(gameId) as GameModel | null;
    if (!game) break;

    const gameStatus = game.status ?? 0;
    if (gameStatus !== 0) {
      const bossHp = game.boss?.stats?.hp?.current ?? 0;
      const survivalCount = (game.team ?? []).filter((m) => (m.stats?.hp?.current ?? 0) > 0).length;
      return {
        win: gameStatus === 1,
        rounds: game.currentRound?.no ?? round,
        survivalCount,
        bossHpRemaining: bossHp,
      };
    }

    let workingGame: GameModel = game;
    let turn = workingGame.currentRound?.turns?.find((t: any) => (t.status ?? 0) === 1);
    if (!turn) {
      await gameService.ensureSimulatorRoundProgress(gameId);
      const gameAfter = await gameService.load(gameId) as GameModel | null;
      if (!gameAfter) break;
      workingGame = gameAfter;
      turn = workingGame.currentRound?.turns?.find((t: any) => (t.status ?? 0) === 1);
      if (!turn) break;
    }

    if (turn.uid === "boss") {
      await gameService.runSimulatorBossTurn(gameId);
      continue;
    }

    characterQueryService.setGame(workingGame);
    const actions = enumerator.enumerate(workingGame);
    if (actions.length === 0) break;

    const action = seed
      ? PlayerSimulator.pickWithSeed(actions, weights, workingGame, `${seed}_r${round}`)
      : PlayerSimulator.pick(actions, weights, workingGame, () => Math.random());

    const ok = await executeSimActionOrDefend(gameService, gameId, action);
    if (!ok) break;
  }

  const finalGame = await gameService.load(gameId) as GameModel | null;
  const bossHp = finalGame?.boss?.stats?.hp?.current ?? 0;
  const survivalCount = (finalGame?.team ?? []).filter((m) => (m.stats?.hp?.current ?? 0) > 0).length ?? 0;

  const finalStatus = finalGame?.status ?? 0;
  return {
    win: finalStatus === 1,
    rounds: finalGame?.currentRound?.no ?? MAX_ROUNDS,
    survivalCount,
    bossHpRemaining: bossHp,
  };
}
