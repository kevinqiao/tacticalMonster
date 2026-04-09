/**
 * 合法动作枚举器
 * 从 GameModel 生成 PlayerSimulator 所需的 ValidAction[]
 */

import type { CharacterIdentifier } from "../../types/gameTypes";
import type { GameModel } from "../../types/gameTypes";
import type { GameBoss, GameMinion, GameMonster } from "../../types/monsterTypes";
import { getSkillConfig, skillExists } from "../../data/skillConfigs";
import { offsetHexDistance } from "../../utils/hexUtils";
import { getAliveAllies, getAliveEnemies, getReachableCells } from "../../utils/boardReachability";
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
      const dist =
        range.distance ??
        range.max_distance ??
        (character as { attack_range?: { max?: number } }).attack_range?.max ??
        1;
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

      const candidates = targetSide === "friend" ? getAliveAllies(game) : getAliveEnemies(game);
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
