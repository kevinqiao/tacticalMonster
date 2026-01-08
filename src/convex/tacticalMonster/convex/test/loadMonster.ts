/**
 * Action: 使用 crypto MD5 生成 UID 并加载测试数据
 * 使用 crypto MD5 可以大幅减少冲突概率（128位哈希 vs 32位整数）
 */

"use node"
import crypto from "crypto";
import { action, internalAction } from "../_generated/server";

const players = [
    "kevin1@gmail.com"
];

const DEFAULT_TEAM_POSITIONS: Array<{ q: number; r: number }> = [
    { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }, { q: 1, r: 1 }
];

const MONSTERS_PER_PLAYER = 4;
// 可用的怪物ID列表（每个玩家使用不同的怪物）
const AVAILABLE_MONSTER_IDS = [
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

type MonsterData = {
    uid: string;
    monsterId: string;
    level: number;
    stars: number;
    experience: number;
    shards: number;
    isUnlocked: boolean;
    unlockedSkills: any[];
    inTeam: number;
    teamPosition?: { q: number; r: number };
    obtainedAt: string;
    updatedAt: string;
};

type LoadResult = {
    success: boolean;
    total: number;
    inserted: number;
    uids: string[];
};

/**
 * 使用 crypto MD5 生成 UID（128位哈希，冲突概率极低）
 */
function hashEmail(str: string): string {
    return crypto.createHash("md5")
        .update(str.toLowerCase().trim())
        .digest('hex');
}

/**
 * 生成所有玩家的 UID
 */
function generateUIDs(): string[] {
    return players.map((player) => 0 + "_" + hashEmail(player));
}

/**
 * 生成怪物测试数据
 */
function generateMonsters(): MonsterData[] {
    const nowISO = new Date().toISOString();
    const uids = generateUIDs();
    const monsters: MonsterData[] = [];

    // 验证 UID 唯一性
    const uniqueUIDs = new Set(uids);
    if (uniqueUIDs.size !== uids.length) {
        console.warn(`⚠️ 警告：检测到 ${uids.length - uniqueUIDs.size} 个重复的 UID`);
    } else {
        console.log(`✅ 所有 UID 唯一（使用 crypto MD5，128位哈希）`);
    }

    // 为每个玩家创建怪物（每个玩家使用不同的怪物ID）
    for (let playerIndex = 0; playerIndex < uids.length; playerIndex++) {
        const uid = uids[playerIndex];
        const startMonsterIndex = playerIndex * MONSTERS_PER_PLAYER;

        // 确保有足够的怪物ID
        if (startMonsterIndex + MONSTERS_PER_PLAYER > AVAILABLE_MONSTER_IDS.length) {
            console.warn(`⚠️ 警告：玩家 ${playerIndex + 1} 需要的怪物ID超出可用范围，将循环使用`);
        }

        for (let i = 0; i < MONSTERS_PER_PLAYER; i++) {
            const monsterIndex = (startMonsterIndex + i) % AVAILABLE_MONSTER_IDS.length;
            const monsterId = AVAILABLE_MONSTER_IDS[monsterIndex];

            monsters.push({
                uid,
                monsterId,
                level: 1,
                stars: 1,
                experience: 0,
                shards: 0,
                isUnlocked: true,
                unlockedSkills: [],
                inTeam: 1,
                teamPosition: DEFAULT_TEAM_POSITIONS[i],
                obtainedAt: nowISO,
                updatedAt: nowISO,
            });
        }
    }

    return monsters;
}

/**
 * 共享的 action handler
 */
async function loadMonsterHandler(ctx: any): Promise<LoadResult> {
    const monsters = generateMonsters();
    const uids = [...new Set(monsters.map(m => m.uid))];

    const result = await ctx.runMutation(
        "schemas/loadMonsterTestDataMutation:insertMonsterTestDataBatch" as any,
        { monsters }
    );

    return {
        success: true,
        total: monsters.length,
        inserted: result.inserted,
        uids,
    };
}

/**
 * Internal Action: 使用 crypto MD5 加载怪物测试数据
 */
export const loadMonsterTestDataWithCrypto = internalAction({
    args: {},
    handler: loadMonsterHandler,
});

/**
 * Public Action: 使用 crypto MD5 加载怪物测试数据（可在 Dashboard 执行）
 * 
 * 使用方法：
 * - Dashboard: Functions -> test/loadMonster:load
 * - CLI: npx convex run test/loadMonster:load
 * - 客户端: api.test.loadMonster.load
 */
export const load = action({
    args: {},
    handler: loadMonsterHandler,
});

