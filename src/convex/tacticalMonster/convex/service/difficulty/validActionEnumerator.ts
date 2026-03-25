/**
 * 合法动作枚举器
 * 从 GameModel 生成 PlayerSimulator 所需的 ValidAction[]
 */

import type { CharacterIdentifier } from "../../types/gameTypes";
import type { GameModel } from "../../types/gameTypes";
import type { GameBoss, GameMinion, GameMonster } from "../../types/monsterTypes";
import { getSkillConfig, skillExists } from "../../data/skillConfigs";
import { offsetHexDistance } from "../../utils/hexUtils";
import { getOffsetNeighbors } from "../../utils/hexUtils";
import type { ValidAction } from "./types";
import { CharacterQueryService } from "../game/characterQueryService";
import { SkillTargetService } from "../game/skillTargetService";

function toCharacterIdentifier(game: GameModel, t: { uid: string; monsterId: string }): CharacterIdentifier {
  if (t.uid === "boss") {
    if (game.boss && (game.boss as any).bossId === t.monsterId) return { bossId: t.monsterId };
    return { minionId: t.monsterId };
  }
  return { monsterId: t.monsterId };
}

/** 获取敌方角色（Boss + 小怪，存活） */
function getEnemies(game: GameModel): GameMonster[] {
  const enemies: GameMonster[] = [];
  if (game.boss && (game.boss.stats?.hp?.current ?? 0) > 0) {
    enemies.push(game.boss as GameMonster);
  }
  for (const m of game.boss?.minions ?? []) {
    if ((m.stats?.hp?.current ?? 0) > 0) {
      enemies.push(m as GameMonster);
    }
  }
  return enemies;
}

/** 获取友方角色（存活） */
function getAllies(game: GameModel): GameMonster[] {
  return (game.team ?? []).filter((m) => (m.stats?.hp?.current ?? 0) > 0);
}

/** 检查格子是否被占用（障碍、禁用、角色） */
function isCellBlocked(
  game: GameModel,
  pos: { q: number; r: number },
  excludeChar?: GameMonster
): boolean {
  const { cols, rows } = game.map;
  if (pos.q < 0 || pos.q >= cols || pos.r < 0 || pos.r >= rows) return true;
  const obstacles = game.map.obstacles ?? [];
  if (obstacles.some((o: any) => o.q === pos.q && o.r === pos.r)) return true;
  const disables = game.map.disables ?? [];
  if (disables.some((d: any) => d.q === pos.q && d.r === pos.r)) return true;
  const allChars = [...(game.team ?? []), game.boss, ...(game.boss?.minions ?? [])].filter(Boolean);
  for (const c of allChars) {
    if (excludeChar && (c as any) === excludeChar) continue;
    const cid = (c as any).character_id ?? (c as any).bossId ?? (c as any).minionId ?? (c as any).monsterId;
    const eid = excludeChar ? ((excludeChar as any).character_id ?? (excludeChar as any).bossId ?? (excludeChar as any).minionId ?? excludeChar.monsterId) : null;
    if (cid === eid) continue;
    if ((c as any).q === pos.q && (c as any).r === pos.r) return true;
  }
  return false;
}

/** BFS 获取 move_range 内可达格子及步数 */
function getReachableCells(
  game: GameModel,
  from: { q: number; r: number },
  moveRange: number,
  character: GameMonster
): Array<{ q: number; r: number; steps: number }> {
  const { cols, rows } = game.map;
  const visited = new Set<string>();
  const result: Array<{ q: number; r: number; steps: number }> = [];
  const queue: Array<{ q: number; r: number; steps: number }> = [{ ...from, steps: 0 }];
  visited.add(`${from.q},${from.r}`);

  while (queue.length > 0) {
    const { q, r, steps } = queue.shift()!;
    if (steps > 0 && !isCellBlocked(game, { q, r }, character)) {
      result.push({ q, r, steps });
    }
    if (steps >= moveRange) continue;
    const neighbors = getOffsetNeighbors({ q, r }, cols, rows);
    for (const n of neighbors) {
      const key = `${n.q},${n.r}`;
      if (visited.has(key)) continue;
      visited.add(key);
      if (isCellBlocked(game, n, character)) continue;
      queue.push({ q: n.q, r: n.r, steps: steps + 1 });
    }
  }
  return result;
}

