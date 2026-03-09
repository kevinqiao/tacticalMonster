import type { MonsterSprite } from "../types/CombatTypes";
import type { GameModel } from "../types/gameTypes";

type Pos = { q?: number; r?: number };

const getCharacterId = (unit: { character_id?: string; monsterId?: string; bossId?: string; minionId?: string }): string | null =>
    unit.character_id ?? unit.minionId ?? unit.bossId ?? unit.monsterId ?? null;

const patchUnitPosition = <T extends { q?: number; r?: number; character_id?: string; monsterId?: string; bossId?: string; minionId?: string }>(
    unit: T,
    posById: Map<string, Pos>
): T => {
    const id = getCharacterId(unit);
    if (!id) return unit;
    const pos = posById.get(id);
    if (!pos) return unit;
    if (pos.q === unit.q && pos.r === unit.r) return unit;
    return {
        ...unit,
        q: pos.q ?? unit.q,
        r: pos.r ?? unit.r,
    };
};

/**
 * 将实时角色坐标回填到 game 快照，避免后续 mergeSummoned 时用旧快照覆盖当前位置。
 */
export function syncCharacterPositionsToGame(
    game: GameModel,
    characters: MonsterSprite[] | null | undefined
): GameModel {
    if (!characters?.length) return game;

    const posById = new Map<string, Pos>();
    for (const c of characters) {
        if (!c.character_id) continue;
        posById.set(c.character_id, { q: c.q, r: c.r });
    }

    const nextTeam = game.team.map((m) => patchUnitPosition(m as any, posById));
    const nextBoss = patchUnitPosition(game.boss as any, posById);
    const nextMinions = (game.boss.minions ?? []).map((m) => patchUnitPosition(m as any, posById));

    return {
        ...game,
        team: nextTeam,
        boss: {
            ...nextBoss,
            minions: nextMinions,
        },
    };
}
