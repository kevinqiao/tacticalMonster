/**
 * 将召唤单位合并进 game（不可变更新）
 */

import { MONSTER_CONFIGS_MAP } from "../config/monsterConfigs";
import type { GameModel } from "../types/gameTypes";
import type { SummonedCharacter } from "../types/gameTypes";

export function mergeSummonedIntoGame(
    game: GameModel,
    summonedCharacters: SummonedCharacter[]
): GameModel {
    if (!summonedCharacters?.length) return game;
    const existingIds = new Set(
        (game.team ?? []).map((m: any) => (m.character_id ?? m.monsterId) as string)
    );
    const toTeam: GameModel["team"][number][] = [];
    const toMinions: NonNullable<GameModel["boss"]["minions"]>[number][] = [];
    for (const u of summonedCharacters) {
        // 与后端 round.turns 对齐：优先保留后端给的实例 id，避免前端重建新 id 导致 turn 匹配失败
        const character_id = u.character_id || u.minionId || u.bossId || `${u.uid}_${u.monsterId}`;
        if (existingIds.has(character_id)) continue;
        existingIds.add(character_id);
        const monsterConfig = MONSTER_CONFIGS_MAP[u.monsterId];
        const move_range = monsterConfig?.moveRange ?? 3;
        const attack_range = monsterConfig?.attackRange ?? { min: 1, max: 2 };
        const isFlying = monsterConfig?.race === "Flying";
        const base = {
            uid: u.uid,
            monsterId: u.monsterId,
            character_id,
            q: u.q,
            r: u.r,
            name: u.name ?? u.monsterId,
            rarity: "Common" as const,
            assetPath: u.assetPath ?? "",
            level: 1,
            stars: 1,
            stats: u.stats,
            statusEffects: u.statusEffects ?? [],
            skillCooldowns: u.skillCooldowns ?? {},
            skills: u.skills ?? [],
            move_range,
            attack_range,
            isFlying,
            canIgnoreObstacles: isFlying,
        };
        if (u.uid === game.uid) {
            toTeam.push(base as unknown as GameModel["team"][number]);
        } else if (u.uid === "boss" && u.minionId) {
            toMinions.push({
                ...base,
                minionId: u.minionId,
            } as unknown as NonNullable<GameModel["boss"]["minions"]>[number]);
        }
    }
    return {
        ...game,
        team: toTeam.length > 0 ? [...game.team, ...toTeam] : game.team,
        boss:
            toMinions.length > 0
                ? { ...game.boss, minions: [...(game.boss.minions ?? []), ...toMinions] }
                : game.boss,
    };
}
