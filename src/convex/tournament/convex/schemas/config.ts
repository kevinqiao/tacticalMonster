/**
 * Schema模块配置
 * 管理模块化schema的各种设置
 */

// 模块配置
export const MODULE_CONFIG = {
    // 模块顺序（在主schema中的显示顺序）
    moduleOrder: [
        'user',
        'tournament',
        'segment',
        'prop',
        'ticket',
        'task',
    ] as const,

    // 模块描述
    moduleDescriptions: {
        user: {
            name: '用户系统',
            description: '用户信息、偏好设置、统计数据等',
            color: '#4CAF50',
        },
        tournament: {
            name: '锦标赛系统',
            description: '锦标赛信息、比赛记录、参赛限制等',
            color: '#2196F3',
        },
        segment: {
            name: '段位系统',
            description: '段位定义、玩家段位、排行榜等',
            color: '#FF9800',
        },
        prop: {
            name: '道具系统',
            description: '道具库存、使用日志、分配记录等',
            color: '#9C27B0',
        },
        ticket: {
            name: '门票系统',
            description: '门票模板、玩家门票、交易记录等',
            color: '#F44336',
        },
        task: {
            name: '任务系统',
            description: '任务定义、玩家任务、进度记录等',
            color: '#607D8B',
        },
    } as const,

    // 表命名规范
    namingConventions: {
        // 表名使用下划线分隔
        tableName: 'snake_case',
        // 索引名使用描述性名称
        indexName: 'by_field1_field2',
        // 字段名使用下划线分隔
        fieldName: 'snake_case',
    },

    // 必需字段
    requiredFields: {
        // 所有表都应该有的字段
        common: ['createdAt', 'updatedAt'],
        // 用户相关表应该有的字段
        userRelated: ['uid'],
        // 游戏相关表应该有的字段
        gameRelated: ['gameType'],
    },

    // 索引规范
    indexPatterns: {
        // 用户相关索引
        user: 'by_uid',
        // 游戏相关索引
        game: 'by_gameType',
        // 时间相关索引
        time: 'by_createdAt',
        // 复合索引
        composite: 'by_field1_field2',
    },

    // 验证规则
    validation: {
        // 最大表数量 per 模块
        maxTablesPerModule: 20,
        // 最大索引数量 per 表
        maxIndexesPerTable: 5,
        // 必需的表名前缀
        requiredTablePrefixes: {
            user: ['user_', 'player_'],
            tournament: ['tournament_', 'match_', 'season_'],
            segment: ['segment_', 'leaderboard_'],
            prop: ['prop_', 'inventory_', 'coin_'],
            ticket: ['ticket_', 'bundle_'],
            task: ['task_', 'achievement_'],
        },
    },
};

// 模块文件路径配置
export const MODULE_PATHS = {
    baseDir: './schemas',
    files: {
        user: './userSchema.ts',
        tournament: './tournamentSchema.ts',
        segment: './segmentSchema.ts',
        prop: './propSchema.ts',
        ticket: './ticketSchema.ts',
        task: './taskSchema.ts',
    },
    mainSchema: '../schema.ts',
    index: './index.ts',
} as const;

// 开发工具配置
export const DEV_CONFIG = {
    // 是否启用自动验证
    enableAutoValidation: true,
    // 是否启用自动格式化
    enableAutoFormatting: true,
    // 是否启用类型检查
    enableTypeChecking: true,
    // 是否启用文档生成
    enableDocGeneration: true,
} as const;

// 获取模块信息
export function getModuleInfo(moduleName: keyof typeof MODULE_CONFIG.moduleDescriptions) {
    return MODULE_CONFIG.moduleDescriptions[moduleName];
}

// 获取所有模块信息
export function getAllModuleInfo() {
    return Object.entries(MODULE_CONFIG.moduleDescriptions).map(([key, info]) => ({
        key,
        ...info,
    }));
}

// 验证表名是否符合规范
export function validateTableName(tableName: string, moduleName: keyof typeof MODULE_CONFIG.validation.requiredTablePrefixes) {
    const prefixes = MODULE_CONFIG.validation.requiredTablePrefixes[moduleName];
    return prefixes.some(prefix => tableName.startsWith(prefix));
}

// 生成标准索引名
export function generateIndexName(fields: string[]) {
    return `by_${fields.join('_')}`;
}

// 检查必需字段
export function checkRequiredFields(fields: string[], tableType: 'common' | 'userRelated' | 'gameRelated') {
    const required = MODULE_CONFIG.requiredFields[tableType];
    return required.every(field => fields.includes(field));
} 