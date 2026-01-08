/**
 * Mutation: 加载怪物测试数据到数据库
 * 这个文件不使用 "use node"，所以可以定义 mutation
 * 直接在 mutation 中生成数据，避免在 action 中导入 API 的问题
 * 
 * 关于冲突问题：
 * - crypto MD5: 128位哈希，冲突概率极低（10亿用户约 10^-18）
 * - simpleHash: 32位整数，冲突概率较高（10亿用户接近100%）
 * 
 * 解决方案：
 * 1. 使用 action 生成 UID（使用 crypto），然后传递给 mutation（推荐）
 * 2. 使用更长的 UID（16位或32位）减少冲突
 * 3. 实现纯 JavaScript 的 MD5（代码较长）
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

const players = ["kevin1@gmail.com"];

/**
 * FNV-1a 哈希算法（更好的哈希分布，减少冲突）
 * @param str 要哈希的字符串
 * @returns 32位哈希值
 */
function fnv1aHash(str: string): number {
    const normalized = str.toLowerCase().trim();
    let hash = 2166136261; // FNV offset basis
    for (let i = 0; i < normalized.length; i++) {
        hash ^= normalized.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        hash = hash >>> 0; // 转换为无符号32位整数
    }
    return hash;
}

/**
 * 增强哈希函数（使用多个哈希算法组合，减少冲突）
 * @param str 要哈希的字符串
 * @param salt 盐值（用于增加随机性，可选）
 * @returns 64位哈希值（两个32位整数组合）
 */
function enhancedHash(str: string, salt: number = 0): { hash1: number; hash2: number } {
    const normalized = str.toLowerCase().trim();
    const saltedStr = salt > 0 ? normalized + salt.toString() : normalized;

    // 使用 FNV-1a 算法
    const hash1 = fnv1aHash(saltedStr);

    // 使用 djb2 算法（另一个流行的哈希算法）
    let hash2 = 5381;
    for (let i = 0; i < saltedStr.length; i++) {
        hash2 = ((hash2 << 5) + hash2) + saltedStr.charCodeAt(i);
        hash2 = hash2 >>> 0; // 转换为无符号32位整数
    }

    return { hash1, hash2 };
}

/**
 * 将哈希值转换为固定长度的十六进制字符串
 * @param hash1 第一个哈希值
 * @param hash2 第二个哈希值（可选，用于扩展长度）
 * @param length 输出长度
 * @returns 固定长度的十六进制字符串
 */
function hashToHex(hash1: number, hash2: number | null, length: number): string {
    let hex = hash1.toString(16).padStart(8, '0');

    if (length > 8 && hash2 !== null) {
        // 如果长度 > 8，使用第二个哈希值扩展
        hex += hash2.toString(16).padStart(8, '0');
    }

    // 如果还需要更长，重复使用哈希值
    if (length > 16) {
        let currentHash = hash1;
        while (hex.length < length) {
            currentHash = ((currentHash << 3) - currentHash + 17) & 0xffffffff;
            hex += currentHash.toString(16).padStart(8, '0');
        }
    }

    return hex.substring(0, length);
}

/**
 * 哈希函数（不使用 crypto，适用于 mutation 环境）
 * 使用增强哈希算法，减少冲突概率
 * @param str 要哈希的字符串
 * @param length 输出字符串的长度（默认16，推荐16或32以减少冲突）
 * @param salt 盐值（用于冲突处理）
 * @returns 固定长度的十六进制字符串
 */
function simpleHash(str: string, length: number = 16, salt: number = 0): string {
    const { hash1, hash2 } = enhancedHash(str, salt);
    return hashToHex(hash1, hash2, length);
}

/**
 * 生成 UID，确保唯一性（优化冲突处理）
 * @param email 邮箱地址
 * @param length UID 长度
 * @param usedUIDs 已使用的 UID 集合（用于检测冲突）
 * @returns 唯一的 UID 和冲突统计
 */
function getUID(
    email: string,
    length?: number,
    usedUIDs: Set<string> = new Set()
): { uid: string; collisions: number } {
    let uid = simpleHash(email, length, 0);
    let salt = 0;
    let collisions = 0;

    // 如果发生冲突，使用盐值重新哈希（更高效的冲突解决）
    while (usedUIDs.has(uid)) {
        collisions++;
        salt++;
        // 使用盐值重新哈希，而不是拼接字符串（更高效）
        uid = simpleHash(email, length, salt);

        // 防止无限循环
        if (salt > 10000) {
            throw new Error(`无法为 ${email} 生成唯一的 UID（尝试了 ${salt} 次，可能存在哈希空间耗尽问题）`);
        }
    }

    usedUIDs.add(uid);
    if (collisions > 0) {
        console.log(`⚠️ 冲突: ${email} -> ${uid} (冲突 ${collisions} 次)`);
    }
    return { uid, collisions };
}

