import { calculateGameMonster, MONSTER_CONFIGS_MAP } from "../../config/monsterConfigs";
import { powerFromGameMonsterStats } from "../utils/teamLayoutTeamPower";
import type { PlayerMonster } from "../../types/monsterTypes";
import type { HoverStatLine } from "./TeamLayoutHoverPanel";

/** 编队界面：玩家怪物悬停面板（等级/星级成长后的战斗属性，与开局 GameMonster 一致） */
export function buildMonsterHoverStatLines(
    monsterId: string,
    roster: PlayerMonster[] | null | undefined,
): HoverStatLine[] {
    const cfg = MONSTER_CONFIGS_MAP[monsterId];
    const row = roster?.find((m) => m.monsterId === monsterId);
    const lines: HoverStatLine[] = [];

    lines.push({ label: "Name", value: cfg?.name ?? monsterId });
    if (row?.level != null) lines.push({ label: "Level", value: String(row.level) });
    if (row?.stars != null) lines.push({ label: "Stars", value: String(row.stars) });

    if (row && cfg) {
        const gm = calculateGameMonster(row, cfg);
        lines.push({ label: "HP", value: String(gm.stats.hp.max) });
        lines.push({ label: "Atk", value: String(gm.stats.attack) });
        lines.push({ label: "Def", value: String(gm.stats.defense) });
        lines.push({ label: "Spd", value: String(gm.stats.speed) });
        lines.push({ label: "Power (est.)", value: String(powerFromGameMonsterStats(gm)) });
    } else if (cfg) {
        lines.push({ label: "Base HP", value: String(cfg.baseHp ?? "—") });
        lines.push({ label: "Base Atk", value: String(cfg.baseDamage ?? "—") });
        lines.push({ label: "Base Def", value: String(cfg.baseDefense ?? "—") });
        lines.push({ label: "Base Spd", value: String(cfg.baseSpeed ?? "—") });
    }

    const skills = row?.unlockedSkills;
    if (Array.isArray(skills) && skills.length > 0) {
        const s = skills.map(String).slice(0, 8);
        lines.push({
            label: "Skills",
            value: s.join(", ") + (skills.length > 8 ? " …" : ""),
        });
    }
    return lines;
}

function normalizeSkillIds(raw: unknown): string[] {
    if (!Array.isArray(raw) || raw.length === 0) return [];
    return raw.map((s) => {
        if (typeof s === "string") return s;
        if (s && typeof s === "object" && "skillId" in s && typeof (s as { skillId: unknown }).skillId === "string") {
            return (s as { skillId: string }).skillId;
        }
        return String(s);
    });
}

export type BossBaseStats = {
    hp: number;
    damage: number;
    defense: number;
    speed: number;
};

export type BossHoverMeta = {
    /** 当前部署队伍战力（与开局缩放用公式一致） */
    teamPower?: number;
    /** 关卡 difficulty，作为 Boss 缩放的 difficultyMultiplier */
    stageDifficulty?: number;
    /** 合并配置起始值；与 boss 当前四维一起展示为「起始 → 缩放」 */
    baseStats?: BossBaseStats;
};

/** 起始（合并配置）→ 当前缩放预览；相同时也显示便于对照 */
function fmtBaseToScaled(base: number, scaled: number): string {
    return `${base} → ${scaled}`;
}

/** Boss 悬停面板：起始（合并配置）→ 缩放后（calculateScaleBoss） */
export function buildBossHoverStatLines(
    boss: {
        monsterId: string;
        hp: number;
        damage: number;
        defense: number;
        speed: number;
        name?: string;
        skills?: unknown;
    },
    meta?: BossHoverMeta,
): HoverStatLine[] {
    const cfg = MONSTER_CONFIGS_MAP[boss.monsterId];
    const lines: HoverStatLine[] = [];
    const b = meta?.baseStats;

    if (meta?.teamPower !== undefined) {
        lines.push({ label: "Your team power", value: String(meta.teamPower) });
    }
    if (meta?.stageDifficulty !== undefined) {
        lines.push({ label: "Stage factor", value: String(meta.stageDifficulty) });
    }

    lines.push(
        {
            label: "HP",
            value: b ? fmtBaseToScaled(b.hp, boss.hp) : String(boss.hp),
        },
        {
            label: "Atk",
            value: b ? fmtBaseToScaled(b.damage, boss.damage) : String(boss.damage),
        },
        {
            label: "Def",
            value: b ? fmtBaseToScaled(b.defense, boss.defense) : String(boss.defense),
        },
        {
            label: "Spd",
            value: b ? fmtBaseToScaled(b.speed, boss.speed) : String(boss.speed),
        },
    );
    const fromBoss = normalizeSkillIds(boss.skills);
    const fromCfg = normalizeSkillIds(cfg?.skillIds);
    const skills = fromBoss.length > 0 ? fromBoss : fromCfg;
    if (skills.length > 0) {
        const shown = skills.slice(0, 8);
        lines.push({
            label: "Skills",
            value: shown.join(", ") + (skills.length > 8 ? " …" : ""),
        });
    }
    return lines;
}

export function getBossHoverTitle(boss: { monsterId: string; name?: string }): string {
    const cfg = MONSTER_CONFIGS_MAP[boss.monsterId];
    return boss.name ?? cfg?.name ?? boss.monsterId;
}
