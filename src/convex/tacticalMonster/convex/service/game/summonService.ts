/**
 * 召唤服务
 * 处理召唤技能：解析位置、创建召唤单位、追加到 game 并持久化
 */

import { mergeBattleSkillsFromConfig, MONSTER_CONFIGS_MAP } from "../../data/monsterConfigs";
import { CharacterIdentifier, GameModel, SummonedCharacter } from "../../types/gameTypes";
import { GameMinion, GameMonster } from "../../types/monsterTypes";
import { SkillEffect } from "../../types/skillTypes";
import { getNeighbors } from "../../utils/hexUtils";

type HexCoord = { q: number; r: number };

/**
 * 获取所有已占用格子的集合（team + boss + boss.minions）
 */
function getOccupiedSet(game: GameModel): Set<string> {
    const occupied = new Set<string>();
    if (game.team) {
        game.team.forEach((m: GameMonster) => {
            if (m.q != null && m.r != null) occupied.add(`${m.q},${m.r}`);
        });
    }
    if (game.boss?.q != null && game.boss?.r != null) {
        occupied.add(`${game.boss.q},${game.boss.r}`);
    }
    if (game.boss?.minions) {
        game.boss.minions.forEach((m: GameMinion) => {
            const q = m.q ?? (m as any).position?.q ?? 0;
            const r = m.r ?? (m as any).position?.r ?? 0;
            occupied.add(`${q},${r}`);
        });
    }
    return occupied;
}

/**
 * 获取障碍物和禁用格子集合
 */
function getObstaclesAndDisables(game: GameModel): Set<string> {
    const set = new Set<string>();
    const map = game.map;
    if (!map) return set;
    (map.obstacles ?? []).forEach((o: { q: number; r: number }) => set.add(`${o.q},${o.r}`));
    (map.disables ?? []).forEach((d: { q: number; r: number }) => set.add(`${d.q},${d.r}`));
    return set;
}

/**
 * 解析召唤位置
 */
export function resolvePosition(
    game: GameModel,
    caster: GameMonster,
    effect: SkillEffect,
    targets: CharacterIdentifier[]
): { q: number; r: number } | null {
    const config = effect.summonConfig;
    if (!config) return null;

    const casterQ = caster.q ?? 0;
    const casterR = caster.r ?? 0;
    const map = game.map;
    const rows = map?.rows ?? 20;
    const cols = map?.cols ?? 20;
    const occupied = getOccupiedSet(game);
    const obstacles = getObstaclesAndDisables(game);

    const inBounds = (q: number, r: number) => q >= 0 && r >= 0 && q < cols && r < rows;
    const isAvailable = (q: number, r: number) => inBounds(q, r) && !obstacles.has(`${q},${r}`) && !occupied.has(`${q},${r}`);

    switch (config.position_mode) {
        case "caster_adjacent": {
            const neighbors = getNeighbors({ q: casterQ, r: casterR });
            for (const cell of neighbors) {
                if (isAvailable(cell.q, cell.r)) return cell;
            }
            return null;
        }
        case "skill_target": {
            if (targets.length === 0) return null;
            const target = targets[0];
            let tq = 0, tr = 0;
            if (target.monsterId) {
                const teamMember = game.team?.find((m: any) =>
                    (m.character_id ?? m.monsterId) === target.monsterId
                );
                if (teamMember && teamMember.q != null && teamMember.r != null) {
                    tq = teamMember.q; tr = teamMember.r;
                }
            } else if (target.bossId) {
                if (game.boss?.bossId === target.bossId && game.boss.q != null && game.boss.r != null) {
                    tq = game.boss.q; tr = game.boss.r;
                }
            } else if (target.minionId) {
                const minion = game.boss?.minions?.find((m: GameMinion) => m.minionId === target.minionId);
                if (minion) {
                    tq = minion.q ?? (minion as any).position?.q ?? 0;
                    tr = minion.r ?? (minion as any).position?.r ?? 0;
                }
            }
            if (isAvailable(tq, tr)) return { q: tq, r: tr };
            const neighbors = getNeighbors({ q: tq, r: tr });
            for (const cell of neighbors) {
                if (isAvailable(cell.q, cell.r)) return cell;
            }
            return null;
        }
        case "fixed": {
            const q = config.q ?? (casterQ + (config.dq ?? 0));
            const r = config.r ?? (casterR + (config.dr ?? 0));
            if (isAvailable(q, r)) return { q, r };
            return null;
        }
        default:
            return null;
    }
}

/**
 * 创建召唤单位列表
 */
