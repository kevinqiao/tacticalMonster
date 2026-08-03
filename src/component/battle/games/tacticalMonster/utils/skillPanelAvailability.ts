/**
 * 技能栏可选状态（携带 / 等级 / 棋盘目标），与后端 selectSkill 校验对齐思路，
 * 并与 usePlaySkillSelect3D 的高亮计算共用 PathFind.getAttackableNodes。
 */

import { MONSTER_CONFIGS_MAP } from "../config/monsterConfigs";
import type { GridCellSprite, MonsterSprite } from "../types/CombatTypes";
import type { MonsterSkill } from "../types/skillTypes";
import { SkillEffectType } from "../types/skillTypes";
import { getStageRuleConfig } from "../config/stageRuleConfigs";
import { getAttackableNodes } from "./PathFind";
import { getSkillPreviewTargetCandidates } from "./skillRangeUtils";

/**
 * 技能栏展示的 ID 列表：怪物配置 skillIds + 运行时 skills/unlockSkills，并含 basic_attack。
 * 与后端 mergeBattleSkillsFromConfig 对齐，避免仅 runtime 为 ["basic_attack"] 时缺职业技。
 */
export function getMergedSkillIdsForPanel(character: MonsterSprite | undefined): string[] {
    if (!character) return ["basic_attack"];
    const mid = character.monsterId;
    const configIds =
        mid && MONSTER_CONFIGS_MAP[mid]?.skillIds?.length
            ? [...MONSTER_CONFIGS_MAP[mid].skillIds!]
            : [];
    const fromRuntime =
        character.skills?.length
            ? [...character.skills]
            : (character as { unlockSkills?: string[] }).unlockSkills?.length
              ? [...(character as { unlockSkills?: string[] }).unlockSkills!]
              : [];
    const merged = new Set<string>();
    for (const id of configIds) merged.add(id);
    for (const id of fromRuntime) merged.add(id);
    if (merged.size === 0) merged.add("basic_attack");
    else if (!merged.has("basic_attack")) merged.add("basic_attack");
    return Array.from(merged);
}

/** 与后端 skillTargetService.skillEffectsNeedTarget 一致（需棋盘目标的技能） */
export function skillEffectsNeedBoardTarget(skill: MonsterSkill): boolean {
    const effects = skill.effects ?? [];
    return effects.some((effect) => {
        if (effect.type === SkillEffectType.SUMMON) return false;
        return (
            effect.type === SkillEffectType.DAMAGE ||
            effect.type === SkillEffectType.HEAL ||
            effect.type === SkillEffectType.CLEANSE ||
            effect.type === SkillEffectType.DEBUFF ||
            effect.type === SkillEffectType.STUN ||
            effect.type === SkillEffectType.MP_DRAIN ||
            effect.type === SkillEffectType.SHIELD ||
            effect.type === SkillEffectType.BUFF ||
            effect.type === SkillEffectType.HOT ||
            effect.type === SkillEffectType.DOT ||
            effect.type === SkillEffectType.MP_RESTORE
        );
    });
}

/**
 * 当前角色是否视为「携带」该技能（队伍技能表 + 解锁表 + 关卡 pedagogy 允许名单，与后端合并 roster 对齐）
 */
export function isSkillCarriedByCharacter(
    character: MonsterSprite,
    skillId: string,
    ruleId: string | undefined
): boolean {
    const roster = new Set<string>([
        ...(character.skills ?? []),
        ...((character as { unlockSkills?: string[] }).unlockSkills ?? []),
    ]);
    const mid = (character as { monsterId?: string }).monsterId;
    if (mid && MONSTER_CONFIGS_MAP[mid]?.skillIds?.includes(skillId)) return true;
    if (roster.has(skillId)) return true;
    const allowed = ruleId ? getStageRuleConfig(ruleId)?.pedagogy?.allowedSkillIds : undefined;
    if (allowed?.includes(skillId)) return true;
    return false;
}

/**
 * 等级不足锁定；教学关 pedagogy 允许的技能与 unlockSkills 一样跳过等级（与后端 checkSkillUnlock 对齐）
 */
export function isSkillLevelLocked(
    skillId: string,
    requiredLevel: number | undefined,
    charLevel: number,
    unlockSkillIds: Set<string>,
    pedagogyAllowedSkillIds: string[] | undefined
): boolean {
    if (pedagogyAllowedSkillIds?.includes(skillId)) return false;
    if (unlockSkillIds.has(skillId)) return false;
    return requiredLevel != null && charLevel < requiredLevel;
}

/**
 * 当前站位与剩余步数下是否存在可选目标（与技能栏高亮一致）
 */
export function hasAttackableTargetsForSkill(
    groundCells: GridCellSprite[][] | null | undefined,
    characters: MonsterSprite[] | undefined,
    caster: MonsterSprite,
    skill: MonsterSkill,
    remainingMoveSteps: number
): boolean {
    if (!groundCells?.length || !characters?.length) return false;
    if (!skill?.range) return true;
    if (!skillEffectsNeedBoardTarget(skill)) return true;

    const isFlying = caster.isFlying ?? false;
    const canIgnoreObstacles = caster.canIgnoreObstacles ?? isFlying;

    const grid = groundCells.map((row) =>
        row.map((cell) => {
            const char =
                caster.q === cell.q && caster.r === cell.r
                    ? null
                    : characters.find((c) => c.q === cell.q && c.r === cell.r);
            return {
                q: cell.q,
                r: cell.r,
                walkable: char ? false : !cell.disable,
            };
        })
    );

    const targetCandidates = getSkillPreviewTargetCandidates(
        caster,
        characters,
        skill
    );
    if (targetCandidates.length === 0) return false;

    const attackableNodes = getAttackableNodes(
        grid,
        {
            q: caster.q ?? 0,
            r: caster.r ?? 0,
            uid: caster.uid,
            character_id: caster.character_id,
            moveRange: remainingMoveSteps,
            attackRange: caster.attack_range || { min: 1, max: 2 },
        },
        targetCandidates,
        skill,
        canIgnoreObstacles
    );
    return attackableNodes.length > 0;
}