/** 判断技能是否可用（冷却、目标等简化校验） */
function isSkillAvailable(
  character: GameMonster,
  skillId: string
): boolean {
  const cooldowns = character.skillCooldowns ?? {};
  const cd = cooldowns[skillId] ?? 0;
  if (cd > 0) return false;
  const skill = getSkillConfig(skillId);
  if (!skill) return false;
  return true;
}

export class ValidActionEnumerator {
  constructor(
    private characterQueryService: CharacterQueryService,
    private skillTargetService: SkillTargetService
  ) {}

  /**
   * 枚举当前玩家回合的所有合法动作
   * @param game 游戏状态（需已 setGame）
   * @returns ValidAction[]
   */
  enumerate(game: GameModel): ValidAction[] {
    const actions: ValidAction[] = [];
    this.characterQueryService.setGame(game);

    const turn = game.currentRound?.turns?.find((t: any) => (t.status ?? 0) === 1);
    if (!turn || turn.uid === "boss") return actions;

    const characterId = turn.character_id;
    const params = this.characterQueryService.getCharacterParams(turn.uid, characterId);
    const character = this.characterQueryService.getCharacter(
      params.monsterId,
      params.bossId,
      params.minionId
    );
    if (!character || (character.stats?.hp?.current ?? 0) <= 0) return actions;

    const identifier: CharacterIdentifier = params.monsterId
      ? { monsterId: params.monsterId }
      : params.bossId
      ? { bossId: params.bossId }
      : { minionId: params.minionId! };

    let skills =
      character.unlockSkills ??
      character.skills ??
      (character as { unlockedSkills?: string[] }).unlockedSkills ??
      [];
    if (skills.length === 0 && skillExists("basic_attack")) {
      skills = ["basic_attack"];
    }
    const casterPos = { q: character.q ?? 0, r: character.r ?? 0 };
    const moveRange = character.move_range ?? 3;

    for (const skillId of skills) {
      if (!skillExists(skillId) || !isSkillAvailable(character, skillId)) continue;
      const skill = getSkillConfig(skillId);
      if (!skill?.range) continue;

      const range = skill.range;
      const dist = range.distance ?? range.max_distance ?? 1;
      const targetSide = range.target_side ?? "foe";

      if (range.area_type === "circle") {
        const targets = this.skillTargetService.calculateTargetsBySkillRange(character, skillId);
        if (targets.length > 0) {
          actions.push({
            type: "useSkill",
            identifier,
            skillId,
            targets: targets.map((t) => toCharacterIdentifier(game, t)),
          });
        }
        continue;
      }

      const candidates = targetSide === "friend" ? getAllies(game) : getEnemies(game);
      for (const target of candidates) {
        const targetPos = { q: (target as any).q ?? 0, r: (target as any).r ?? 0 };
        if (offsetHexDistance(casterPos, targetPos) > dist) continue;
        const targetId = (target as GameBoss).bossId ?? (target as GameMinion).minionId ?? target.monsterId;
        const primary = { uid: target.uid, monsterId: targetId };
        const targetsList = this.skillTargetService.calculateTargetsBySkillRange(character, skillId, primary);
        if (targetsList.length > 0) {
          actions.push({
            type: "useSkill",
            identifier,
            skillId,
            targets: targetsList.map((t) => toCharacterIdentifier(game, t)),
          });
        }
      }
    }

    const reachable = getReachableCells(game, casterPos, moveRange, character);
    for (const { q, r, steps } of reachable) {
      actions.push({ type: "walk", identifier, to: { q, r }, steps });
    }

    actions.push({ type: "defend", identifier });

    return actions;
  }
}
