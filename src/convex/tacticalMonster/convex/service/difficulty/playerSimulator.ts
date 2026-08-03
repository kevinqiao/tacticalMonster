/**
 * 玩家仿真器
 * 基于效用权重为合法动作评分并选取
 */

import { getSkillConfig } from "../../data/skillConfigs";
import type { GameModel } from "../../types/gameTypes";
import type { GameMonster } from "../../types/monsterTypes";
import { SkillEffectType } from "../../types/skillTypes";
import { offsetHexDistance } from "../../utils/hexUtils";
import { SeededRandom } from "../../utils/seededRandom";
import type { StrategyWeights, ValidAction } from "./types";

/** 从 game 中根据 identifier 获取角色 */
function getCharacterFromGame(
  game: GameModel,
  identifier: { monsterId?: string; bossId?: string; minionId?: string }
): GameMonster | null {
  const { monsterId, bossId, minionId } = identifier;
  if (monsterId) {
    const member = game.team?.find(
      (m) => (m as any).character_id === monsterId || m.monsterId === monsterId
    );
    return member ?? null;
  }
  if (bossId) {
    const b = game.boss as GameMonster;
    if (b && ((b as any).bossId === bossId || (b as any).monsterId === bossId)) {
      return b;
    }
    return game.boss ?? null;
  }
  if (minionId && game.boss?.minions) {
    return game.boss.minions.find((m) => m.minionId === minionId) ?? null;
  }
  return null;
}

/** 获取所有存活敌方（Boss + 小怪） */
function getEnemies(game: GameModel): GameMonster[] {
  const enemies: GameMonster[] = [];
  if (game.boss && (game.boss.stats?.hp?.current ?? 0) > 0) {
    enemies.push(game.boss as GameMonster);
  }
  for (const m of game.boss?.minions ?? []) {
    if ((m.stats?.hp?.current ?? 0) > 0) {
      enemies.push(m);
    }
  }
  return enemies;
}

/** 获取所有存活友方 */
function getAllies(game: GameModel): GameMonster[] {
  return (game.team ?? []).filter((m) => (m.stats?.hp?.current ?? 0) > 0);
}

/** 计算友方平均血量百分比 */
function getAvgAllyHpPercent(game: GameModel): number {
  const allies = getAllies(game);
  if (allies.length === 0) return 1;
  let sum = 0;
  for (const a of allies) {
    const cur = a.stats?.hp?.current ?? 0;
    const max = a.stats?.hp?.max ?? 1;
    sum += max > 0 ? cur / max : 1;
  }
  return sum / allies.length;
}

/** 获取主目标（第一个）的剩余血量比例 (0=死, 1=满) */
function getPrimaryTargetHpPercent(
  game: GameModel,
  targets: { monsterId?: string; bossId?: string; minionId?: string }[]
): number {
  if (!targets.length) return 0;
  const t = targets[0];
  const char = getCharacterFromGame(game, t);
  if (!char?.stats?.hp) return 0;
  const max = char.stats.hp.max ?? 1;
  const cur = char.stats.hp.current ?? 0;
  return max > 0 ? cur / max : 0;
}

/** 目标残血越少越佳（集火）：1 - hpPercent */
function getTargetHpFactor(targetHpPercent: number): number {
  return 1 - targetHpPercent;
}

/** 技能伤害/治疗估算（从 effects 提取 value 之和） */
function getSkillDamageAndHeal(skillId: string): { damage: number; heal: number } {
  const skill = getSkillConfig(skillId);
  if (!skill?.effects) return { damage: 0, heal: 0 };
  let damage = 0;
  let heal = 0;
  for (const e of skill.effects) {
    const val = e.value ?? 0;
    if (e.type === SkillEffectType.DAMAGE) damage += val;
    if (e.type === SkillEffectType.HEAL || e.type === SkillEffectType.HOT) heal += val;
  }
  return { damage, heal };
}

