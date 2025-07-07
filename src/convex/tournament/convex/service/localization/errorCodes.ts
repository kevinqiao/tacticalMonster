/**
 * 全局错误码定义
 * 为整个项目提供统一的错误码和本地化支持
 */

// ==================== 错误码分类 ====================

/**
 * 用户相关错误 (1000-1999)
 */
export enum UserErrorCode {
    // 认证错误 (1000-1099)
    AUTHENTICATION_FAILED = 1001,
    TOKEN_EXPIRED = 1002,
    TOKEN_INVALID = 1003,
    LOGIN_REQUIRED = 1004,
    PERMISSION_DENIED = 1005,
    ACCOUNT_LOCKED = 1006,
    ACCOUNT_DISABLED = 1007,

    // 用户信息错误 (1100-1199)
    USER_NOT_FOUND = 1101,
    USER_ALREADY_EXISTS = 1102,
    INVALID_USERNAME = 1103,
    INVALID_EMAIL = 1104,
    INVALID_PASSWORD = 1105,
    PASSWORD_TOO_WEAK = 1106,
    EMAIL_ALREADY_REGISTERED = 1107,

    // 用户操作错误 (1200-1299)
    PROFILE_UPDATE_FAILED = 1201,
    AVATAR_UPLOAD_FAILED = 1202,
    PASSWORD_CHANGE_FAILED = 1203,
    EMAIL_VERIFICATION_FAILED = 1204,
}

/**
 * 游戏相关错误 (2000-2999)
 */
export enum GameErrorCode {
    // 游戏基础错误 (2000-2099)
    GAME_NOT_FOUND = 2001,
    GAME_ALREADY_STARTED = 2002,
    GAME_ALREADY_ENDED = 2003,
    GAME_FULL = 2004,
    GAME_INVALID_STATE = 2005,

    // 游戏操作错误 (2100-2199)
    INVALID_MOVE = 2101,
    NOT_YOUR_TURN = 2102,
    GAME_TIMEOUT = 2103,
    INVALID_GAME_DATA = 2104,
    GAME_ACTION_FAILED = 2105,

    // 游戏配置错误 (2200-2299)
    INVALID_GAME_CONFIG = 2201,
    GAME_TYPE_NOT_SUPPORTED = 2202,
    GAME_MODE_INVALID = 2203,
}

/**
 * 锦标赛相关错误 (3000-3999)
 */
export enum TournamentErrorCode {
    // 参赛资格错误 (3000-3099)
    INSUFFICIENT_COINS = 3001,
    INSUFFICIENT_TICKETS = 3002,
    SEGMENT_TOO_LOW = 3003,
    SEGMENT_TOO_HIGH = 3004,
    SUBSCRIPTION_REQUIRED = 3005,
    MAX_ATTEMPTS_REACHED = 3006,
    TOURNAMENT_NOT_FOUND = 3007,
    PLAYER_NOT_FOUND = 3008,
    SEASON_NOT_ACTIVE = 3009,

    // 比赛相关错误 (3100-3199)
    MATCH_NOT_FOUND = 3101,
    MATCH_ALREADY_COMPLETED = 3102,
    INVALID_SCORE = 3103,
    GAME_DATA_INVALID = 3104,
    MATCH_JOIN_FAILED = 3105,
    MATCH_LEAVE_FAILED = 3106,

    // 锦标赛管理错误 (3200-3299)
    TOURNAMENT_CREATION_FAILED = 3201,
    TOURNAMENT_UPDATE_FAILED = 3202,
    TOURNAMENT_SETTLEMENT_FAILED = 3203,
    REWARD_DISTRIBUTION_FAILED = 3204,
}

/**
 * 道具和库存错误 (4000-4999)
 */
export enum InventoryErrorCode {
    // 道具错误 (4000-4099)
    ITEM_NOT_FOUND = 4001,
    INSUFFICIENT_ITEMS = 4002,
    ITEM_USE_FAILED = 4003,
    ITEM_PURCHASE_FAILED = 4004,
    ITEM_TRADE_FAILED = 4005,
    INVALID_ITEM_TYPE = 4006,

    // 货币错误 (4100-4199)
    INSUFFICIENT_COINS = 4101,
    INSUFFICIENT_GEMS = 4102,
    INSUFFICIENT_TICKETS = 4103,
    CURRENCY_TRANSACTION_FAILED = 4104,

