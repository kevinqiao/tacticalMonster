/**
 * 按战场状态动态切换教学提示（与 handleCellClick / 格子高亮一致）
 */

import { getSkillConfig } from "../config/skillConfigs";
import type { MonsterSprite } from "../types/CombatTypes";
import type { BattleCellState } from "../battle3d/handler/useBattleGridState";
import { offsetHexDistance } from "./hexUtil";
import { resolveAttackProfile } from "./skillRangeUtils";

export type PedagogyGuidePhase = "move" | "skill" | "target";

/** 与 GameRound.turns 中当前行动回合字段对齐（教学提示用） */
type PedagogyActiveTurn = {
    status?: number;
    uid?: string;
    skillSelect?: string;
    stepsUsed?: number;
    character_id?: string;
    monsterId?: string;
    bossId?: string;
    minionId?: string;
};

const BRONZE_BOSS_1_RULE = "monster_rumble_challenge_bronze_boss_1";
const BRONZE_BOSS_3_RULE = "monster_rumble_challenge_bronze_boss_3";

const TEXT_B3_NEED_MOVE =
    "本关教学：先在本局内完成一次「移动」（点蓝色可走格）。每回合仅一次移动指令，可走满移动力。";
const TEXT_B3_NEED_CAST =
    "本关教学：再完成一次「施法」——在技能栏选技能后点目标（任意技能均可，含普攻与护盾）。";

const TEXT_MOVE =
    "点击蓝色可走格移动靠近敌人。近亮远灰表示距离；走远灰格会用尽步数、本回合常直接结束。未高亮深灰多为障碍。";
const TEXT_SKILL =
    "点击下方「普攻」选中技能（若已在射程内，也可直接点敌人红格，无需先点技能）。";
const TEXT_TARGET = "点击高亮的敌人红格完成普攻。";

function hasCellState(states: Map<string, BattleCellState>, s: BattleCellState): boolean {
    for (const v of states.values()) {
        if (v === s) return true;
    }
    return false;
}

function minHexDistanceToHostiles(self: MonsterSprite, hostiles: MonsterSprite[]): number {
    if (!hostiles.length) return 999;
    const a = { q: self.q ?? 0, r: self.r ?? 0 };
    return Math.min(...hostiles.map((h) => offsetHexDistance(a, { q: h.q ?? 0, r: h.r ?? 0 })));
}

/**
 * 首关：按「移动 → 选技能 → 点人」意图动态切换，但会跳过当前不需要的阶段（如已在射程则不再强调移动）。
 */
export function getBronzeBoss1DynamicGuideText(
    game: { currentRound?: { turns?: PedagogyActiveTurn[] } } | null,
    characters: MonsterSprite[] | undefined,
    cellStates: Map<string, BattleCellState>
): { phase: PedagogyGuidePhase; text: string } | null {
    if (!game?.currentRound?.turns?.length || !characters?.length) return null;

    const turn = game.currentRound.turns.find((t) => t.status === 1);
    if (!turn || turn.uid === "boss") return null;

    const turnActorId = turn.character_id ?? turn.monsterId ?? turn.bossId ?? turn.minionId;
    let self = characters.find((c) => (c as { character_id?: string }).character_id === turnActorId);
    if (!self && turnActorId) {
        self = characters.find((c) => (c as { monsterId?: string }).monsterId === turnActorId);
    }
    if (!self || (self as { uid?: string }).uid === "boss") return null;

    const hostiles = characters.filter((c) => c.uid === "boss");
    const skillSelect = turn.skillSelect;

    if (skillSelect) {
        return { phase: "target", text: TEXT_TARGET };
    }

    const profile = resolveAttackProfile(self);
    const skillCfg = getSkillConfig(profile.skillId);
    const minDist = minHexDistanceToHostiles(self, hostiles);
    const minR = skillCfg?.range?.min_distance ?? 1;
    const maxR = profile.attackRange;
    const inAttackRange = hostiles.length > 0 && minDist >= minR && minDist <= maxR;

    const stepsUsed = turn.stepsUsed ?? 0;
    const moveRange = self.move_range ?? 3;
    const remainingMove = Math.max(0, moveRange - stepsUsed);

    const hasWalk = hasCellState(cellStates, "walkable");
    const canMoveMore = remainingMove > 0;

    if (canMoveMore && hasWalk && !inAttackRange) {
        return { phase: "move", text: TEXT_MOVE };
    }

    return { phase: "skill", text: TEXT_SKILL };
}

/**
 * 关 3：dynamicGuideRule = all(move, any_cast)。按 tutorialProgress.dynamicAllProgress 提示缺哪一步。
 */
export function getBronzeBoss3DynamicGuideText(
    game: {
        tutorialProgress?: { dynamicAllProgress?: boolean[]; dynamicGuideSatisfied?: boolean };
    } | null
): { phase: PedagogyGuidePhase; text: string } | null {
    if (game?.tutorialProgress?.dynamicGuideSatisfied) {
        return null;
    }
    const prog = game?.tutorialProgress?.dynamicAllProgress;
    const moveDone = prog?.[0] === true;
    const castDone = prog?.[1] === true;
    if (!moveDone) {
        return { phase: "move", text: TEXT_B3_NEED_MOVE };
    }
    if (!castDone) {
        return { phase: "skill", text: TEXT_B3_NEED_CAST };
    }
    return null;
}

export function getDynamicPedagogyGuideText(
    ruleId: string | undefined,
    game: Parameters<typeof getBronzeBoss1DynamicGuideText>[0] & {
        tutorialProgress?: { dynamicAllProgress?: boolean[]; dynamicGuideSatisfied?: boolean };
    },
    characters: MonsterSprite[] | undefined,
    cellStates: Map<string, BattleCellState>
): { phase: PedagogyGuidePhase; text: string } | null {
    if (ruleId === BRONZE_BOSS_1_RULE) {
        return getBronzeBoss1DynamicGuideText(game, characters, cellStates);
    }
    if (ruleId === BRONZE_BOSS_3_RULE) {
        return getBronzeBoss3DynamicGuideText(game);
    }
    return null;
}

export function phaseLabel(phase: PedagogyGuidePhase): string {
    switch (phase) {
        case "move":
            return "移动";
        case "skill":
            return "选技能";
        case "target":
            return "选择目标";
        default:
            return "";
    }
}