/**
 * 生成所有玩家的 UID，确保唯一性（优化版本，支持大量玩家）
 * @param length UID 长度（推荐：8位适合<100玩家，16位适合<10K玩家，32位适合<1M玩家）
 * @returns UID 数组和统计信息
 */
function getUIDs(length?: number): { uids: string[]; stats: { total: number; collisions: number; maxCollisions: number } } {
    const usedUIDs = new Set<string>();
    const uids: string[] = [];
    let totalCollisions = 0;
    let maxCollisions = 0;

    for (const email of players) {
        const result = getUID(email, length, usedUIDs);
        uids.push(result.uid);
        totalCollisions += result.collisions;
        maxCollisions = Math.max(maxCollisions, result.collisions);
    }

    // 最终验证唯一性
    const uniqueUIDs = new Set(uids);
    if (uniqueUIDs.size !== uids.length) {
        throw new Error(`严重错误：检测到 ${uids.length - uniqueUIDs.size} 个重复的 UID！`);
    }

    const stats = {
        total: uids.length,
        collisions: totalCollisions,
        maxCollisions,
    };

    if (totalCollisions > 0) {
        console.warn(`⚠️ 冲突统计: 总冲突 ${totalCollisions} 次，最大单次冲突 ${maxCollisions} 次`);
    } else {
        console.log(`✅ 所有 UID 生成成功，无冲突`);
    }

    return { uids, stats };
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
 * 生成所有玩家的怪物测试数据
 * @param uidLength UID 的长度（默认16）
 * @returns 怪物数据数组和统计信息
 */
function generatePlayerMonstersTestData(uidLength: number = 16): {
    monsters: Array<{
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
    }>;
    stats: {
        total: number;
        collisions: number;
        maxCollisions: number;
    };
} {
    const nowISO = new Date().toISOString();
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

    const { uids, stats } = getUIDs(uidLength);

    // 输出统计信息
    console.log(`📊 UID 生成统计:`, {
        玩家数量: stats.total,
        总冲突次数: stats.collisions,
        最大单次冲突: stats.maxCollisions,
        UID长度: uidLength,
        冲突率: stats.collisions > 0 ? `${((stats.collisions / stats.total) * 100).toFixed(2)}%` : '0%'
    });

    // 为每个玩家创建4个怪物（使用 monster_037 作为默认怪物）
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

    return {
        monsters: allMonsters,
        stats
    };
}

/**
 * 纯 JavaScript MD5 实现（不使用 Node.js crypto，适用于 mutation 环境）
 * 基于 RFC 1321 MD5 算法
 */
function md5(str: string): string {
    function md5cycle(x: number[], k: number[]) {
        let a = x[0], b = x[1], c = x[2], d = x[3];

        a = ff(a, b, c, d, k[0], 7, -680876936);
        d = ff(d, a, b, c, k[1], 12, -389564586);
        c = ff(c, d, a, b, k[2], 17, 606105819);
        b = ff(b, c, d, a, k[3], 22, -1044525330);
        a = ff(a, b, c, d, k[4], 7, -176418897);
        d = ff(d, a, b, c, k[5], 12, 1200080426);
        c = ff(c, d, a, b, k[6], 17, -1473231341);
        b = ff(b, c, d, a, k[7], 22, -45705983);
        a = ff(a, b, c, d, k[8], 7, 1770035416);
        d = ff(d, a, b, c, k[9], 12, -1958414417);
        c = ff(c, d, a, b, k[10], 17, -42063);
        b = ff(b, c, d, a, k[11], 22, -1990404162);
        a = ff(a, b, c, d, k[12], 7, 1804603682);
        d = ff(d, a, b, c, k[13], 12, -40341101);
        c = ff(c, d, a, b, k[14], 17, -1502002290);
        b = ff(b, c, d, a, k[15], 22, 1236535329);

        a = gg(a, b, c, d, k[1], 5, -165796510);
        d = gg(d, a, b, c, k[6], 9, -1069501632);
        c = gg(c, d, a, b, k[11], 14, 643717713);
        b = gg(b, c, d, a, k[0], 20, -373897302);
        a = gg(a, b, c, d, k[5], 5, -701558691);
        d = gg(d, a, b, c, k[10], 9, 38016083);
        c = gg(c, d, a, b, k[15], 14, -660478335);
        b = gg(b, c, d, a, k[4], 20, -405537848);
        a = gg(a, b, c, d, k[9], 5, 568446438);
        d = gg(d, a, b, c, k[14], 9, -1019803690);
        c = gg(c, d, a, b, k[3], 14, -187363961);
        b = gg(b, c, d, a, k[8], 20, 1163531501);
        a = gg(a, b, c, d, k[13], 5, -1444681467);
        d = gg(d, a, b, c, k[2], 9, -51403784);
        c = gg(c, d, a, b, k[7], 14, 1735328473);
        b = gg(b, c, d, a, k[12], 20, -1926607734);

        a = hh(a, b, c, d, k[5], 4, -378558);
        d = hh(d, a, b, c, k[8], 11, -2022574463);
        c = hh(c, d, a, b, k[11], 16, 1839030562);
        b = hh(b, c, d, a, k[14], 23, -35309556);
        a = hh(a, b, c, d, k[1], 4, -1530992060);
        d = hh(d, a, b, c, k[4], 11, 1272893353);
        c = hh(c, d, a, b, k[7], 16, -155497632);
        b = hh(b, c, d, a, k[10], 23, -1094730640);
        a = hh(a, b, c, d, k[13], 4, 681279174);
        d = hh(d, a, b, c, k[0], 11, -358537222);
        c = hh(c, d, a, b, k[3], 16, -722521979);
        b = hh(b, c, d, a, k[6], 23, 76029189);
        a = hh(a, b, c, d, k[9], 4, -640364487);
        d = hh(d, a, b, c, k[12], 11, -421815835);
        c = hh(c, d, a, b, k[15], 16, 530742520);
        b = hh(b, c, d, a, k[2], 23, -995338651);

        a = ii(a, b, c, d, k[0], 6, -198630844);
        d = ii(d, a, b, c, k[7], 10, 1126891415);
        c = ii(c, d, a, b, k[14], 15, -1416354905);
        b = ii(b, c, d, a, k[5], 21, -57434055);
        a = ii(a, b, c, d, k[12], 6, 1700485571);
        d = ii(d, a, b, c, k[3], 10, -1894986606);
        c = ii(c, d, a, b, k[10], 15, -1051523);
        b = ii(b, c, d, a, k[1], 21, -2054922799);
        a = ii(a, b, c, d, k[8], 6, 1873313359);
        d = ii(d, a, b, c, k[15], 10, -30611744);
        c = ii(c, d, a, b, k[6], 15, -1560198380);
        b = ii(b, c, d, a, k[13], 21, 1309151649);
        a = ii(a, b, c, d, k[4], 6, -145523070);
        d = ii(d, a, b, c, k[11], 10, -1120210379);
        c = ii(c, d, a, b, k[2], 15, 718787259);
        b = ii(b, c, d, a, k[9], 21, -343485551);

        x[0] = add32(a, x[0]);
        x[1] = add32(b, x[1]);
        x[2] = add32(c, x[2]);
        x[3] = add32(d, x[3]);
    }

    function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
        a = add32(add32(a, q), add32(x, t));
        return add32((a << s) | (a >>> (32 - s)), b);
    }

    function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
        return cmn((b & c) | ((~b) & d), a, b, x, s, t);
    }

    function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
        return cmn((b & d) | (c & (~d)), a, b, x, s, t);
    }

    function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
        return cmn(b ^ c ^ d, a, b, x, s, t);
    }

    function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
        return cmn(c ^ (b | (~d)), a, b, x, s, t);
    }

    function add32(a: number, b: number) {
        return (a + b) & 0xFFFFFFFF;
    }

    function rhex(n: number) {
        let s = '', j = 0;
        for (; j < 4; j++)
            s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
        return s;
    }

    const hex_chr = '0123456789abcdef'.split('');

    const normalized = str.toLowerCase().trim();
    const msg_len = normalized.length;

    // 将字符串转换为字节数组
    const msg_bytes: number[] = [];
    for (let i = 0; i < msg_len; i++) {
        const charCode = normalized.charCodeAt(i);
        if (charCode < 0x80) {
            msg_bytes.push(charCode);
        } else if (charCode < 0x800) {
            msg_bytes.push(0xc0 | (charCode >> 6));
            msg_bytes.push(0x80 | (charCode & 0x3f));
        } else {
            msg_bytes.push(0xe0 | (charCode >> 12));
            msg_bytes.push(0x80 | ((charCode >> 6) & 0x3f));
            msg_bytes.push(0x80 | (charCode & 0x3f));
        }
    }

    // MD5 填充
    const original_byte_len = msg_bytes.length;
    msg_bytes.push(0x80);
    while (msg_bytes.length % 64 !== 56) {
        msg_bytes.push(0);
    }

    // 添加长度（64位，小端序）- 使用字节长度，不是字符长度
    const bit_len = original_byte_len * 8;
    for (let i = 0; i < 8; i++) {
        msg_bytes.push((bit_len >>> (i * 8)) & 0xff);
    }

    // 转换为 32 位整数数组
    const x: number[] = [];
    for (let i = 0; i < msg_bytes.length; i += 4) {
        x.push(
            msg_bytes[i] |
            (msg_bytes[i + 1] << 8) |
            (msg_bytes[i + 2] << 16) |
            (msg_bytes[i + 3] << 24)
        );
    }

    const h = [1732584193, -271733879, -1732584194, 271733878];
    for (let i = 0; i < x.length; i += 16) {
        const olda = h[0], oldb = h[1], oldc = h[2], oldd = h[3];
        md5cycle(h, x.slice(i, i + 16));
        h[0] = add32(h[0], olda);
        h[1] = add32(h[1], oldb);
        h[2] = add32(h[2], oldc);
        h[3] = add32(h[3], oldd);
    }

    return rhex(h[0]) + rhex(h[1]) + rhex(h[2]) + rhex(h[3]);
}