    // 库存操作错误 (4200-4299)
    INVENTORY_FULL = 4201,
    INVENTORY_UPDATE_FAILED = 4202,
    INVENTORY_SYNC_FAILED = 4203,
}

/**
 * 任务和成就错误 (5000-5999)
 */
export enum TaskErrorCode {
    // 任务错误 (5000-5099)
    TASK_NOT_FOUND = 5001,
    TASK_ALREADY_COMPLETED = 5002,
    TASK_NOT_AVAILABLE = 5003,
    TASK_PROGRESS_INVALID = 5004,
    TASK_REWARD_FAILED = 5005,

    // 成就错误 (5100-5199)
    ACHIEVEMENT_NOT_FOUND = 5101,
    ACHIEVEMENT_ALREADY_UNLOCKED = 5102,
    ACHIEVEMENT_PROGRESS_INVALID = 5103,
    ACHIEVEMENT_REWARD_FAILED = 5104,
}

/**
 * 社交功能错误 (6000-6999)
 */
export enum SocialErrorCode {
    // 好友系统错误 (6000-6099)
    FRIEND_REQUEST_FAILED = 6001,
    FRIEND_ALREADY_EXISTS = 6002,
    FRIEND_NOT_FOUND = 6003,
    FRIEND_LIST_FULL = 6004,
    FRIEND_REMOVE_FAILED = 6005,

    // 聊天系统错误 (6100-6199)
    CHAT_MESSAGE_FAILED = 6101,
    CHAT_ROOM_NOT_FOUND = 6102,
    CHAT_PERMISSION_DENIED = 6103,
    CHAT_MESSAGE_TOO_LONG = 6104,

    // 公会系统错误 (6200-6299)
    GUILD_NOT_FOUND = 6201,
    GUILD_ALREADY_EXISTS = 6202,
    GUILD_JOIN_FAILED = 6203,
    GUILD_LEAVE_FAILED = 6204,
    GUILD_PERMISSION_DENIED = 6205,
}

/**
 * 系统错误 (7000-7999)
 */
export enum SystemErrorCode {
    // 数据库错误 (7000-7099)
    DATABASE_CONNECTION_FAILED = 7001,
    DATABASE_QUERY_FAILED = 7002,
    DATABASE_TRANSACTION_FAILED = 7003,
    DATA_NOT_FOUND = 7004,
    DATA_UPDATE_FAILED = 7005,
    DATA_DELETE_FAILED = 7006,

    // 网络错误 (7100-7199)
    NETWORK_TIMEOUT = 7101,
    NETWORK_CONNECTION_FAILED = 7102,
    API_RATE_LIMIT_EXCEEDED = 7103,
    EXTERNAL_SERVICE_UNAVAILABLE = 7104,

    // 配置错误 (7200-7299)
    CONFIGURATION_ERROR = 7201,
    CONFIG_KEY_NOT_FOUND = 7202,
    CONFIG_VALUE_INVALID = 7203,

    // 文件操作错误 (7300-7399)
    FILE_UPLOAD_FAILED = 7301,
    FILE_DOWNLOAD_FAILED = 7302,
    FILE_NOT_FOUND = 7303,
    FILE_SIZE_TOO_LARGE = 7304,
    FILE_TYPE_NOT_SUPPORTED = 7305,
}

/**
 * 验证错误 (8000-8999)
 */
export enum ValidationErrorCode {
    // 输入验证错误 (8000-8099)
    REQUIRED_FIELD_MISSING = 8001,
    INVALID_FORMAT = 8002,
    FIELD_TOO_LONG = 8003,
    FIELD_TOO_SHORT = 8004,
    INVALID_VALUE = 8005,
    DUPLICATE_VALUE = 8006,

    // 业务验证错误 (8100-8199)
    BUSINESS_RULE_VIOLATION = 8101,
    INVALID_STATE_TRANSITION = 8102,
    CONSTRAINT_VIOLATION = 8103,
}

/**
 * 通用错误 (9000-9999)
 */
export enum CommonErrorCode {
    UNKNOWN_ERROR = 9999,
    INTERNAL_SERVER_ERROR = 9001,
    SERVICE_UNAVAILABLE = 9002,
    BAD_REQUEST = 9003,
    NOT_FOUND = 9004,
    METHOD_NOT_ALLOWED = 9005,
    REQUEST_TIMEOUT = 9006,
    TOO_MANY_REQUESTS = 9007,
}

