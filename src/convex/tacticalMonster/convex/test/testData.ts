import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const players = [
    "kevin1@gmail.com"
];

export const DEFAULT_TEAM_POSITIONS: Array<{ q: number; r: number }> = [
    { q: 0, r: 0 }, { q: 1, r: 2 }, { q: 0, r: 3 }, { q: 1, r: 5 }
];

export const MONSTERS_PER_PLAYER = 4;
// 可用的怪物ID列表（每个玩家使用不同的怪物）
export const AVAILABLE_MONSTER_IDS = [
    "monster_001", "monster_002", "monster_003", "monster_004",
    "monster_005", "monster_006", "monster_007", "monster_008",
    "monster_009", "monster_010", "monster_011", "monster_012",
    "monster_013", "monster_014", "monster_015", "monster_016",
    "monster_017", "monster_018", "monster_019", "monster_020",
    "monster_021", "monster_022", "monster_023", "monster_024",
    "monster_025", "monster_026", "monster_027", "monster_028",
    "monster_029", "monster_030", "monster_031", "monster_032",
    "monster_033", "monster_034", "monster_035", "monster_036",
    "monster_037", "monster_038", "monster_039", "monster_040",
];

export const insertMonsterTestDataBatch = internalMutation({
    args: {
        monsters: v.array(v.object({
            uid: v.string(),
            monsterId: v.string(),
            level: v.number(),
            stars: v.number(),
            experience: v.number(),
            shards: v.number(),
            isUnlocked: v.boolean(),
            unlockedSkills: v.any(),
            inTeam: v.number(),
            teamPosition: v.optional(v.object({
                q: v.number(),
                r: v.number(),
            })),
            obtainedAt: v.string(),
            updatedAt: v.string(),
        })),
    },
    handler: async (ctx, args): Promise<{ inserted: number }> => {
        let inserted = 0;
        for (const monster of args.monsters) {
            await ctx.db.insert("mr_player_monsters", monster);
            inserted++;
        }
        return { inserted };
    },
});