/** 技能冷却 */
function getSkillCooldown(skillId: string): number {
  const skill = getSkillConfig(skillId);
  return skill?.cooldown ?? 0;
}

/** 计算动作的效用因子并返回总分 */
function computeActionScore(
  action: ValidAction,
  game: GameModel,
  weights: StrategyWeights,
  rng: () => number
): number {
  let damageDealt = 0;
  let healValue = 0;
  let targetHpPercent = 0;
  let distanceToEnemy = 0;
  let skillCooldownCost = 0;
  let survivalRisk = 0;

  if (action.type === "useSkill") {
    const { damage, heal } = getSkillDamageAndHeal(action.skillId);
    damageDealt = damage * Math.max(1, action.targets.length);
    healValue = heal * Math.max(1, action.targets.length);
    targetHpPercent = getTargetHpFactor(
      getPrimaryTargetHpPercent(game, action.targets)
    );
    skillCooldownCost = -getSkillCooldown(action.skillId) / 10;
  } else if (action.type === "walk") {
    const char = getCharacterFromGame(game, action.identifier);
    const enemies = getEnemies(game);
    if (char && enemies.length > 0) {
      const toPos = { q: action.to.q, r: action.to.r };
      let minDist = Infinity;
      for (const e of enemies) {
        const eq = e.q ?? 0;
        const er = e.r ?? 0;
        const d = offsetHexDistance(toPos, { q: eq, r: er });
        if (d < minDist) minDist = d;
      }
      distanceToEnemy = minDist < Infinity ? 1 / (1 + minDist) : 0;
    }
  } else if (action.type === "defend") {
    survivalRisk = 1 - getAvgAllyHpPercent(game);
  }

  const randomBias = weights.randomBias > 0 ? rng() * 0.2 : 0;

  return (
    damageDealt * weights.damageDealt +
    healValue * weights.healValue +
    targetHpPercent * weights.targetHpPercent +
    distanceToEnemy * weights.distanceToEnemy +
    skillCooldownCost * weights.skillCooldownCost +
    survivalRisk * weights.survivalRisk +
    randomBias
  );
}

/** 加权随机选择（分数越高概率越大，softmax 或线性归一化） */
function weightedRandomSelect<T>(items: T[], scores: number[], rng: () => number): T {
  const minScore = Math.min(...scores);
  const shifted = scores.map((s) => Math.max(0, s - minScore + 0.01));
  const sum = shifted.reduce((a, b) => a + b, 0);
  if (sum <= 0) return items[Math.floor(rng() * items.length)];
  let r = rng() * sum;
  for (let i = 0; i < items.length; i++) {
    r -= shifted[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export class PlayerSimulator {
  /**
   * 从合法动作中选择一个（可复现版本，使用种子）
   */
  static pickWithSeed(
    actions: ValidAction[],
    weights: StrategyWeights,
    game: GameModel,
    seed: string
  ): ValidAction {
    const rng = new SeededRandom(seed);
    return this.pick(actions, weights, game, () => rng.random());
  }

  /**
   * 从合法动作中选择一个
   * @param actions 合法动作列表
   * @param weights 策略权重
   * @param game 当前游戏状态
   * @param rng 随机数生成器 [0,1)
   */
  static pick(
    actions: ValidAction[],
    weights: StrategyWeights,
    game: GameModel,
    rng: () => number
  ): ValidAction {
    if (!actions.length) {
      throw new Error("PlayerSimulator.pick: actions is empty");
    }
    if (actions.length === 1) return actions[0];

    const scores = actions.map((a) => computeActionScore(a, game, weights, rng));

    if (weights.randomBias >= 1) {
      return actions[Math.floor(rng() * actions.length)];
    }

    const maxScore = Math.max(...scores);
    if (maxScore === Math.min(...scores) && weights.randomBias === 0) {
      return actions[Math.floor(rng() * actions.length)];
    }

    return weightedRandomSelect(actions, scores, rng);
  }
}
