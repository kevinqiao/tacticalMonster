/**
 * 编队预览：与 convex teamPresetService.toGameMonstersWithPower 一致的队伍战力累加，
 * 用于 Boss 缩放与 calculateScaleBoss(playerPower, …) 对齐。
 */
import { calculateGameMonster, MONSTER_CONFIGS_MAP } from "../../config/monsterConfigs";
import type { PlayerMonster } from "../../types/monsterTypes";

export function powerFromGameMonsterStats(gm: ReturnType<typeof calculateGameMonster>): number {
    return Math.floor(gm.stats.hp.max + gm.stats.attack * 2 + gm.stats.defense * 1.5);
}

/**
 * 仅统计当前已部署在网格上的角色（有 teamPosition）。
 */
export function computeDeployedTeamPowerLikeGame(
    roster: PlayerMonster[] | null | undefined,
    deployed: { monsterId: string; teamPosition?: { q: number; r: number } }[],
): number {
    if (!roster?.length || !deployed.length) return 0;
    let total = 0;
    for (const slot of deployed) {
        if (!slot.teamPosition) continue;
        const row = roster.find((m) => m.monsterId === slot.monsterId);
        if (!row) continue;
        const cfg = MONSTER_CONFIGS_MAP[slot.monsterId];
        if (!cfg) continue;
        const gm = calculateGameMonster(row, cfg, slot.teamPosition);
        total += powerFromGameMonsterStats(gm);
    }
    return total;
}
