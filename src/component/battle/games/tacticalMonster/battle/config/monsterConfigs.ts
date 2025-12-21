/**
 * 怪物配置数据
 * 基于 Camex Games Tactical Monster 的怪物设计
 * 包含90个怪物的基础属性配置
 */
export const calculatePower = (damage: number, defense: number, hp: number, multiplier: number = 1): number => {
    return (damage * 2 + defense * 1.5 + hp) * multiplier;
}
export interface Monster {
    monsterId: string;
    name: string;
    rarity: "Common" | "Rare" | "Epic" | "Legendary";
    class?: string;
    race?: string;
    baseHp: number;
    baseDamage: number;
    baseDefense: number;
    baseSpeed: number;

    // 技能配置：使用 skillIds 引用技能配置（方案二：完全独立）
    skillIds?: string[];              // 技能ID列表（引用 skillConfigs.ts 中的技能）

    growthRates?: {
        hp: number;
        damage: number;
        defense: number;
        speed: number;
        starMultiplierPerStar?: number;  // 每星增加的属性倍率（可选，默认使用 GROWTH_STRATEGY 的值）
    };

    // 移动和战斗范围配置
    moveRange?: number;               // 移动范围（Hex格子数），默认值：3
    attackRange?: {                   // 攻击范围（Hex格子数），默认值：{ min: 1, max: 2 }
        min: number;
        max: number;
    };

    assetPath: string;
}

/**
 * 稀有度属性倍率（基于 Camex Games 设计）
 */
const RARITY_MULTIPLIERS = {
    Common: 1.0,
    Rare: 1.15,
    Epic: 1.35,
    Legendary: 1.60,
};

/**
 * 根据稀有度获取星级倍率
 * 稀有度越高，每星增加的属性倍率越高
 */
function getStarMultiplierByRarity(rarity?: string): number {
    switch (rarity) {
        case "Legendary":
            return 0.12;  // 每星增加12%
        case "Epic":
            return 0.11;  // 每星增加11%
        case "Rare":
            return 0.10;  // 每星增加10%（默认值）
        case "Common":
            return 0.09;  // 每星增加9%
        default:
            return 0.10;  // 默认值
    }
}

/**
 * 根据职业分配技能
 */
function getSkillsByClass(monsterClass?: string): string[] {
    const baseSkills: string[] = ["basic_attack"]; // 所有怪物都有基础攻击
    
    if (!monsterClass) {
        return baseSkills;
    }
    
    switch (monsterClass) {
        case "Warrior":
            return [
                ...baseSkills,
                "attack_boost",      // 7级解锁
                "combat_reflexes",   // 被动技能
            ];
        
        case "Tank":
            return [
                ...baseSkills,
                "shield",            // 5级解锁
                "defense_boost",     // 7级解锁
                "regeneration",      // 被动技能
            ];
        
        case "Mage":
            return [
                "ranged_attack",     // 远程攻击
                "weaken",            // 7级解锁
                "combat_reflexes",   // 被动技能
            ];
        
        case "Assassin":
            return [
                ...baseSkills,
                "combat_reflexes",   // 被动技能
                "attack_boost",      // 7级解锁
            ];
        
        case "Support":
            return [
                ...baseSkills,
                "heal",              // 3级解锁
                "group_heal",        // 10级解锁
                "attack_boost",      // 7级解锁
                "defense_boost",     // 7级解锁
            ];
        
        case "Archer":
            return [
                "ranged_attack",
                "attack_boost",      // 7级解锁
                "combat_reflexes",   // 被动技能
            ];
        
        default:
            return baseSkills;
    }
}

/**
 * 根据职业和稀有度分配成长率（包括星级倍率）
 * 如果不指定，则使用 GROWTH_STRATEGY 的默认值
 */
function getGrowthRatesByClass(monsterClass?: string, rarity?: string): {
    hp: number;
    damage: number;
    defense: number;
    speed: number;
    starMultiplierPerStar?: number;
} | undefined {
    if (!monsterClass) {
        // 如果没有职业，返回 undefined，使用全局默认值
        return undefined;
    }
    
    switch (monsterClass) {
        case "Warrior":
            return {
                hp: 0.12,      // 12% HP成长
                damage: 0.12,  // 12% 攻击成长
                defense: 0.10, // 10% 防御成长
                speed: 0.05,   // 5% 速度成长
                starMultiplierPerStar: getStarMultiplierByRarity(rarity),
            };
        
        case "Tank":
            return {
                hp: 0.18,      // 18% HP成长
                damage: 0.08,  // 8% 攻击成长
                defense: 0.15, // 15% 防御成长
                speed: 0.03,   // 3% 速度成长
                starMultiplierPerStar: getStarMultiplierByRarity(rarity),
            };
        
        case "Mage":
            return {
                hp: 0.10,      // 10% HP成长
                damage: 0.15,  // 15% 攻击成长
                defense: 0.08, // 8% 防御成长
                speed: 0.08,   // 8% 速度成长
                starMultiplierPerStar: getStarMultiplierByRarity(rarity),
            };
        
        case "Assassin":
            return {
                hp: 0.10,      // 10% HP成长
                damage: 0.12,  // 12% 攻击成长
                defense: 0.08, // 8% 防御成长
                speed: 0.12,   // 12% 速度成长
                starMultiplierPerStar: getStarMultiplierByRarity(rarity),
            };
        
        case "Support":
            return {
                hp: 0.13,      // 13% HP成长
                damage: 0.09,  // 9% 攻击成长
                defense: 0.11, // 11% 防御成长
                speed: 0.07,   // 7% 速度成长
                starMultiplierPerStar: getStarMultiplierByRarity(rarity),
            };
        
        case "Archer":
            return {
                hp: 0.12,      // 12% HP成长
                damage: 0.11,  // 11% 攻击成长
                defense: 0.10, // 10% 防御成长
                speed: 0.08,   // 8% 速度成长
                starMultiplierPerStar: getStarMultiplierByRarity(rarity),
            };
        
        default:
            // 未知职业，返回 undefined，使用全局默认值
            return undefined;
    }
}

