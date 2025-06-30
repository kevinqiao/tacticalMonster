/**
 * Schema迁移助手
 * 帮助从单一schema文件迁移到模块化结构
 */


/**
 * 表分类规则
 * 根据表名和字段自动分类到相应模块
 */
const tableClassificationRules = {
    user: {
        patterns: ['user', 'player'],
        tables: ['users', 'user_preferences', 'user_statistics', 'user_achievements'],
    },
    tournament: {
        patterns: ['tournament', 'match', 'season'],
        tables: ['tournaments', 'tournament_types', 'matches', 'seasons'],
    },
    segment: {
        patterns: ['segment', 'leaderboard', 'rank'],
        tables: ['segments', 'player_segments', 'leaderboards'],
    },
    prop: {
        patterns: ['prop', 'inventory', 'coin'],
        tables: ['inventories', 'prop_usage_logs', 'prop_distribution_logs'],
    },
    ticket: {
        patterns: ['ticket', 'bundle'],
        tables: ['ticket_templates', 'player_tickets', 'ticket_bundles'],
    },
    task: {
        patterns: ['task', 'achievement'],
        tables: ['tasks', 'player_tasks', 'achievement_tasks'],
    },
};

/**
 * 分析表结构并建议模块分类
 */
export function analyzeTableForModule(tableName: string, tableFields: Record<string, any>): string {
    const fieldNames = Object.keys(tableFields).join(' ').toLowerCase();
    const tableNameLower = tableName.toLowerCase();

    // 计算每个模块的匹配分数
    const scores: Record<string, number> = {};

    Object.entries(tableClassificationRules).forEach(([moduleName, rules]) => {
        let score = 0;

        // 检查表名模式匹配
        rules.patterns.forEach(pattern => {
            if (tableNameLower.includes(pattern)) {
                score += 2;
            }
        });

        // 检查字段名模式匹配
        rules.patterns.forEach(pattern => {
            if (fieldNames.includes(pattern)) {
                score += 1;
            }
        });

        // 检查精确表名匹配
        if (rules.tables.includes(tableName)) {
            score += 5;
        }

        scores[moduleName] = score;
    });

    // 返回得分最高的模块
    const bestModule = Object.entries(scores).reduce((a, b) =>
        scores[a[0]] > scores[b[0]] ? a : b
    )[0];

    return bestModule;
}

/**
 * 生成模块化schema代码
 */
export function generateModularSchemaCode(
    tableName: string,
    tableFields: Record<string, any>,
    moduleName: string
): string {
    const fieldDefinitions = Object.entries(tableFields)
        .map(([fieldName, fieldType]) => `    ${fieldName}: ${fieldType},`)
        .join('\n');

    return `  ${tableName}: defineTable({
${fieldDefinitions}
  }),`;
}

/**
 * 验证模块化schema的完整性
 */
export function validateModularSchema(modules: Record<string, any>): {
    isValid: boolean;
    issues: string[];
} {
    const issues: string[] = [];

    // 检查是否有重复的表名
    const allTableNames = new Set<string>();
    Object.entries(modules).forEach(([moduleName, moduleSchema]) => {
        Object.keys(moduleSchema).forEach(tableName => {
            if (allTableNames.has(tableName)) {
                issues.push(`重复的表名: ${tableName}`);
            } else {
                allTableNames.add(tableName);
            }
        });
    });

    // 检查是否有空的模块
    Object.entries(modules).forEach(([moduleName, moduleSchema]) => {
        if (Object.keys(moduleSchema).length === 0) {
            issues.push(`空模块: ${moduleName}`);
        }
    });

    return {
        isValid: issues.length === 0,
        issues,
    };
}

/**
 * 生成迁移报告
 */
export function generateMigrationReport(
    originalTables: Record<string, any>,
    modularTables: Record<string, Record<string, any>>
): {
    summary: {
        totalTables: number;
        modulesCreated: number;
        tablesMigrated: number;
    };
    details: {
        moduleName: string;
        tables: string[];
        tableCount: number;
    }[];
} {
    const totalTables = Object.keys(originalTables).length;
    const modulesCreated = Object.keys(modularTables).length;
    const tablesMigrated = Object.values(modularTables)
        .reduce((sum, module) => sum + Object.keys(module).length, 0);

    const details = Object.entries(modularTables).map(([moduleName, moduleTables]) => ({
        moduleName,
        tables: Object.keys(moduleTables),
        tableCount: Object.keys(moduleTables).length,
    }));

    return {
        summary: {
            totalTables,
            modulesCreated,
            tablesMigrated,
        },
        details,
    };
}

/**
 * 示例：如何迁移单个表
 */
export function migrateTableExample() {
    // 原始表定义
    const originalTable = {
        uid: "v.string()",
        email: "v.string()",
        displayName: "v.string()",
        createdAt: "v.string()",
    };

    // 分析应该属于哪个模块
    const suggestedModule = analyzeTableForModule("users", originalTable);
    console.log(`表 'users' 建议分类到模块: ${suggestedModule}`);

    // 生成模块化代码
    const modularCode = generateModularSchemaCode("users", originalTable, suggestedModule);
    console.log("生成的模块化代码:");
    console.log(modularCode);
}

// 使用示例：
// migrateTableExample(); 