/**
 * 根据 StageRuleConfig.teamPreset 组装开局 GameMonster 列表
 */

import { calculateGameMonster, calculatePower, MONSTER_CONFIGS_MAP } from "../../data/monsterConfigs";
import { GameMonster, PlayerMonster } from "../../types/monsterTypes";
import { StagePlayerOverride, StageRuleConfig, TeamPresetSlot } from "../../types/stageRuleTypes";
import { TeamService } from "../team/teamService";

const MAX_TEAM = 4;

function nowIso() {
    return new Date().toISOString();
}

function filterSkillsByPedagogy(
    skills: string[] | undefined,
    allowedSkillIds?: string[]
): string[] {
    const s = skills ?? [];
    if (!allowedSkillIds?.length) return s;
    return s.filter((id) => allowedSkillIds.includes(id));
}

/**
 * 由预设槽位生成「伪」PlayerMonster（用于 override 或 merge 补位）
 */
export function playerMonsterFromPresetSlot(
    uid: string,
    slot: TeamPresetSlot,
    index: number,
    allowedSkillIds?: string[]
): PlayerMonster {
    const pos =
        slot.q !== undefined && slot.r !== undefined
            ? { q: slot.q, r: slot.r }
            : TeamService.getDefaultPosition(index);
    const t = nowIso();
    const rawSkills = slot.unlockSkills ?? [];
    return {
        uid,
        monsterId: slot.monsterId,
        level: slot.level ?? 1,
        stars: slot.stars ?? 1,
        experience: 0,
        shards: 0,
        isUnlocked: true,
        unlockedSkills: filterSkillsByPedagogy(rawSkills, allowedSkillIds),
        inTeam: 1,
        teamPosition: pos,
        obtainedAt: t,
        updatedAt: t,
    };
}

function rowToPlayerMonster(uid: string, row: any): PlayerMonster {
    const t = nowIso();
    return {
        uid: row.uid ?? uid,
        monsterId: row.monsterId,
        level: row.level ?? 1,
        stars: row.stars ?? 1,
        experience: row.experience ?? 0,
        shards: row.shards ?? 0,
        isUnlocked: row.isUnlocked !== false,
        unlockedSkills: row.unlockedSkills ?? [],
        inTeam: row.inTeam,
        teamPosition: row.teamPosition,
        obtainedAt: row.obtainedAt ?? t,
        updatedAt: row.updatedAt ?? t,
    };
}

async function toGameMonstersWithPower(playerMonsters: PlayerMonster[]): Promise<{
    team: GameMonster[];
    totalTeamPower: number;
}> {
    let totalTeamPower = 0;
    const team: GameMonster[] = [];
    for (let i = 0; i < playerMonsters.length; i++) {
        const pm = playerMonsters[i];
        const monsterConfig = MONSTER_CONFIGS_MAP[pm.monsterId];
        if (!monsterConfig) {
            throw new Error(`怪物配置不存在: ${pm.monsterId}`);
        }
        const pos = pm.teamPosition ?? TeamService.getDefaultPosition(i);
        const gameMonster = calculateGameMonster(pm, monsterConfig, pos);
        const basePower =
            gameMonster.stats.hp.max + gameMonster.stats.attack * 2 + gameMonster.stats.defense * 1.5;
        totalTeamPower += Math.floor(basePower);
        team.push(gameMonster);
    }
    return { team, totalTeamPower };
}

function applyPlayerOverrides(
    team: GameMonster[],
    overrides: StagePlayerOverride[] | undefined
): GameMonster[] {
    if (!overrides?.length) return team;
    return team.map((gm) => {
        const ov = overrides.find((o) => o.monsterId === gm.monsterId);
        if (!ov) return gm;
        const hp = ov.hp ?? gm.stats.hp.max;
        return {
            ...gm,
            stats: {
                ...gm.stats,
                hp: {
                    current: hp,
                    max: hp,
                },
                attack: ov.attack ?? gm.stats.attack,
                defense: ov.defense ?? gm.stats.defense,
                speed: ov.speed ?? gm.stats.speed,
            },
        };
    });
}

function recalcTeamPower(team: GameMonster[]): number {
    return team.reduce((sum, gm) => {
        const p = gm.stats.hp.max + gm.stats.attack * 2 + gm.stats.defense * 1.5;
        return sum + Math.floor(p);
    }, 0);
}

/**
 * 读取关卡规则，将玩家队伍行数据与 teamPreset 合并为最终上场列表
 */