/**
 * Camex Games Tactical Monster 怪物配置
 * 基于实际游戏中的怪物设计
 */
export const MONSTER_CONFIGS: Array<Monster> = [
    // ============================================
    // Legendary (4个) - 传说级怪物
    // ============================================
    {
        monsterId: "monster_001",
        name: "格里芬",
        rarity: "Legendary",
        class: "Warrior",
        race: "Flying",
        baseHp: 1200,
        baseDamage: 150,
        baseDefense: 100,
        baseSpeed: 80,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Legendary"),
        moveRange: 4,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/griffin/model/griffin.glb",
    },
    {
        monsterId: "monster_002",
        name: "原始巨龙",
        rarity: "Legendary",
        class: "Mage",
        race: "Dragon",
        baseHp: 1400,
        baseDamage: 180,
        baseDefense: 120,
        baseSpeed: 70,
        skillIds: getSkillsByClass("Mage"),
        growthRates: getGrowthRatesByClass("Mage", "Legendary"),
        moveRange: 3,
        attackRange: { min: 1, max: 3 },
        assetPath: "/assets/3d/characters/firedragon/model/firedragon.glb",
    },
    {
        monsterId: "monster_003",
        name: "混沌领主",
        rarity: "Legendary",
        class: "Assassin",
        race: "Demon",
        baseHp: 1000,
        baseDamage: 200,
        baseDefense: 80,
        baseSpeed: 100,
        skillIds: getSkillsByClass("Assassin"),
        growthRates: getGrowthRatesByClass("Assassin", "Legendary"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/death/model/death.glb",
    },
    {
        monsterId: "monster_004",
        name: "神圣守护者",
        rarity: "Legendary",
        class: "Tank",
        race: "Angel",
        baseHp: 1600,
        baseDamage: 120,
        baseDefense: 150,
        baseSpeed: 60,
        skillIds: getSkillsByClass("Tank"),
        growthRates: getGrowthRatesByClass("Tank", "Legendary"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/valkyrie/model/valkyrie.glb",
    },

    // ============================================
    // Epic (9个) - 史诗级怪物
    // ============================================
    {
        monsterId: "monster_005",
        name: "美杜莎",
        rarity: "Epic",
        class: "Mage",
        race: "Demon",
        baseHp: 800,
        baseDamage: 200,
        baseDefense: 60,
        baseSpeed: 90,
        skillIds: getSkillsByClass("Mage"),
        growthRates: getGrowthRatesByClass("Mage", "Epic"),
        moveRange: 3,
        attackRange: { min: 1, max: 3 },
        assetPath: "/assets/3d/characters/medusa/model/medusa.glb",
    },
    {
        monsterId: "monster_006",
        name: "龙族领主",
        rarity: "Epic",
        class: "Warrior",
        race: "Dragon",
        baseHp: 1100,
        baseDamage: 160,
        baseDefense: 100,
        baseSpeed: 75,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Epic"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/firedragon/model/firedragon.glb",
    },
    {
        monsterId: "monster_007",
        name: "恶魔之王",
        rarity: "Epic",
        class: "Mage",
        race: "Demon",
        baseHp: 900,
        baseDamage: 190,
        baseDefense: 70,
        baseSpeed: 85,
        skillIds: getSkillsByClass("Mage"),
        growthRates: getGrowthRatesByClass("Mage", "Epic"),
        moveRange: 3,
        attackRange: { min: 1, max: 3 },
        assetPath: "/assets/3d/characters/hellboy/model/hellboy.glb",
    },
    {
        monsterId: "monster_008",
        name: "天界使者",
        rarity: "Epic",
        class: "Support",
        race: "Angel",
        baseHp: 950,
        baseDamage: 140,
        baseDefense: 90,
        baseSpeed: 95,
        skillIds: getSkillsByClass("Support"),
        growthRates: getGrowthRatesByClass("Support", "Epic"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/athena/model/athena.glb",
    },
    {
        monsterId: "monster_009",
        name: "古代泰坦",
        rarity: "Epic",
        class: "Tank",
        race: "Elemental",
        baseHp: 1300,
        baseDamage: 130,
        baseDefense: 130,
        baseSpeed: 55,
        skillIds: getSkillsByClass("Tank"),
        growthRates: getGrowthRatesByClass("Tank", "Epic"),
        moveRange: 2,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/thor/model/thor.glb",
    },
    {
        monsterId: "monster_010",
        name: "不死凤凰",
        rarity: "Epic",
        class: "Mage",
        race: "Flying",
        baseHp: 850,
        baseDamage: 180,
        baseDefense: 65,
        baseSpeed: 100,
        skillIds: getSkillsByClass("Mage"),
        growthRates: getGrowthRatesByClass("Mage", "Epic"),
        moveRange: 4,
        attackRange: { min: 1, max: 3 },
        assetPath: "/assets/3d/characters/faeriedragon/model/faeriedragon.glb",
    },
    {
        monsterId: "monster_011",
        name: "深海巨兽",
        rarity: "Epic",
        class: "Tank",
        race: "Aquatic",
        baseHp: 1200,
        baseDamage: 150,
        baseDefense: 110,
        baseSpeed: 65,
        skillIds: getSkillsByClass("Tank"),
        growthRates: getGrowthRatesByClass("Tank", "Epic"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/lavadolphin/model/lavadolphin.glb",
    },
    {
        monsterId: "monster_012",
        name: "远古巨兽",
        rarity: "Epic",
        class: "Warrior",
        race: "Beast",
        baseHp: 1050,
        baseDamage: 170,
        baseDefense: 95,
        baseSpeed: 70,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Epic"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/yeti/model/yeti.glb",
    },
    {
        monsterId: "monster_013",
        name: "大法师",
        rarity: "Epic",
        class: "Mage",
        race: "Human",
        baseHp: 750,
        baseDamage: 210,
        baseDefense: 55,
        baseSpeed: 95,
        skillIds: getSkillsByClass("Mage"),
        growthRates: getGrowthRatesByClass("Mage", "Epic"),
        moveRange: 3,
        attackRange: { min: 1, max: 3 },
        assetPath: "/assets/3d/characters/timemaster/model/timemaster.glb",
    },

    // ============================================
    // Rare (23个) - 稀有级怪物
    // ============================================
    {
        monsterId: "monster_014",
        name: "狼人",
        rarity: "Rare",
        class: "Assassin",
        race: "Beast",
        baseHp: 700,
        baseDamage: 180,
        baseDefense: 50,
        baseSpeed: 100,
        skillIds: getSkillsByClass("Assassin"),
        growthRates: getGrowthRatesByClass("Assassin", "Rare"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/werewolf/model/werewolf.glb",
    },
    {
        monsterId: "monster_015",
        name: "精英骑士",
        rarity: "Rare",
        class: "Warrior",
        race: "Human",
        baseHp: 850,
        baseDamage: 130,
        baseDefense: 90,
        baseSpeed: 75,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Rare"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/knight/model/knight.glb",
    },
    {
        monsterId: "monster_016",
        name: "神射手",
        rarity: "Rare",
        class: "Archer",
        race: "Elf",
        baseHp: 650,
        baseDamage: 160,
        baseDefense: 60,
        baseSpeed: 110,
        skillIds: getSkillsByClass("Archer"),
        growthRates: getGrowthRatesByClass("Archer", "Rare"),
        moveRange: 3,
        attackRange: { min: 2, max: 5 },
        assetPath: "/assets/3d/characters/archer/model/archer.glb",
    },
    {
        monsterId: "monster_019",
        name: "圣骑士",
        rarity: "Rare",
        class: "Tank",
        race: "Human",
        baseHp: 950,
        baseDamage: 120,
        baseDefense: 100,
        baseSpeed: 70,
        skillIds: getSkillsByClass("Tank"),
        growthRates: getGrowthRatesByClass("Tank", "Rare"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/paladin/model/paladin.glb",
    },
    {
        monsterId: "monster_017",
        name: "德鲁伊",
        rarity: "Rare",
        class: "Support",
        race: "Elf",
        baseHp: 750,
        baseDamage: 110,
        baseDefense: 75,
        baseSpeed: 85,
        skillIds: getSkillsByClass("Support"),
        growthRates: getGrowthRatesByClass("Support", "Rare"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/ent/model/ent.glb",
    },
    {
        monsterId: "monster_018",
        name: "游侠",
        rarity: "Rare",
        class: "Archer",
        race: "Elf",
        baseHp: 680,
        baseDamage: 150,
        baseDefense: 65,
        baseSpeed: 105,
        skillIds: getSkillsByClass("Archer"),
        growthRates: getGrowthRatesByClass("Archer", "Rare"),
        moveRange: 3,
        attackRange: { min: 2, max: 5 },
        assetPath: "/assets/3d/characters/archer/model/archer.glb",
    },
    {
        monsterId: "monster_019",
        name: "狂战士",
        rarity: "Rare",
        class: "Warrior",
        race: "Orc",
        baseHp: 800,
        baseDamage: 170,
        baseDefense: 70,
        baseSpeed: 80,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Rare"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/orcwarrior/model/orcwarrior.glb",
    },
    {
        monsterId: "monster_020",
        name: "萨满",
        rarity: "Rare",
        class: "Support",
        race: "Orc",
        baseHp: 720,
        baseDamage: 130,
        baseDefense: 68,
        baseSpeed: 88,
        skillIds: getSkillsByClass("Support"),
        growthRates: getGrowthRatesByClass("Support", "Rare"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/shaman/model/shaman.glb",
    },
    {
        monsterId: "monster_021",
        name: "死灵法师",
        rarity: "Rare",
        class: "Mage",
        race: "Undead",
        baseHp: 650,
        baseDamage: 175,
        baseDefense: 55,
        baseSpeed: 90,
        skillIds: getSkillsByClass("Mage"),
        growthRates: getGrowthRatesByClass("Mage", "Rare"),
        moveRange: 3,
        attackRange: { min: 1, max: 3 },
        assetPath: "/assets/3d/characters/frankenstein/model/frankenstein.glb",
    },
    {
        monsterId: "monster_022",
        name: "牧师",
        rarity: "Rare",
        class: "Support",
        race: "Human",
        baseHp: 780,
        baseDamage: 100,
        baseDefense: 80,
        baseSpeed: 82,
        skillIds: getSkillsByClass("Support"),
        growthRates: getGrowthRatesByClass("Support", "Rare"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/pastor/model/pastor.glb",
    },
    {
        monsterId: "monster_023",
        name: "龙骑士",
        rarity: "Rare",
        class: "Warrior",
        race: "Dragon",
        baseHp: 900,
        baseDamage: 140,
        baseDefense: 85,
        baseSpeed: 72,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Rare"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/ares/model/ares.glb",
    },
    {
        monsterId: "monster_024",
        name: "狮鹫骑士",
        rarity: "Rare",
        class: "Archer",
        race: "Flying",
        baseHp: 750,
        baseDamage: 145,
        baseDefense: 70,
        baseSpeed: 95,
        skillIds: getSkillsByClass("Archer"),
        growthRates: getGrowthRatesByClass("Archer", "Rare"),
        moveRange: 4,
        attackRange: { min: 2, max: 5 },
        assetPath: "/assets/3d/characters/griffin/model/griffin.glb",
    },
    {
        monsterId: "monster_025",
        name: "吸血鬼",
        rarity: "Rare",
        class: "Assassin",
        race: "Undead",
        baseHp: 720,
        baseDamage: 165,
        baseDefense: 60,
        baseSpeed: 98,
        skillIds: getSkillsByClass("Assassin"),
        growthRates: getGrowthRatesByClass("Assassin", "Rare"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/death/model/death.glb",
    },
    {
        monsterId: "monster_026",
        name: "巫妖王",
        rarity: "Rare",
        class: "Mage",
        race: "Undead",
        baseHp: 800,
        baseDamage: 180,
        baseDefense: 65,
        baseSpeed: 85,
        skillIds: getSkillsByClass("Mage"),
        growthRates: getGrowthRatesByClass("Mage", "Rare"),
        moveRange: 3,
        attackRange: { min: 1, max: 3 },
        assetPath: "/assets/3d/characters/frankenstein/model/frankenstein.glb",
    },
    {
        monsterId: "monster_027",
        name: "恶魔领主",
        rarity: "Rare",
        class: "Warrior",
        race: "Demon",
        baseHp: 850,
        baseDamage: 155,
        baseDefense: 75,
        baseSpeed: 78,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Rare"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/hellboy/model/hellboy.glb",
    },
    {
        monsterId: "monster_028",
        name: "天使战士",
        rarity: "Rare",
        class: "Warrior",
        race: "Angel",
        baseHp: 880,
        baseDamage: 135,
        baseDefense: 95,
        baseSpeed: 80,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Rare"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/apollo/model/apollo.glb",
    },
    {
        monsterId: "monster_029",
        name: "半人马",
        rarity: "Rare",
        class: "Archer",
        race: "Beast",
        baseHp: 780,
        baseDamage: 150,
        baseDefense: 72,
        baseSpeed: 92,
        skillIds: getSkillsByClass("Archer"),
        growthRates: getGrowthRatesByClass("Archer", "Rare"),
        moveRange: 3,
        attackRange: { min: 2, max: 5 },
        assetPath: "/assets/3d/characters/centaur/model/centaur.glb",
    },
    {
        monsterId: "monster_030",
        name: "牛头人",
        rarity: "Rare",
        class: "Tank",
        race: "Beast",
        baseHp: 1000,
        baseDamage: 125,
        baseDefense: 105,
        baseSpeed: 65,
        skillIds: getSkillsByClass("Tank"),
        growthRates: getGrowthRatesByClass("Tank", "Rare"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/tauren/model/tauren.glb",
    },
    {
        monsterId: "monster_031",
        name: "鹰身女妖",
        rarity: "Rare",
        class: "Archer",
        race: "Flying",
        baseHp: 680,
        baseDamage: 155,
        baseDefense: 58,
        baseSpeed: 108,
        skillIds: getSkillsByClass("Archer"),
        growthRates: getGrowthRatesByClass("Archer", "Rare"),
        moveRange: 4,
        attackRange: { min: 2, max: 5 },
        assetPath: "/assets/3d/characters/harpy/model/harpy.glb",
    },
    {
        monsterId: "monster_032",
        name: "元素法师",
        rarity: "Rare",
        class: "Mage",
        race: "Elemental",
        baseHp: 700,
        baseDamage: 170,
        baseDefense: 62,
        baseSpeed: 88,
        skillIds: getSkillsByClass("Mage"),
        growthRates: getGrowthRatesByClass("Mage", "Rare"),
        moveRange: 3,
        attackRange: { min: 1, max: 3 },
        assetPath: "/assets/3d/characters/earthelement/model/earthelement.glb",
    },
    {
        monsterId: "monster_033",
        name: "机械医生",
        rarity: "Rare",
        class: "Support",
        race: "Mechanical",
        baseHp: 760,
        baseDamage: 115,
        baseDefense: 85,
        baseSpeed: 75,
        skillIds: getSkillsByClass("Support"),
        growthRates: getGrowthRatesByClass("Support", "Rare"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/mechadoctor/model/mechadoctor.glb",
    },
    {
        monsterId: "monster_034",
        name: "熊猫武僧",
        rarity: "Rare",
        class: "Warrior",
        race: "Beast",
        baseHp: 820,
        baseDamage: 140,
        baseDefense: 88,
        baseSpeed: 78,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Rare"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/panda/model/panda.glb",
    },
    {
        monsterId: "monster_035",
        name: "雪女",
        rarity: "Rare",
        class: "Mage",
        race: "Elemental",
        baseHp: 730,
        baseDamage: 165,
        baseDefense: 68,
        baseSpeed: 90,
        skillIds: getSkillsByClass("Mage"),
        growthRates: getGrowthRatesByClass("Mage", "Rare"),
        moveRange: 3,
        attackRange: { min: 1, max: 3 },
        assetPath: "/assets/3d/characters/snowmaiden/model/snowmaiden.glb",
    },

    // ============================================
    // Common (54个) - 普通级怪物
    // ============================================
    {
        monsterId: "monster_036",
        name: "骷髅战士",
        rarity: "Common",
        class: "Warrior",
        race: "Undead",
        baseHp: 600,
        baseDamage: 100,
        baseDefense: 80,
        baseSpeed: 60,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/frankenstein/model/frankenstein.glb",
    },
    {
        monsterId: "monster_037",
        name: "哥布林战士",
        rarity: "Common",
        class: "Warrior",
        race: "Orc",
        baseHp: 580,
        baseDamage: 95,
        baseDefense: 75,
        baseSpeed: 65,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/goblingamer/model/goblingamer.glb",
    },
    {
        monsterId: "monster_038",
        name: "兽人战士",
        rarity: "Common",
        class: "Warrior",
        race: "Orc",
        baseHp: 620,
        baseDamage: 105,
        baseDefense: 78,
        baseSpeed: 62,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/orc/model/orc.glb",
    },
    {
        monsterId: "monster_039",
        name: "弓箭手",
        rarity: "Common",
        class: "Archer",
        race: "Human",
        baseHp: 550,
        baseDamage: 110,
        baseDefense: 60,
        baseSpeed: 85,
        skillIds: getSkillsByClass("Archer"),
        growthRates: getGrowthRatesByClass("Archer", "Common"),
        moveRange: 3,
        attackRange: { min: 2, max: 5 },
        assetPath: "/assets/3d/characters/archer/model/archer.glb",
    },
    {
        monsterId: "monster_040",
        name: "刺客",
        rarity: "Common",
        class: "Assassin",
        race: "Human",
        baseHp: 500,
        baseDamage: 120,
        baseDefense: 50,
        baseSpeed: 95,
        skillIds: getSkillsByClass("Assassin"),
        growthRates: getGrowthRatesByClass("Assassin", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/assassin/model/assassin.glb",
    },
    {
        monsterId: "monster_041",
        name: "步兵",
        rarity: "Common",
        class: "Warrior",
        race: "Human",
        baseHp: 590,
        baseDamage: 98,
        baseDefense: 82,
        baseSpeed: 58,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/infantry/model/infantry.glb",
    },
    {
        monsterId: "monster_042",
        name: "长矛兵",
        rarity: "Common",
        class: "Warrior",
        race: "Human",
        baseHp: 570,
        baseDamage: 102,
        baseDefense: 76,
        baseSpeed: 64,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/infantry/model/infantry.glb",
    },
    {
        monsterId: "monster_043",
        name: "剑士",
        rarity: "Common",
        class: "Warrior",
        race: "Human",
        baseHp: 600,
        baseDamage: 108,
        baseDefense: 80,
        baseSpeed: 66,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/knight/model/knight.glb",
    },
    {
        monsterId: "monster_044",
        name: "弩手",
        rarity: "Common",
        class: "Archer",
        race: "Human",
        baseHp: 540,
        baseDamage: 115,
        baseDefense: 58,
        baseSpeed: 82,
        skillIds: getSkillsByClass("Archer"),
        growthRates: getGrowthRatesByClass("Archer", "Common"),
        moveRange: 3,
        attackRange: { min: 2, max: 5 },
        assetPath: "/assets/3d/characters/sharpshooter/model/sharpshooter.glb",
    },
    {
        monsterId: "monster_045",
        name: "侍从",
        rarity: "Common",
        class: "Warrior",
        race: "Human",
        baseHp: 560,
        baseDamage: 92,
        baseDefense: 74,
        baseSpeed: 68,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/knight/model/knight.glb",
    },
    {
        monsterId: "monster_046",
        name: "守卫",
        rarity: "Common",
        class: "Tank",
        race: "Human",
        baseHp: 650,
        baseDamage: 85,
        baseDefense: 90,
        baseSpeed: 55,
        skillIds: getSkillsByClass("Tank"),
        growthRates: getGrowthRatesByClass("Tank", "Common"),
        moveRange: 2,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/paladin/model/paladin.glb",
    },
    {
        monsterId: "monster_047",
        name: "民兵",
        rarity: "Common",
        class: "Warrior",
        race: "Human",
        baseHp: 550,
        baseDamage: 90,
        baseDefense: 70,
        baseSpeed: 70,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/infantry/model/infantry.glb",
    },
    {
        monsterId: "monster_048",
        name: "僵尸",
        rarity: "Common",
        class: "Warrior",
        race: "Undead",
        baseHp: 630,
        baseDamage: 95,
        baseDefense: 85,
        baseSpeed: 50,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Common"),
        moveRange: 2,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/death/model/death.glb",
    },
    {
        monsterId: "monster_049",
        name: "食尸鬼",
        rarity: "Common",
        class: "Assassin",
        race: "Undead",
        baseHp: 580,
        baseDamage: 110,
        baseDefense: 65,
        baseSpeed: 75,
        skillIds: getSkillsByClass("Assassin"),
        growthRates: getGrowthRatesByClass("Assassin", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/shadowminion/model/shadowminion.glb",
    },
    {
        monsterId: "monster_050",
        name: "怨灵",
        rarity: "Common",
        class: "Mage",
        race: "Spirit",
        baseHp: 520,
        baseDamage: 125,
        baseDefense: 45,
        baseSpeed: 88,
        skillIds: getSkillsByClass("Mage"),
        growthRates: getGrowthRatesByClass("Mage", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 3 },
        assetPath: "/assets/3d/characters/lamp/model/lamp.glb",
    },
    {
        monsterId: "monster_051",
        name: "女妖",
        rarity: "Common",
        class: "Mage",
        race: "Spirit",
        baseHp: 510,
        baseDamage: 130,
        baseDefense: 42,
        baseSpeed: 90,
        skillIds: getSkillsByClass("Mage"),
        growthRates: getGrowthRatesByClass("Mage", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 3 },
        assetPath: "/assets/3d/characters/harpy/model/harpy.glb",
    },
    {
        monsterId: "monster_052",
        name: "火元素",
        rarity: "Common",
        class: "Mage",
        race: "Elemental",
        baseHp: 540,
        baseDamage: 120,
        baseDefense: 50,
        baseSpeed: 80,
        skillIds: getSkillsByClass("Mage"),
        growthRates: getGrowthRatesByClass("Mage", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 3 },
        assetPath: "/assets/3d/characters/firedragon/model/firedragon.glb",
    },
    {
        monsterId: "monster_053",
        name: "水元素",
        rarity: "Common",
        class: "Support",
        race: "Elemental",
        baseHp: 560,
        baseDamage: 100,
        baseDefense: 68,
        baseSpeed: 75,
        skillIds: getSkillsByClass("Support"),
        growthRates: getGrowthRatesByClass("Support", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/lavadolphin/model/lavadolphin.glb",
    },
    {
        monsterId: "monster_054",
        name: "土元素",
        rarity: "Common",
        class: "Tank",
        race: "Elemental",
        baseHp: 640,
        baseDamage: 88,
        baseDefense: 95,
        baseSpeed: 52,
        skillIds: getSkillsByClass("Tank"),
        growthRates: getGrowthRatesByClass("Tank", "Common"),
        moveRange: 2,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/earthelement/model/earthelement.glb",
    },
    {
        monsterId: "monster_055",
        name: "风元素",
        rarity: "Common",
        class: "Archer",
        race: "Elemental",
        baseHp: 530,
        baseDamage: 115,
        baseDefense: 55,
        baseSpeed: 92,
        skillIds: getSkillsByClass("Archer"),
        growthRates: getGrowthRatesByClass("Archer", "Common"),
        moveRange: 3,
        attackRange: { min: 2, max: 5 },
        assetPath: "/assets/3d/characters/faeriedragon/model/faeriedragon.glb",
    },
    {
        monsterId: "monster_056",
        name: "冰元素",
        rarity: "Common",
        class: "Mage",
        race: "Elemental",
        baseHp: 550,
        baseDamage: 118,
        baseDefense: 58,
        baseSpeed: 78,
        skillIds: getSkillsByClass("Mage"),
        growthRates: getGrowthRatesByClass("Mage", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 3 },
        assetPath: "/assets/3d/characters/icesucker/model/icesucker.glb",
    },
    {
        monsterId: "monster_057",
        name: "雷元素",
        rarity: "Common",
        class: "Mage",
        race: "Elemental",
        baseHp: 545,
        baseDamage: 122,
        baseDefense: 52,
        baseSpeed: 85,
        skillIds: getSkillsByClass("Mage"),
        growthRates: getGrowthRatesByClass("Mage", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 3 },
        assetPath: "/assets/3d/characters/thor/model/thor.glb",
    },
    {
        monsterId: "monster_058",
        name: "巨鼠",
        rarity: "Common",
        class: "Assassin",
        race: "Beast",
        baseHp: 480,
        baseDamage: 105,
        baseDefense: 48,
        baseSpeed: 100,
        skillIds: getSkillsByClass("Assassin"),
        growthRates: getGrowthRatesByClass("Assassin", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/jackmouse/model/jackmouse.glb",
    },
    {
        monsterId: "monster_059",
        name: "恐狼",
        rarity: "Common",
        class: "Warrior",
        race: "Beast",
        baseHp: 600,
        baseDamage: 110,
        baseDefense: 70,
        baseSpeed: 85,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/werewolf/model/werewolf.glb",
    },
    {
        monsterId: "monster_060",
        name: "巨蜘蛛",
        rarity: "Common",
        class: "Assassin",
        race: "Beast",
        baseHp: 520,
        baseDamage: 115,
        baseDefense: 60,
        baseSpeed: 88,
        skillIds: getSkillsByClass("Assassin"),
        growthRates: getGrowthRatesByClass("Assassin", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/longicorn/model/longicorn.glb",
    },
    {
        monsterId: "monster_061",
        name: "洞穴蝙蝠",
        rarity: "Common",
        class: "Archer",
        race: "Flying",
        baseHp: 450,
        baseDamage: 108,
        baseDefense: 45,
        baseSpeed: 95,
        skillIds: getSkillsByClass("Archer"),
        growthRates: getGrowthRatesByClass("Archer", "Common"),
        moveRange: 4,
        attackRange: { min: 2, max: 5 },
        assetPath: "/assets/3d/characters/karasu/model/karasu.glb",
    },
    {
        monsterId: "monster_062",
        name: "野猪",
        rarity: "Common",
        class: "Warrior",
        race: "Beast",
        baseHp: 610,
        baseDamage: 98,
        baseDefense: 78,
        baseSpeed: 70,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/boar/model/boar.glb",
    },
    {
        monsterId: "monster_063",
        name: "森林熊",
        rarity: "Common",
        class: "Tank",
        race: "Beast",
        baseHp: 680,
        baseDamage: 92,
        baseDefense: 88,
        baseSpeed: 58,
        skillIds: getSkillsByClass("Tank"),
        growthRates: getGrowthRatesByClass("Tank", "Common"),
        moveRange: 2,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/bearwarrior/model/bearwarrior.glb",
    },
    {
        monsterId: "monster_064",
        name: "小恶魔",
        rarity: "Common",
        class: "Assassin",
        race: "Demon",
        baseHp: 490,
        baseDamage: 118,
        baseDefense: 50,
        baseSpeed: 92,
        skillIds: getSkillsByClass("Assassin"),
        growthRates: getGrowthRatesByClass("Assassin", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/goblingamer/model/goblingamer.glb",
    },
    {
        monsterId: "monster_065",
        name: "史莱姆",
        rarity: "Common",
        class: "Tank",
        race: "Elemental",
        baseHp: 570,
        baseDamage: 75,
        baseDefense: 82,
        baseSpeed: 55,
        skillIds: getSkillsByClass("Tank"),
        growthRates: getGrowthRatesByClass("Tank", "Common"),
        moveRange: 2,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/egg/model/egg.glb",
    },
    {
        monsterId: "monster_066",
        name: "乌鸦",
        rarity: "Common",
        class: "Archer",
        race: "Flying",
        baseHp: 440,
        baseDamage: 102,
        baseDefense: 42,
        baseSpeed: 98,
        skillIds: getSkillsByClass("Archer"),
        growthRates: getGrowthRatesByClass("Archer", "Common"),
        moveRange: 4,
        attackRange: { min: 2, max: 5 },
        assetPath: "/assets/3d/characters/karasu/model/karasu.glb",
    },
    {
        monsterId: "monster_067",
        name: "熊",
        rarity: "Common",
        class: "Warrior",
        race: "Beast",
        baseHp: 650,
        baseDamage: 100,
        baseDefense: 85,
        baseSpeed: 60,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/bearwarrior/model/bearwarrior.glb",
    },
    {
        monsterId: "monster_068",
        name: "野鹿",
        rarity: "Common",
        class: "Archer",
        race: "Beast",
        baseHp: 500,
        baseDamage: 95,
        baseDefense: 55,
        baseSpeed: 90,
        skillIds: getSkillsByClass("Archer"),
        growthRates: getGrowthRatesByClass("Archer", "Common"),
        moveRange: 3,
        attackRange: { min: 2, max: 5 },
        assetPath: "/assets/3d/characters/cervitaur/model/cervitaur.glb",
    },
    {
        monsterId: "monster_069",
        name: "兔子",
        rarity: "Common",
        class: "Assassin",
        race: "Beast",
        baseHp: 420,
        baseDamage: 105,
        baseDefense: 40,
        baseSpeed: 105,
        skillIds: getSkillsByClass("Assassin"),
        growthRates: getGrowthRatesByClass("Assassin", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/bunny/model/bunny.glb",
    },
    {
        monsterId: "monster_070",
        name: "狐狸",
        rarity: "Common",
        class: "Archer",
        race: "Beast",
        baseHp: 480,
        baseDamage: 110,
        baseDefense: 48,
        baseSpeed: 96,
        skillIds: getSkillsByClass("Archer"),
        growthRates: getGrowthRatesByClass("Archer", "Common"),
        moveRange: 3,
        attackRange: { min: 2, max: 5 },
        assetPath: "/assets/3d/characters/jackal/model/jackal.glb",
    },
    {
        monsterId: "monster_071",
        name: "老鹰",
        rarity: "Common",
        class: "Archer",
        race: "Flying",
        baseHp: 460,
        baseDamage: 112,
        baseDefense: 46,
        baseSpeed: 100,
        skillIds: getSkillsByClass("Archer"),
        growthRates: getGrowthRatesByClass("Archer", "Common"),
        moveRange: 4,
        attackRange: { min: 2, max: 5 },
        assetPath: "/assets/3d/characters/griffin/model/griffin.glb",
    },
    {
        monsterId: "monster_072",
        name: "侦察兵",
        rarity: "Common",
        class: "Archer",
        race: "Human",
        baseHp: 520,
        baseDamage: 108,
        baseDefense: 62,
        baseSpeed: 88,
        skillIds: getSkillsByClass("Archer"),
        growthRates: getGrowthRatesByClass("Archer", "Common"),
        moveRange: 3,
        attackRange: { min: 2, max: 5 },
        assetPath: "/assets/3d/characters/sharpshooter/model/sharpshooter.glb",
    },
    {
        monsterId: "monster_073",
        name: "猎人",
        rarity: "Common",
        class: "Archer",
        race: "Human",
        baseHp: 540,
        baseDamage: 112,
        baseDefense: 64,
        baseSpeed: 85,
        skillIds: getSkillsByClass("Archer"),
        growthRates: getGrowthRatesByClass("Archer", "Common"),
        moveRange: 3,
        attackRange: { min: 2, max: 5 },
        assetPath: "/assets/3d/characters/archer/model/archer.glb",
    },
    {
        monsterId: "monster_074",
        name: "农民",
        rarity: "Common",
        class: "Support",
        race: "Human",
        baseHp: 500,
        baseDamage: 80,
        baseDefense: 60,
        baseSpeed: 72,
        skillIds: getSkillsByClass("Support"),
        growthRates: getGrowthRatesByClass("Support", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/marmotminer/model/marmotminer.glb",
    },
    {
        monsterId: "monster_075",
        name: "雇佣兵",
        rarity: "Common",
        class: "Warrior",
        race: "Human",
        baseHp: 580,
        baseDamage: 104,
        baseDefense: 76,
        baseSpeed: 68,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/infantry/model/infantry.glb",
    },
    {
        monsterId: "monster_076",
        name: "盗贼",
        rarity: "Common",
        class: "Assassin",
        race: "Human",
        baseHp: 510,
        baseDamage: 115,
        baseDefense: 55,
        baseSpeed: 93,
        skillIds: getSkillsByClass("Assassin"),
        growthRates: getGrowthRatesByClass("Assassin", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/assassin/model/assassin.glb",
    },
    {
        monsterId: "monster_077",
        name: "强盗",
        rarity: "Common",
        class: "Warrior",
        race: "Human",
        baseHp: 590,
        baseDamage: 106,
        baseDefense: 74,
        baseSpeed: 66,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/orc/model/orc.glb",
    },
    {
        monsterId: "monster_078",
        name: "狼骑士",
        rarity: "Common",
        class: "Warrior",
        race: "Beast",
        baseHp: 620,
        baseDamage: 108,
        baseDefense: 80,
        baseSpeed: 82,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/centaur/model/centaur.glb",
    },
    {
        monsterId: "monster_079",
        name: "小精灵",
        rarity: "Common",
        class: "Support",
        race: "Spirit",
        baseHp: 480,
        baseDamage: 95,
        baseDefense: 58,
        baseSpeed: 86,
        skillIds: getSkillsByClass("Support"),
        growthRates: getGrowthRatesByClass("Support", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/fairy/model/fairy.glb",
    },
    {
        monsterId: "monster_080",
        name: "树精",
        rarity: "Common",
        class: "Tank",
        race: "Plant",
        baseHp: 630,
        baseDamage: 88,
        baseDefense: 90,
        baseSpeed: 50,
        skillIds: getSkillsByClass("Tank"),
        growthRates: getGrowthRatesByClass("Tank", "Common"),
        moveRange: 2,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/ent/model/ent.glb",
    },
    {
        monsterId: "monster_081",
        name: "机械兵",
        rarity: "Common",
        class: "Warrior",
        race: "Mechanical",
        baseHp: 600,
        baseDamage: 102,
        baseDefense: 85,
        baseSpeed: 62,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/madrobot/model/madrobot.glb",
    },
    {
        monsterId: "monster_082",
        name: "机械守卫",
        rarity: "Common",
        class: "Tank",
        race: "Mechanical",
        baseHp: 650,
        baseDamage: 90,
        baseDefense: 92,
        baseSpeed: 56,
        skillIds: getSkillsByClass("Tank"),
        growthRates: getGrowthRatesByClass("Tank", "Common"),
        moveRange: 2,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/madrobot/model/madrobot.glb",
    },
    {
        monsterId: "monster_083",
        name: "水精灵",
        rarity: "Common",
        class: "Support",
        race: "Aquatic",
        baseHp: 550,
        baseDamage: 98,
        baseDefense: 70,
        baseSpeed: 78,
        skillIds: getSkillsByClass("Support"),
        growthRates: getGrowthRatesByClass("Support", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/lavadolphin/model/lavadolphin.glb",
    },
    {
        monsterId: "monster_084",
        name: "鱼人",
        rarity: "Common",
        class: "Warrior",
        race: "Aquatic",
        baseHp: 580,
        baseDamage: 100,
        baseDefense: 75,
        baseSpeed: 72,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/turtulecaptain/model/turtulecaptain.glb",
    },
    {
        monsterId: "monster_085",
        name: "狮鹫幼崽",
        rarity: "Common",
        class: "Archer",
        race: "Flying",
        baseHp: 560,
        baseDamage: 108,
        baseDefense: 68,
        baseSpeed: 88,
        skillIds: getSkillsByClass("Archer"),
        growthRates: getGrowthRatesByClass("Archer", "Common"),
        moveRange: 4,
        attackRange: { min: 2, max: 5 },
        assetPath: "/assets/3d/characters/griffin/model/griffin.glb",
    },
    {
        monsterId: "monster_086",
        name: "小飞龙",
        rarity: "Common",
        class: "Mage",
        race: "Dragon",
        baseHp: 590,
        baseDamage: 115,
        baseDefense: 72,
        baseSpeed: 80,
        skillIds: getSkillsByClass("Mage"),
        growthRates: getGrowthRatesByClass("Mage", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 3 },
        assetPath: "/assets/3d/characters/firedragon/model/firedragon.glb",
    },
    {
        monsterId: "monster_087",
        name: "小狮子",
        rarity: "Common",
        class: "Warrior",
        race: "Beast",
        baseHp: 610,
        baseDamage: 105,
        baseDefense: 78,
        baseSpeed: 75,
        skillIds: getSkillsByClass("Warrior"),
        growthRates: getGrowthRatesByClass("Warrior", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/lion/model/lion.glb",
    },
    {
        monsterId: "monster_088",
        name: "小老虎",
        rarity: "Common",
        class: "Assassin",
        race: "Beast",
        baseHp: 580,
        baseDamage: 112,
        baseDefense: 70,
        baseSpeed: 85,
        skillIds: getSkillsByClass("Assassin"),
        growthRates: getGrowthRatesByClass("Assassin", "Common"),
        moveRange: 3,
        attackRange: { min: 1, max: 2 },
        assetPath: "/assets/3d/characters/tiger/model/tiger.glb",
    },
];

/**
 * 计算成长率（基于基础属性）
 */
function calculateGrowthRates(baseHp: number, baseDamage: number, baseDefense: number, baseSpeed: number) {
    return {
        hp: Math.floor(baseHp * 0.15), // 每级增长15%基础HP
        damage: Math.floor(baseDamage * 0.10), // 每级增长10%基础伤害
        defense: Math.floor(baseDefense * 0.12), // 每级增长12%基础防御
        speed: Math.floor(baseSpeed * 0.05), // 每级增长5%基础速度
    };
}

/**
 * 导出的怪物配置数据（Record格式）
 */
export const MONSTER_CONFIGS_MAP: Record<string, Monster> = (() => {
    const configMap: Record<string, Monster> = {};
    MONSTER_CONFIGS.forEach((config) => {
        configMap[config.monsterId] = config;
    });
    return configMap;
})();

/**
 * 获取所有怪物配置数组
 */
export function getAllMonsterConfigs(): Monster[] {
    return MONSTER_CONFIGS;
}

/**
 * 按稀有度获取怪物配置
 */
export function getMonsterConfigsByRarity(rarity: "Common" | "Rare" | "Epic" | "Legendary"): Monster[] {
    return MONSTER_CONFIGS.filter((config) => config.rarity === rarity);
}