export function createSummonedCharacters(
    game: GameModel,
    caster: GameMonster,
    effect: SkillEffect,
    targets: CharacterIdentifier[]
): SummonedCharacter[] {
    const config = effect.summonConfig;
    if (!config?.monsterId) return [];

    const monsterConfig = MONSTER_CONFIGS_MAP[config.monsterId];
    if (!monsterConfig) return [];

    const pos = resolvePosition(game, caster, effect, targets);
    if (!pos) return [];

    const side = config.side ?? (caster.uid === "boss" ? "boss" : "player");
    const uid = side === "boss" ? "boss" : game.uid;

    const hp = monsterConfig.baseHp ?? 100;
    const attack = monsterConfig.baseDamage ?? 10;
    const defense = monsterConfig.baseDefense ?? 5;
    const speed = monsterConfig.baseSpeed ?? 10;

    const minionId = side === "boss"
        ? `summon_${game.gameId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
        : undefined;
    const playerSummonId = side === "player"
        ? `summon_${game.gameId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
        : undefined;

    const character_id = minionId ?? playerSummonId ?? (side === "boss" ? game.boss?.bossId ?? "boss" : caster.monsterId);

    const identifier: CharacterIdentifier = side === "boss" && minionId
        ? { minionId }
        : side === "boss"
            ? { bossId: game.boss?.bossId }
            : { monsterId: monsterConfig.monsterId };

    const summoned: SummonedCharacter = {
        identifier,
        uid,
        monsterId: config.monsterId,
        minionId,
        bossId: side === "boss" && !minionId ? game.boss?.bossId : undefined,
        q: pos.q,
        r: pos.r,
        character_id,
        name: monsterConfig.name,
        assetPath: monsterConfig.assetPath,
        stats: {
            hp: { current: hp, max: hp },
            mp: { current: 100, max: 100 },
            attack,
            defense,
            speed,
        },
        statusEffects: [],
        skillCooldowns: {},
        skills: mergeBattleSkillsFromConfig(monsterConfig, monsterConfig.skillIds ?? []),
    };

    return [summoned];
}

/**
 * 将召唤单位追加到 game 并持久化到 mr_games
 */
export async function addSummonedCharactersToGame(
    dbCtx: any,
    gameId: string,
    game: GameModel,
    summonedCharacters: SummonedCharacter[]
): Promise<void> {
    if (!summonedCharacters?.length) return;

    const gameDoc = await dbCtx.db
        .query("mr_games")
        .withIndex("by_gameId", (q: any) => q.eq("gameId", gameId))
        .first();

    if (!gameDoc) return;

    const toTeam: any[] = [];
    const toMinions: any[] = [];

    for (const u of summonedCharacters) {
        const base = {
            uid: u.uid,
            monsterId: u.monsterId,
            level: 1,
            stars: 1,
            q: u.q,
            r: u.r,
            stats: {
                hp: u.stats.hp,
                attack: u.stats.attack,
                defense: u.stats.defense,
                speed: u.stats.speed,
                mp: u.stats.mp ?? { current: 100, max: 100 },
            },
            statusEffects: u.statusEffects ?? [],
            skillCooldowns: u.skillCooldowns ?? {},
        };

        if (u.uid === game.uid) {
            // mr_games.team schema 不包含 skills，运行时可从 MONSTER_CONFIGS_MAP 按 monsterId 获取；character_id 区分同 monsterId 多实例（如召唤）
            toTeam.push({ ...base, character_id: u.character_id } as any);
            game.team = [...(game.team ?? []), { ...base, character_id: u.character_id } as GameMonster];
        } else if (u.uid === "boss" && u.minionId) {
            const minionEntry = {
                ...base,
                minionId: u.minionId,
                hp: u.stats.hp.current,
                damage: u.stats.attack,
                defense: u.stats.defense,
                speed: u.stats.speed,
                position: { q: u.q, r: u.r },
                stats: base.stats,
                statusEffects: base.statusEffects,
                cooldowns: base.skillCooldowns,
            };
            toMinions.push(minionEntry);
            game.boss.minions = [...(game.boss.minions ?? []), minionEntry as GameMinion];
        }
    }

    const updates: Record<string, any> = { lastUpdate: new Date().toISOString() };

    if (toTeam.length > 0) {
        const currentTeam = gameDoc.team ?? [];
        updates.team = [...currentTeam, ...toTeam];
    }

    if (toMinions.length > 0) {
        const currentMinions = gameDoc.boss?.minions ?? [];
        updates.boss = {
            ...gameDoc.boss,
            minions: [...currentMinions, ...toMinions],
        };
    }

    if (Object.keys(updates).length > 1) {
        await dbCtx.db.patch(gameDoc._id, updates);
    }
}
