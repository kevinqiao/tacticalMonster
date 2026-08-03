/**
 * Boss 配置数据
 * 支持Boss角色组合（Boss本体 + 小怪/护卫）
 * 
 * 设计说明：
 * - BossConfig 的主体通过 monsterId 引用角色配置（从 monsterConfigs.ts 读取）
 * - 基础属性（HP、攻击、防御、速度、技能、资源路径等）从角色配置继承
 * - BossConfig 只定义 Boss 特有的属性（行为树、阶段、难度等）
 * - 可选覆盖属性可以覆盖继承的属性（提供时优先使用）
 * - 注意：Monster 配置直接从配置文件读取，不存数据库
 */
export interface Boss {
    bossId: string;
    monsterId: string;
    name: string;
    hp: number;
    damage: number;
    defense: number;
    speed: number;
    skills?: any[];
    assetPath: string;
    position?: {
        q: number;
        r: number;
    };
    minions: Array<{  // 小怪数据
        minionId: string;
        monsterId: string;
        hp: number;
        damage: number;
        defense: number;
        speed: number;
        skills?: any[];
        assetPath: string;
        position: {
            q: number;
            r: number;
        };
    }>;
}
export interface BossConfig {
    bossId: string;

    // 主体角色配置ID（引用 monsterConfigs.ts 配置文件）
    // 基础属性（HP、攻击、防御、速度、技能等）从引用的角色配置继承
    // 注意：Monster 配置直接从配置文件读取，不存数据库
    monsterId: string;

    // Boss 特有属性
    difficulty: "easy" | "medium" | "hard" | "expert";

    // Boss 专属配置
    behaviorTree: any;  // AI行为树配置

    // 可选覆盖属性（如果提供，将覆盖从 monsterId 引用的配置继承的属性）
    name?: string;           // 如果提供，覆盖角色配置的 name
    baseHp?: number;         // 如果提供，覆盖角色配置的 baseHp
    baseDamage?: number;     // 如果提供，覆盖角色配置的 baseDamage
    baseDefense?: number;    // 如果提供，覆盖角色配置的 baseDefense
    baseSpeed?: number;      // 如果提供，覆盖角色配置的 baseSpeed
    skills?: any[];          // 如果提供，覆盖或合并角色配置的 skills
    assetPath?: string;      // 如果提供，覆盖角色配置的 assetPath
    position?: {
        q: number;
        r: number;
    };

    // 新增：小怪/护卫配置（可选）
    // 如果不配置minions，则表示单个Boss
    minions?: MinionConfig[];

    // 新增：阶段配置（支持阶段化行为）
    phases?: BossPhase[];

    configVersion: number;
}

/**
 * 小怪配置接口
 * 
 * 设计说明：
 * - monsterId 引用角色配置（从 monsterConfigs.ts 读取）
 * - 基础属性从角色配置继承
 * - 可选覆盖属性可以覆盖继承的属性
 * - 注意：Monster 配置直接从配置文件读取，不存数据库
 */
export interface MinionConfig {
    minionId: string;          // 小怪唯一标识（如 "minion_guard_1"）
    monsterId: string;       // 角色配置ID（引用 monsterConfigs.ts 配置文件）  

    // 可选覆盖属性（如果提供，将覆盖从 monsterId 引用的配置继承的属性）
    name?: string;             // 如果提供，覆盖角色配置的 name
    baseHp?: number;           // 如果提供，覆盖角色配置的 baseHp
    baseDamage?: number;       // 如果提供，覆盖角色配置的 baseDamage
    baseDefense?: number;      // 如果提供，覆盖角色配置的 baseDefense
    baseSpeed?: number;        // 如果提供，覆盖角色配置的 baseSpeed
    skills?: any[];            // 如果提供，覆盖或合并角色配置的 skills
    assetPath?: string;        // 如果提供，覆盖角色配置的 assetPath
    position?: {
        q: number;
        r: number;
    };
}

/**
 * Boss阶段配置
 */
export interface BossPhase {
    phaseName: string;         // "phase1", "phase2", "phase3"
    hpThreshold: number;       // HP百分比阈值（1.0 = 100%, 0.6 = 60%）
    behaviorPattern: any;
    skillPriorities: any[];
    minionBehavior?: any;      // 小怪在此阶段的行为模式
}





