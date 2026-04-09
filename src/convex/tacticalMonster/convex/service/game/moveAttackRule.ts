import type { GameMonster } from "../../types/monsterTypes";

/**
 * 远程单位（普攻射程 max>1）：本回合「移动 / 使用技能」二选一（与 class 无关）。
 * 近战：attack_range.max <= 1，可走位后在本回合内 useSkill/defend/standby。
 */
export function isRangedUnitForMoveAttackRule(character: Pick<GameMonster, "attack_range">): boolean {
    const max = character.attack_range?.max ?? 1;
    return max > 1;
}
