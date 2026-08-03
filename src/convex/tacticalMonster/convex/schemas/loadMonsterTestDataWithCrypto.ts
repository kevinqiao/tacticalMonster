/**
 * Action: 使用 crypto MD5 生成 UID 并加载测试数据
 * 这个文件使用 "use node"，可以使用 crypto
 * 使用 crypto MD5 可以大幅减少冲突概率（128位哈希 vs 32位整数）
 */

"use node"
import crypto from "crypto";
import { action, internalAction } from "../_generated/server";

const players = ["kevin1@gmail.com", "kevin2@gmail.com", "kevin3@gmail.com", "kevin4@gmail.com", "kevin5@gmail.com", "kevin6@gmail.com", "kevin7@gmail.com", "kevin8@gmail.com", "kevin9@gmail.com", "kevin10@gmail.com"];

/**
 * 使用 crypto MD5 生成 UID（128位哈希，冲突概率极低）
 */
function hashStringWithCrypto(str: string): string {
    const normalizedEmail = str.toLowerCase().trim();
    return crypto.createHash("md5").update(normalizedEmail).digest('hex');
}

/**
 * 生成所有玩家的 UID（使用 crypto MD5）
 */
function generateUIDsWithCrypto(): string[] {
    return players.map(email => hashStringWithCrypto(email));
}

/**
 * 默认队伍位置（Hex坐标）
 */
const DEFAULT_TEAM_POSITIONS: Array<{ q: number; r: number }> = [
    { q: 0, r: 0 },  // 位置 0
    { q: 1, r: 0 },  // 位置 1
    { q: 0, r: 1 },  // 位置 2
    { q: 1, r: 1 },  // 位置 3
];

/**
 * 生成怪物测试数据（使用 crypto MD5 生成的 UID）
 */
function generateMonstersWithCryptoUIDs(): Array<{
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
}> {
    const nowISO = new Date().toISOString();
    const uids = generateUIDsWithCrypto();
    const allMonsters: Array<{
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
    }> = [];

    // 验证 UID 唯一性（crypto MD5 理论上应该无冲突）
    const uniqueUIDs = new Set(uids);
    if (uniqueUIDs.size !== uids.length) {
        console.warn(`⚠️ 警告：检测到 ${uids.length - uniqueUIDs.size} 个重复的 UID（使用 crypto MD5 不应该发生）`);
    } else {
        console.log(`✅ 所有 UID 唯一（使用 crypto MD5，128位哈希）`);
    }

    // 为每个玩家创建4个怪物
    for (const uid of uids) {
        for (let i = 0; i < 4; i++) {
            allMonsters.push({
                uid,
                monsterId: "monster_037",
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

    return allMonsters;
}

/**
 * Internal Action: 使用 crypto MD5 加载怪物测试数据
 * 优势：使用 128 位 MD5 哈希，冲突概率极低（10亿用户约 10^-18）
 * 注意：由于使用了 "use node"，internalAction 无法在 Convex Dashboard 中直接执行
 *       请使用 loadMonsterTestDataWithCryptoPublic 在 Dashboard 中执行
 */
export const loadMonsterTestDataWithCrypto = internalAction({
    args: {},
    handler: async (ctx): Promise<{ success: boolean; total: number; inserted: number; uids: string[] }> => {
        const monsters = generateMonstersWithCryptoUIDs();
        const uids = [...new Set(monsters.map(m => m.uid))];

        // 调用 mutation 批量插入数据（使用字符串路径，避免在 "use node" 中导入 internal API）
        // 注意：在 Windows 上，字符串路径可能有问题
        // 如果失败，可以考虑将整个逻辑移到 mutation 中，使用纯 JavaScript 实现 MD5
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
    },
});

/**
 * Public Action: 使用 crypto MD5 加载怪物测试数据（可在 Dashboard 执行）
 * 优势：使用 128 位 MD5 哈希，冲突概率极低（10亿用户约 10^-18）
 * 
 * 注意：虽然文件使用了 "use node"，但 public action 可以在 Dashboard 执行
 *       在 Convex Dashboard 的 Functions 标签页中找到此函数并执行
 * 
 * 使用方法：
 * 1. Dashboard: Functions -> schemas/loadMonsterTestDataWithCrypto:loadMonsterTestDataWithCryptoPublic
 * 2. CLI: npx convex run schemas/loadMonsterTestDataWithCrypto:loadMonsterTestDataWithCryptoPublic
 */
export const loadMonsterTestDataWithCryptoPublic = action({
    args: {},
    handler: async (ctx): Promise<{ success: boolean; total: number; inserted: number; uids: string[] }> => {
        const monsters = generateMonstersWithCryptoUIDs();
        const uids = [...new Set(monsters.map(m => m.uid))];

        // 调用 mutation 批量插入数据（使用字符串路径，避免在 "use node" 中导入 internal API）
        // 注意：在 Windows 上，字符串路径可能有问题
        // 如果失败，可以考虑将整个逻辑移到 mutation 中，使用纯 JavaScript 实现 MD5
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
    },
});

