/**
 * Action: 使用 crypto MD5 生成 UID 并加载测试数据
 * 使用 crypto MD5 可以大幅减少冲突概率（128位哈希 vs 32位整数）
 */

"use node"
import crypto from "crypto";
import { internalAction } from "../_generated/server";
import { AVAILABLE_MONSTER_IDS, DEFAULT_TEAM_POSITIONS, MONSTERS_PER_PLAYER, players } from "./testData";

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
        "test/testData:insertMonsterTestDataBatch" as any,
        { monsters }
    );
    console.log("loadMonsterHandler result", result);

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