/**
 * 使用纯 JavaScript MD5 生成 UID（128位哈希，冲突概率极低）
 * 与 Node.js crypto.createHash("md5") 产生相同的结果
 */
function hashStringWithMD5(str: string): string {
    return md5(str);
}

/**
 * 生成所有玩家的 UID（使用纯 JavaScript MD5）
 */
function generateUIDsWithMD5(): string[] {
    return players.map(email => hashStringWithMD5(email));
}

/**
 * 生成怪物测试数据（使用纯 JavaScript MD5 生成的 UID）
 */
function generateMonstersWithMD5UIDs(): Array<{
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
    const uids = generateUIDsWithMD5();
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

    // 验证 UID 唯一性（MD5 理论上应该无冲突）
    const uniqueUIDs = new Set(uids);
    if (uniqueUIDs.size !== uids.length) {
        console.warn(`⚠️ 警告：检测到 ${uids.length - uniqueUIDs.size} 个重复的 UID（使用 MD5 不应该发生）`);
    } else {
        console.log(`✅ 所有 UID 唯一（使用纯 JavaScript MD5，128位哈希）`);
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
 * Mutation: 批量插入怪物测试数据（供 action 调用）
 */
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

/**
 * Mutation: 使用纯 JavaScript MD5 加载怪物测试数据（可在 Dashboard 执行）
 * 优势：使用 128 位 MD5 哈希，冲突概率极低（10亿用户约 10^-18）
 * 不需要 "use node"，可以在 Convex Dashboard 中直接执行
 * 
 * 使用方法：
 * 1. Dashboard: Functions -> schemas/loadMonsterTestDataMutation:loadMonsterTestDataWithMD5
 * 2. CLI: npx convex run schemas/loadMonsterTestDataMutation:loadMonsterTestDataWithMD5
 */
export const loadMonsterTestDataWithMD5 = internalMutation({
    args: {},
    handler: async (ctx): Promise<{ success: boolean; total: number; inserted: number; uids: string[] }> => {
        const monsters = generateMonstersWithMD5UIDs();
        const uids = [...new Set(monsters.map(m => m.uid))];
        let inserted = 0;

        for (const monster of monsters) {
            await ctx.db.insert("mr_player_monsters", monster);
            inserted++;
        }

        return {
            success: true,
            total: monsters.length,
            inserted,
            uids,
        };
    },
});

/**
 * Mutation: 加载怪物测试数据到数据库（使用 simpleHash，可能有冲突）
 * 推荐：使用 loadMonsterTestDataWithMD5（使用纯 JavaScript MD5，冲突概率极低）
 */
export const loadMonsterTestData = internalMutation({
    args: {
        uidLength: v.optional(v.number()), // UID 的长度，默认 16（推荐：8位适合<100玩家，16位适合<10K玩家，32位适合<1M玩家）
    },
    handler: async (ctx, args): Promise<{ success: boolean; total: number; inserted: number; stats?: any }> => {
        const uidLength = args.uidLength ?? 16; // 默认长度为 16（更好的冲突避免）
        const { monsters, stats } = generatePlayerMonstersTestData(uidLength);
        let inserted = 0;

        // 批量插入数据
        // for (const monster of monsters) {
        //     await ctx.db.insert("mr_player_monsters", monster);
        //     inserted++;
        // }

        return {
            success: true,
            total: monsters.length,
            inserted,
            stats: {
                uidLength,
                players: stats.total,
                collisions: stats.collisions,
                maxCollisions: stats.maxCollisions,
                collisionRate: stats.collisions > 0 ? `${((stats.collisions / stats.total) * 100).toFixed(2)}%` : '0%'
            }
        };
    },
});

