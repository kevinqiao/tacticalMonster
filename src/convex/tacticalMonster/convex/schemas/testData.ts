"use node"
import crypto from "crypto";

const players = ["kevin1@gmail.com", "kevin2@gmail.com", "kevin3@gmail.com", "kevin4@gmail.com", "kevin5@gmail.com", "kevin6@gmail.com", "kevin7@gmail.com", "kevin8@gmail.com", "kevin9@gmail.com", "kevin10@gmail.com"];

export function hashString(str: string): string {
    // 将 email 转为小写并去除首尾空格，确保一致性
    const normalizedEmail = str.toLowerCase().trim();
    const uuid = crypto.createHash("md5").update(normalizedEmail).digest('hex');
    return uuid;
}

const getUID = (email: string) => {
    return hashString(email);
}

const getUIDs = () => {
    return players.map(getUID);
}

/**
 * 默认队伍位置（Hex坐标）
 * 对应 TeamService.getDefaultPosition 的位置
 */
const DEFAULT_TEAM_POSITIONS: Array<{ q: number; r: number }> = [
    { q: 0, r: 0 },  // 位置 0
    { q: 2, r: 1 },  // 位置 1
    { q: 0, r: 3 },  // 位置 2
    { q: 1, r: 5 },  // 位置 3
];

/**
 * 生成单个玩家的怪物测试数据
 * @param uid 玩家UID
 * @param monsterIds 怪物ID数组（最多4个）
 * @param levels 等级数组（可选，默认为1）
 * @param stars 星级数组（可选，默认为1）
 * @param inTeam 是否在队伍中（默认true）
 * @returns 怪物数据数组
 */
function generatePlayerMonsters(
    uid: string,
    monsterIds: string[],
    levels?: number[],
    stars?: number[],
    inTeam: boolean = true
): Array<{
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
    const monsters: Array<{
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

    // 限制最多4个怪物
    const teamMonsters = monsterIds.slice(0, 4);

    for (let i = 0; i < teamMonsters.length; i++) {
        const monsterId = teamMonsters[i];
        const level = levels?.[i] ?? 1;
        const star = stars?.[i] ?? 1;
        const position = inTeam ? DEFAULT_TEAM_POSITIONS[i] : undefined;

        monsters.push({
            uid,
            monsterId,
            level,
            stars: star,
            experience: 0,
            shards: 0,
            isUnlocked: true,
            unlockedSkills: [],
            inTeam: inTeam ? 1 : 0,
            teamPosition: position,
            obtainedAt: nowISO,
            updatedAt: nowISO,
        });
    }

    return monsters;
}

/**
 * 动态生成所有玩家的 mr_player_monsters 测试数据
 * 为每个玩家创建4个怪物组成队伍
 */
export function generatePlayerMonstersTestData(): Array<{
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

    const uids = getUIDs();

    // 为每个玩家创建4个怪物（使用 monster_037 作为默认怪物）
    for (const uid of uids) {
        const playerMonsters = generatePlayerMonsters(
            uid,
            ["monster_037", "monster_037", "monster_037", "monster_037"],
            [1, 1, 1, 1],  // 默认等级1
            [1, 1, 1, 1],  // 默认星级1
            true  // 在队伍中
        );
        allMonsters.push(...playerMonsters);
    }

    return allMonsters;
}

/**
 * 生成特定玩家的怪物测试数据（可自定义）
 * @param email 玩家邮箱
 * @param monsterIds 怪物ID数组
 * @param levels 等级数组（可选）
 * @param stars 星级数组（可选）
 * @param inTeam 是否在队伍中（默认true）
 */
export function generatePlayerMonstersByEmail(
    email: string,
    monsterIds: string[],
    levels?: number[],
    stars?: number[],
    inTeam: boolean = true
) {
    const uid = getUID(email);
    return generatePlayerMonsters(uid, monsterIds, levels, stars, inTeam);
}
/**
 * 注意：loadMonsterTestData 已移至 loadMonsterTestDataMutation.ts
 * 因为需要在 mutation 中直接生成数据，避免在 action 中导入 API 的问题
 * 请使用：npx convex run schemas/loadMonsterTestDataMutation:loadMonsterTestData
 */
// 导出测试数据
export const MR_PLAYER_MONSTERS_TEST_DATA = generatePlayerMonstersTestData();

console.log(`生成了 ${MR_PLAYER_MONSTERS_TEST_DATA.length} 条 mr_player_monsters 测试数据`);
console.log(`涉及 ${getUIDs().length} 个玩家，每个玩家 ${MR_PLAYER_MONSTERS_TEST_DATA.length / getUIDs().length} 个怪物`);