export async function buildGameTeamFromStageRule(
    uid: string,
    playerTeamRows: any[],
    stageRule: StageRuleConfig | undefined
): Promise<{ team: GameMonster[]; totalTeamPower: number }> {
    const preset = stageRule?.teamPreset;
    const mode = preset?.mode ?? "none";
    const allowed = stageRule?.pedagogy?.allowedSkillIds;
    const playerOverrides = stageRule?.stageContent?.playerOverrides;

    if (!preset || mode === "none") {
        if (!playerTeamRows.length) {
            throw new Error(`玩家 ${uid} 没有配置队伍`);
        }
        const pms = playerTeamRows.map((r) => rowToPlayerMonster(uid, r));
        const base = await toGameMonstersWithPower(pms.slice(0, MAX_TEAM));
        const team = applyPlayerOverrides(base.team, playerOverrides);
        return { team, totalTeamPower: recalcTeamPower(team) };
    }

    if (mode === "override") {
        const slots = preset.slots ?? [];
        if (slots.length === 0) {
            throw new Error(`关卡 ${stageRule?.ruleId ?? "?"} teamPreset override 缺少 slots`);
        }
        const pms = slots.map((s, i) => playerMonsterFromPresetSlot(uid, s, i, allowed));
        const base = await toGameMonstersWithPower(pms.slice(0, MAX_TEAM));
        const team = applyPlayerOverrides(base.team, playerOverrides);
        return { team, totalTeamPower: recalcTeamPower(team) };
    }

    // merge
    const byId = new Map<string, PlayerMonster>();
    for (const row of playerTeamRows) {
        const pm = rowToPlayerMonster(uid, row);
        byId.set(pm.monsterId, pm);
    }

    for (let si = 0; si < (preset.slots ?? []).length; si++) {
        const slot = preset.slots![si];
        const existing = byId.get(slot.monsterId);
        const fromSlot = playerMonsterFromPresetSlot(uid, slot, si, allowed);
        const rawSkillSource =
            slot.unlockSkills && slot.unlockSkills.length > 0
                ? slot.unlockSkills
                : existing?.unlockedSkills;
        const mergedSkills = filterSkillsByPedagogy(rawSkillSource, allowed);
        const finalSkills =
            mergedSkills.length > 0 ? mergedSkills : existing?.unlockedSkills ?? fromSlot.unlockedSkills ?? [];
        const pos =
            slot.q !== undefined && slot.r !== undefined
                ? { q: slot.q, r: slot.r }
                : existing?.teamPosition ?? fromSlot.teamPosition;

        const merged: PlayerMonster = {
            ...(existing ?? fromSlot),
            monsterId: slot.monsterId,
            level: slot.level ?? existing?.level ?? 1,
            stars: slot.stars ?? existing?.stars ?? 1,
            unlockedSkills: finalSkills,
            teamPosition: pos,
        };
        byId.set(slot.monsterId, merged);
    }

    const ordered: PlayerMonster[] = [];
    const used = new Set<string>();
    for (const slot of preset.slots ?? []) {
        const pm = byId.get(slot.monsterId);
        if (pm && !used.has(slot.monsterId)) {
            ordered.push(pm);
            used.add(slot.monsterId);
        }
    }
    for (const row of playerTeamRows) {
        const id = row.monsterId as string;
        if (!used.has(id) && byId.has(id)) {
            ordered.push(byId.get(id)!);
            used.add(id);
        }
    }

    if (ordered.length === 0) {
        throw new Error(`玩家 ${uid} 没有配置队伍`);
    }

    const withPositions = ordered.map((pm, i) => ({
        ...pm,
        teamPosition: pm.teamPosition ?? TeamService.getDefaultPosition(i),
    }));

    const base = await toGameMonstersWithPower(withPositions.slice(0, MAX_TEAM));
    const team = applyPlayerOverrides(base.team, playerOverrides);
    return { team, totalTeamPower: recalcTeamPower(team) };
}

/**
 * 用于加入锦标赛时上报 teamPower：override 预设时用预设估算战力
 */
export function estimateTeamPowerFromStageRule(stageRule: StageRuleConfig | undefined): number {
    const preset = stageRule?.teamPreset;
    if (!preset || preset.mode !== "override" || !preset.slots?.length) {
        return 0;
    }
    let total = 0;
    const playerOverrides = stageRule?.stageContent?.playerOverrides ?? [];
    for (const slot of preset.slots.slice(0, MAX_TEAM)) {
        const config = MONSTER_CONFIGS_MAP[slot.monsterId];
        if (!config) continue;
        const ov = playerOverrides.find((o) => o.monsterId === slot.monsterId);
        const level = slot.level ?? 1;
        const stars = slot.stars ?? 1;
        const hpGrowthRate = 0.15;
        const damageGrowthRate = 0.1;
        const defenseGrowthRate = 0.12;
        const actualHp = ov?.hp ?? (config.baseHp * (1 + (level - 1) * hpGrowthRate));
        const actualAttack = ov?.attack ?? (config.baseDamage * (1 + (level - 1) * damageGrowthRate));
        const actualDefense = ov?.defense ?? (config.baseDefense * (1 + (level - 1) * defenseGrowthRate));
        const starMultiplier = 1 + (stars - 1) * 0.1;
        total += Math.floor(calculatePower(actualAttack, actualDefense, actualHp, starMultiplier));
    }
    return total;
}