// ==================== 错误码联合类型 ====================

export type ErrorCode =
    | UserErrorCode
    | GameErrorCode
    | TournamentErrorCode
    | InventoryErrorCode
    | TaskErrorCode
    | SocialErrorCode
    | SystemErrorCode
    | ValidationErrorCode
    | CommonErrorCode;

// ==================== 本地化错误信息 ====================

export const ErrorMessages = {
    // 中文
    'zh-CN': {
        // 用户相关错误
        [UserErrorCode.AUTHENTICATION_FAILED]: '认证失败，请重新登录',
        [UserErrorCode.TOKEN_EXPIRED]: '登录已过期，请重新登录',
        [UserErrorCode.TOKEN_INVALID]: '登录凭证无效',
        [UserErrorCode.LOGIN_REQUIRED]: '请先登录',
        [UserErrorCode.PERMISSION_DENIED]: '权限不足，无法执行此操作',
        [UserErrorCode.ACCOUNT_LOCKED]: '账户已被锁定',
        [UserErrorCode.ACCOUNT_DISABLED]: '账户已被禁用',
        [UserErrorCode.USER_NOT_FOUND]: '用户不存在 (UID: {uid})',
        [UserErrorCode.USER_ALREADY_EXISTS]: '用户已存在',
        [UserErrorCode.INVALID_USERNAME]: '用户名格式无效',
        [UserErrorCode.INVALID_EMAIL]: '邮箱格式无效',
        [UserErrorCode.INVALID_PASSWORD]: '密码格式无效',
        [UserErrorCode.PASSWORD_TOO_WEAK]: '密码强度不足',
        [UserErrorCode.EMAIL_ALREADY_REGISTERED]: '邮箱已被注册',
        [UserErrorCode.PROFILE_UPDATE_FAILED]: '个人资料更新失败',
        [UserErrorCode.AVATAR_UPLOAD_FAILED]: '头像上传失败',
        [UserErrorCode.PASSWORD_CHANGE_FAILED]: '密码修改失败',
        [UserErrorCode.EMAIL_VERIFICATION_FAILED]: '邮箱验证失败',

        // 游戏相关错误
        [GameErrorCode.GAME_NOT_FOUND]: '游戏不存在 (ID: {gameId})',
        [GameErrorCode.GAME_ALREADY_STARTED]: '游戏已开始',
        [GameErrorCode.GAME_ALREADY_ENDED]: '游戏已结束',
        [GameErrorCode.GAME_FULL]: '游戏房间已满',
        [GameErrorCode.GAME_INVALID_STATE]: '游戏状态无效',
        [GameErrorCode.INVALID_MOVE]: '无效的操作',
        [GameErrorCode.NOT_YOUR_TURN]: '不是你的回合',
        [GameErrorCode.GAME_TIMEOUT]: '游戏超时',
        [GameErrorCode.INVALID_GAME_DATA]: '游戏数据无效: {reason}',
        [GameErrorCode.GAME_ACTION_FAILED]: '游戏操作失败',
        [GameErrorCode.INVALID_GAME_CONFIG]: '游戏配置无效',
        [GameErrorCode.GAME_TYPE_NOT_SUPPORTED]: '不支持的游戏类型: {gameType}',
        [GameErrorCode.GAME_MODE_INVALID]: '无效的游戏模式',

        // 锦标赛相关错误
        [TournamentErrorCode.INSUFFICIENT_COINS]: '金币不足，需要 {required} 金币，当前只有 {current} 金币',
        [TournamentErrorCode.INSUFFICIENT_TICKETS]: '门票不足，需要 {required} 张 {gameType} 门票，当前只有 {current} 张',
        [TournamentErrorCode.SEGMENT_TOO_LOW]: '段位过低，需要至少 {required} 段位，当前为 {current} 段位',
        [TournamentErrorCode.SEGMENT_TOO_HIGH]: '段位过高，不能超过 {required} 段位，当前为 {current} 段位',
        [TournamentErrorCode.SUBSCRIPTION_REQUIRED]: '需要订阅会员才能参与此锦标赛',
        [TournamentErrorCode.MAX_ATTEMPTS_REACHED]: '已达到{timeRange}最大尝试次数 ({currentAttempts}/{maxAttempts})',
        [TournamentErrorCode.TOURNAMENT_NOT_FOUND]: '锦标赛不存在 (ID: {tournamentId})',
        [TournamentErrorCode.PLAYER_NOT_FOUND]: '玩家不存在 (UID: {uid})',
        [TournamentErrorCode.SEASON_NOT_ACTIVE]: '当前无活跃赛季',
        [TournamentErrorCode.MATCH_NOT_FOUND]: '比赛不存在 (ID: {matchId})',
        [TournamentErrorCode.MATCH_ALREADY_COMPLETED]: '比赛已完成 (ID: {matchId})',
        [TournamentErrorCode.INVALID_SCORE]: '无效的分数 {score}，应在 {minScore}-{maxScore} 范围内',
        [TournamentErrorCode.GAME_DATA_INVALID]: '游戏数据无效: {reason}',
        [TournamentErrorCode.MATCH_JOIN_FAILED]: '加入比赛失败',
        [TournamentErrorCode.MATCH_LEAVE_FAILED]: '离开比赛失败',
        [TournamentErrorCode.TOURNAMENT_CREATION_FAILED]: '锦标赛创建失败',
        [TournamentErrorCode.TOURNAMENT_UPDATE_FAILED]: '锦标赛更新失败',
        [TournamentErrorCode.TOURNAMENT_SETTLEMENT_FAILED]: '锦标赛结算失败',
        [TournamentErrorCode.REWARD_DISTRIBUTION_FAILED]: '奖励发放失败',

        // 道具和库存错误
        [InventoryErrorCode.ITEM_NOT_FOUND]: '道具不存在 (ID: {itemId})',
        [InventoryErrorCode.INSUFFICIENT_ITEMS]: '道具数量不足，需要 {required} 个，当前只有 {current} 个',
        [InventoryErrorCode.ITEM_USE_FAILED]: '道具使用失败',
        [InventoryErrorCode.ITEM_PURCHASE_FAILED]: '道具购买失败',
        [InventoryErrorCode.ITEM_TRADE_FAILED]: '道具交易失败',
        [InventoryErrorCode.INVALID_ITEM_TYPE]: '无效的道具类型: {itemType}',
        [InventoryErrorCode.INSUFFICIENT_COINS]: '金币不足，需要 {required} 金币，当前只有 {current} 金币',
        [InventoryErrorCode.INSUFFICIENT_GEMS]: '宝石不足，需要 {required} 宝石，当前只有 {current} 宝石',
        [InventoryErrorCode.INSUFFICIENT_TICKETS]: '门票不足，需要 {required} 张，当前只有 {current} 张',
        [InventoryErrorCode.CURRENCY_TRANSACTION_FAILED]: '货币交易失败',
        [InventoryErrorCode.INVENTORY_FULL]: '背包已满',
        [InventoryErrorCode.INVENTORY_UPDATE_FAILED]: '背包更新失败',
        [InventoryErrorCode.INVENTORY_SYNC_FAILED]: '背包同步失败',

        // 任务和成就错误
        [TaskErrorCode.TASK_NOT_FOUND]: '任务不存在 (ID: {taskId})',
        [TaskErrorCode.TASK_ALREADY_COMPLETED]: '任务已完成',
        [TaskErrorCode.TASK_NOT_AVAILABLE]: '任务不可用',
        [TaskErrorCode.TASK_PROGRESS_INVALID]: '任务进度无效',
        [TaskErrorCode.TASK_REWARD_FAILED]: '任务奖励发放失败',
        [TaskErrorCode.ACHIEVEMENT_NOT_FOUND]: '成就不存在 (ID: {achievementId})',
        [TaskErrorCode.ACHIEVEMENT_ALREADY_UNLOCKED]: '成就已解锁',
        [TaskErrorCode.ACHIEVEMENT_PROGRESS_INVALID]: '成就进度无效',
        [TaskErrorCode.ACHIEVEMENT_REWARD_FAILED]: '成就奖励发放失败',

        // 社交功能错误
        [SocialErrorCode.FRIEND_REQUEST_FAILED]: '好友请求失败',
        [SocialErrorCode.FRIEND_ALREADY_EXISTS]: '已经是好友关系',
        [SocialErrorCode.FRIEND_NOT_FOUND]: '好友不存在',
        [SocialErrorCode.FRIEND_LIST_FULL]: '好友列表已满',
        [SocialErrorCode.FRIEND_REMOVE_FAILED]: '删除好友失败',
        [SocialErrorCode.CHAT_MESSAGE_FAILED]: '发送消息失败',
        [SocialErrorCode.CHAT_ROOM_NOT_FOUND]: '聊天室不存在',
        [SocialErrorCode.CHAT_PERMISSION_DENIED]: '无权限发送消息',
        [SocialErrorCode.CHAT_MESSAGE_TOO_LONG]: '消息内容过长',
        [SocialErrorCode.GUILD_NOT_FOUND]: '公会不存在',
        [SocialErrorCode.GUILD_ALREADY_EXISTS]: '公会已存在',
        [SocialErrorCode.GUILD_JOIN_FAILED]: '加入公会失败',
        [SocialErrorCode.GUILD_LEAVE_FAILED]: '离开公会失败',
        [SocialErrorCode.GUILD_PERMISSION_DENIED]: '公会权限不足',

        // 系统错误
        [SystemErrorCode.DATABASE_CONNECTION_FAILED]: '数据库连接失败',
        [SystemErrorCode.DATABASE_QUERY_FAILED]: '数据库查询失败: {operation}',
        [SystemErrorCode.DATABASE_TRANSACTION_FAILED]: '数据库事务失败',
        [SystemErrorCode.DATA_NOT_FOUND]: '数据不存在',
        [SystemErrorCode.DATA_UPDATE_FAILED]: '数据更新失败',
        [SystemErrorCode.DATA_DELETE_FAILED]: '数据删除失败',
        [SystemErrorCode.NETWORK_TIMEOUT]: '网络请求超时',
        [SystemErrorCode.NETWORK_CONNECTION_FAILED]: '网络连接失败',
        [SystemErrorCode.API_RATE_LIMIT_EXCEEDED]: '请求频率过高，请稍后再试',
        [SystemErrorCode.EXTERNAL_SERVICE_UNAVAILABLE]: '外部服务不可用',
        [SystemErrorCode.CONFIGURATION_ERROR]: '配置错误: {configKey}',
        [SystemErrorCode.CONFIG_KEY_NOT_FOUND]: '配置项不存在: {configKey}',
        [SystemErrorCode.CONFIG_VALUE_INVALID]: '配置值无效: {configKey}',
        [SystemErrorCode.FILE_UPLOAD_FAILED]: '文件上传失败',
        [SystemErrorCode.FILE_DOWNLOAD_FAILED]: '文件下载失败',
        [SystemErrorCode.FILE_NOT_FOUND]: '文件不存在',
        [SystemErrorCode.FILE_SIZE_TOO_LARGE]: '文件大小超过限制',
        [SystemErrorCode.FILE_TYPE_NOT_SUPPORTED]: '不支持的文件类型',

        // 验证错误
        [ValidationErrorCode.REQUIRED_FIELD_MISSING]: '必填字段缺失: {field}',
        [ValidationErrorCode.INVALID_FORMAT]: '格式无效: {field}',
        [ValidationErrorCode.FIELD_TOO_LONG]: '字段过长: {field}，最大长度 {maxLength}',
        [ValidationErrorCode.FIELD_TOO_SHORT]: '字段过短: {field}，最小长度 {minLength}',
        [ValidationErrorCode.INVALID_VALUE]: '无效的值: {field}',
        [ValidationErrorCode.DUPLICATE_VALUE]: '重复的值: {field}',
        [ValidationErrorCode.BUSINESS_RULE_VIOLATION]: '违反业务规则: {rule}',
        [ValidationErrorCode.INVALID_STATE_TRANSITION]: '无效的状态转换',
        [ValidationErrorCode.CONSTRAINT_VIOLATION]: '违反约束条件',

        // 通用错误
        [CommonErrorCode.UNKNOWN_ERROR]: '未知错误',
        [CommonErrorCode.INTERNAL_SERVER_ERROR]: '服务器内部错误',
        [CommonErrorCode.SERVICE_UNAVAILABLE]: '服务暂时不可用',
        [CommonErrorCode.BAD_REQUEST]: '请求参数错误',
        [CommonErrorCode.NOT_FOUND]: '资源不存在',
        [CommonErrorCode.METHOD_NOT_ALLOWED]: '请求方法不允许',
        [CommonErrorCode.REQUEST_TIMEOUT]: '请求超时',
        [CommonErrorCode.TOO_MANY_REQUESTS]: '请求过于频繁',
    },

    // 英文
    'en-US': {
        // User related errors
        [UserErrorCode.AUTHENTICATION_FAILED]: 'Authentication failed, please login again',
        [UserErrorCode.TOKEN_EXPIRED]: 'Login expired, please login again',
        [UserErrorCode.TOKEN_INVALID]: 'Invalid login credentials',
        [UserErrorCode.LOGIN_REQUIRED]: 'Please login first',
        [UserErrorCode.PERMISSION_DENIED]: 'Permission denied',
        [UserErrorCode.ACCOUNT_LOCKED]: 'Account is locked',
        [UserErrorCode.ACCOUNT_DISABLED]: 'Account is disabled',
        [UserErrorCode.USER_NOT_FOUND]: 'User not found (UID: {uid})',
        [UserErrorCode.USER_ALREADY_EXISTS]: 'User already exists',
        [UserErrorCode.INVALID_USERNAME]: 'Invalid username format',
        [UserErrorCode.INVALID_EMAIL]: 'Invalid email format',
        [UserErrorCode.INVALID_PASSWORD]: 'Invalid password format',
        [UserErrorCode.PASSWORD_TOO_WEAK]: 'Password too weak',
        [UserErrorCode.EMAIL_ALREADY_REGISTERED]: 'Email already registered',
        [UserErrorCode.PROFILE_UPDATE_FAILED]: 'Profile update failed',
        [UserErrorCode.AVATAR_UPLOAD_FAILED]: 'Avatar upload failed',
        [UserErrorCode.PASSWORD_CHANGE_FAILED]: 'Password change failed',
        [UserErrorCode.EMAIL_VERIFICATION_FAILED]: 'Email verification failed',

        // Game related errors
        [GameErrorCode.GAME_NOT_FOUND]: 'Game not found (ID: {gameId})',
        [GameErrorCode.GAME_ALREADY_STARTED]: 'Game already started',
        [GameErrorCode.GAME_ALREADY_ENDED]: 'Game already ended',
        [GameErrorCode.GAME_FULL]: 'Game room is full',
        [GameErrorCode.GAME_INVALID_STATE]: 'Invalid game state',
        [GameErrorCode.INVALID_MOVE]: 'Invalid move',
        [GameErrorCode.NOT_YOUR_TURN]: 'Not your turn',
        [GameErrorCode.GAME_TIMEOUT]: 'Game timeout',
        [GameErrorCode.INVALID_GAME_DATA]: 'Invalid game data: {reason}',
        [GameErrorCode.GAME_ACTION_FAILED]: 'Game action failed',
        [GameErrorCode.INVALID_GAME_CONFIG]: 'Invalid game configuration',
        [GameErrorCode.GAME_TYPE_NOT_SUPPORTED]: 'Unsupported game type: {gameType}',
        [GameErrorCode.GAME_MODE_INVALID]: 'Invalid game mode',

        // Tournament related errors
        [TournamentErrorCode.INSUFFICIENT_COINS]: 'Insufficient coins, need {required}, current: {current}',
        [TournamentErrorCode.INSUFFICIENT_TICKETS]: 'Insufficient tickets, need {required} {gameType} tickets, current: {current}',
        [TournamentErrorCode.SEGMENT_TOO_LOW]: 'Segment too low, need at least {required}, current: {current}',
        [TournamentErrorCode.SEGMENT_TOO_HIGH]: 'Segment too high, cannot exceed {required}, current: {current}',
        [TournamentErrorCode.SUBSCRIPTION_REQUIRED]: 'Subscription required for this tournament',
        [TournamentErrorCode.MAX_ATTEMPTS_REACHED]: 'Maximum {timeRange} attempts reached ({currentAttempts}/{maxAttempts})',
        [TournamentErrorCode.TOURNAMENT_NOT_FOUND]: 'Tournament not found (ID: {tournamentId})',
        [TournamentErrorCode.PLAYER_NOT_FOUND]: 'Player not found (UID: {uid})',
        [TournamentErrorCode.SEASON_NOT_ACTIVE]: 'No active season',
        [TournamentErrorCode.MATCH_NOT_FOUND]: 'Match not found (ID: {matchId})',
        [TournamentErrorCode.MATCH_ALREADY_COMPLETED]: 'Match already completed (ID: {matchId})',
        [TournamentErrorCode.INVALID_SCORE]: 'Invalid score {score}, should be between {minScore}-{maxScore}',
        [TournamentErrorCode.GAME_DATA_INVALID]: 'Invalid game data: {reason}',
        [TournamentErrorCode.MATCH_JOIN_FAILED]: 'Failed to join match',
        [TournamentErrorCode.MATCH_LEAVE_FAILED]: 'Failed to leave match',
        [TournamentErrorCode.TOURNAMENT_CREATION_FAILED]: 'Tournament creation failed',
        [TournamentErrorCode.TOURNAMENT_UPDATE_FAILED]: 'Tournament update failed',
        [TournamentErrorCode.TOURNAMENT_SETTLEMENT_FAILED]: 'Tournament settlement failed',
        [TournamentErrorCode.REWARD_DISTRIBUTION_FAILED]: 'Reward distribution failed',

        // Inventory related errors
        [InventoryErrorCode.ITEM_NOT_FOUND]: 'Item not found (ID: {itemId})',
        [InventoryErrorCode.INSUFFICIENT_ITEMS]: 'Insufficient items, need {required}, current: {current}',
        [InventoryErrorCode.ITEM_USE_FAILED]: 'Item use failed',
        [InventoryErrorCode.ITEM_PURCHASE_FAILED]: 'Item purchase failed',
        [InventoryErrorCode.ITEM_TRADE_FAILED]: 'Item trade failed',
        [InventoryErrorCode.INVALID_ITEM_TYPE]: 'Invalid item type: {itemType}',
        [InventoryErrorCode.INSUFFICIENT_COINS]: 'Insufficient coins, need {required}, current: {current}',
        [InventoryErrorCode.INSUFFICIENT_GEMS]: 'Insufficient gems, need {required}, current: {current}',
        [InventoryErrorCode.INSUFFICIENT_TICKETS]: 'Insufficient tickets, need {required}, current: {current}',
        [InventoryErrorCode.CURRENCY_TRANSACTION_FAILED]: 'Currency transaction failed',
        [InventoryErrorCode.INVENTORY_FULL]: 'Inventory is full',
        [InventoryErrorCode.INVENTORY_UPDATE_FAILED]: 'Inventory update failed',
        [InventoryErrorCode.INVENTORY_SYNC_FAILED]: 'Inventory sync failed',

        // Task and achievement errors
        [TaskErrorCode.TASK_NOT_FOUND]: 'Task not found (ID: {taskId})',
        [TaskErrorCode.TASK_ALREADY_COMPLETED]: 'Task already completed',
        [TaskErrorCode.TASK_NOT_AVAILABLE]: 'Task not available',
        [TaskErrorCode.TASK_PROGRESS_INVALID]: 'Invalid task progress',
        [TaskErrorCode.TASK_REWARD_FAILED]: 'Task reward failed',
        [TaskErrorCode.ACHIEVEMENT_NOT_FOUND]: 'Achievement not found (ID: {achievementId})',
        [TaskErrorCode.ACHIEVEMENT_ALREADY_UNLOCKED]: 'Achievement already unlocked',
        [TaskErrorCode.ACHIEVEMENT_PROGRESS_INVALID]: 'Invalid achievement progress',
        [TaskErrorCode.ACHIEVEMENT_REWARD_FAILED]: 'Achievement reward failed',

        // Social feature errors
        [SocialErrorCode.FRIEND_REQUEST_FAILED]: 'Friend request failed',
        [SocialErrorCode.FRIEND_ALREADY_EXISTS]: 'Already friends',
        [SocialErrorCode.FRIEND_NOT_FOUND]: 'Friend not found',
        [SocialErrorCode.FRIEND_LIST_FULL]: 'Friend list is full',
        [SocialErrorCode.FRIEND_REMOVE_FAILED]: 'Failed to remove friend',
        [SocialErrorCode.CHAT_MESSAGE_FAILED]: 'Failed to send message',
        [SocialErrorCode.CHAT_ROOM_NOT_FOUND]: 'Chat room not found',
        [SocialErrorCode.CHAT_PERMISSION_DENIED]: 'No permission to send message',
        [SocialErrorCode.CHAT_MESSAGE_TOO_LONG]: 'Message too long',
        [SocialErrorCode.GUILD_NOT_FOUND]: 'Guild not found',
        [SocialErrorCode.GUILD_ALREADY_EXISTS]: 'Guild already exists',
        [SocialErrorCode.GUILD_JOIN_FAILED]: 'Failed to join guild',
        [SocialErrorCode.GUILD_LEAVE_FAILED]: 'Failed to leave guild',
        [SocialErrorCode.GUILD_PERMISSION_DENIED]: 'Insufficient guild permission',

        // System errors
        [SystemErrorCode.DATABASE_CONNECTION_FAILED]: 'Database connection failed',
        [SystemErrorCode.DATABASE_QUERY_FAILED]: 'Database query failed: {operation}',
        [SystemErrorCode.DATABASE_TRANSACTION_FAILED]: 'Database transaction failed',
        [SystemErrorCode.DATA_NOT_FOUND]: 'Data not found',
        [SystemErrorCode.DATA_UPDATE_FAILED]: 'Data update failed',
        [SystemErrorCode.DATA_DELETE_FAILED]: 'Data delete failed',
        [SystemErrorCode.NETWORK_TIMEOUT]: 'Network timeout',
        [SystemErrorCode.NETWORK_CONNECTION_FAILED]: 'Network connection failed',
        [SystemErrorCode.API_RATE_LIMIT_EXCEEDED]: 'Too many requests, please try again later',
        [SystemErrorCode.EXTERNAL_SERVICE_UNAVAILABLE]: 'External service unavailable',
        [SystemErrorCode.CONFIGURATION_ERROR]: 'Configuration error: {configKey}',
        [SystemErrorCode.CONFIG_KEY_NOT_FOUND]: 'Configuration key not found: {configKey}',
        [SystemErrorCode.CONFIG_VALUE_INVALID]: 'Invalid configuration value: {configKey}',
        [SystemErrorCode.FILE_UPLOAD_FAILED]: 'File upload failed',
        [SystemErrorCode.FILE_DOWNLOAD_FAILED]: 'File download failed',
        [SystemErrorCode.FILE_NOT_FOUND]: 'File not found',
        [SystemErrorCode.FILE_SIZE_TOO_LARGE]: 'File size too large',
        [SystemErrorCode.FILE_TYPE_NOT_SUPPORTED]: 'Unsupported file type',

        // Validation errors
        [ValidationErrorCode.REQUIRED_FIELD_MISSING]: 'Required field missing: {field}',
        [ValidationErrorCode.INVALID_FORMAT]: 'Invalid format: {field}',
        [ValidationErrorCode.FIELD_TOO_LONG]: 'Field too long: {field}, max length {maxLength}',
        [ValidationErrorCode.FIELD_TOO_SHORT]: 'Field too short: {field}, min length {minLength}',
        [ValidationErrorCode.INVALID_VALUE]: 'Invalid value: {field}',
        [ValidationErrorCode.DUPLICATE_VALUE]: 'Duplicate value: {field}',
        [ValidationErrorCode.BUSINESS_RULE_VIOLATION]: 'Business rule violation: {rule}',
        [ValidationErrorCode.INVALID_STATE_TRANSITION]: 'Invalid state transition',
        [ValidationErrorCode.CONSTRAINT_VIOLATION]: 'Constraint violation',

        // Common errors
        [CommonErrorCode.UNKNOWN_ERROR]: 'Unknown error',
        [CommonErrorCode.INTERNAL_SERVER_ERROR]: 'Internal server error',
        [CommonErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
        [CommonErrorCode.BAD_REQUEST]: 'Bad request',
        [CommonErrorCode.NOT_FOUND]: 'Resource not found',
        [CommonErrorCode.METHOD_NOT_ALLOWED]: 'Method not allowed',
        [CommonErrorCode.REQUEST_TIMEOUT]: 'Request timeout',
        [CommonErrorCode.TOO_MANY_REQUESTS]: 'Too many requests',
    }
}; 