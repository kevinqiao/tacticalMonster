/**
 * 全局消息码定义
 * 为整个项目提供统一的消息码和本地化支持
 */

// ==================== 消息码分类 ====================

/**
 * 成功消息 (10000-19999)
 */
export enum SuccessMessageCode {
    // 用户相关成功消息 (10000-10999)
    LOGIN_SUCCESS = 10001,
    LOGOUT_SUCCESS = 10002,
    REGISTRATION_SUCCESS = 10003,
    PROFILE_UPDATE_SUCCESS = 10004,
    PASSWORD_CHANGE_SUCCESS = 10005,
    EMAIL_VERIFICATION_SUCCESS = 10006,
    AVATAR_UPLOAD_SUCCESS = 10007,

    // 游戏相关成功消息 (11000-11999)
    GAME_JOIN_SUCCESS = 11001,
    GAME_LEAVE_SUCCESS = 11002,
    GAME_MOVE_SUCCESS = 11003,
    GAME_COMPLETE_SUCCESS = 11004,
    GAME_WIN_SUCCESS = 11005,

    // 锦标赛相关成功消息 (12000-12999)
    TOURNAMENT_JOIN_SUCCESS = 12001,
    TOURNAMENT_LEAVE_SUCCESS = 12002,
    SCORE_SUBMIT_SUCCESS = 12003,
    TOURNAMENT_COMPLETE_SUCCESS = 12004,
    REWARD_RECEIVED_SUCCESS = 12005,
    TOURNAMENT_CREATE_SUCCESS = 12006,

    // 道具和库存成功消息 (13000-13999)
    ITEM_PURCHASE_SUCCESS = 13001,
    ITEM_USE_SUCCESS = 13002,
    ITEM_TRADE_SUCCESS = 13003,
    COINS_RECEIVED_SUCCESS = 13004,
    GEMS_RECEIVED_SUCCESS = 13005,
    TICKETS_RECEIVED_SUCCESS = 13006,
    INVENTORY_UPDATE_SUCCESS = 13007,

    // 任务和成就成功消息 (14000-14999)
    TASK_COMPLETE_SUCCESS = 14001,
    TASK_REWARD_RECEIVED_SUCCESS = 14002,
    ACHIEVEMENT_UNLOCKED_SUCCESS = 14003,
    ACHIEVEMENT_REWARD_RECEIVED_SUCCESS = 14004,
    DAILY_REWARD_RECEIVED_SUCCESS = 14005,
    WEEKLY_REWARD_RECEIVED_SUCCESS = 14006,

    // 社交功能成功消息 (15000-15999)
    FRIEND_REQUEST_SENT_SUCCESS = 15001,
    FRIEND_REQUEST_ACCEPTED_SUCCESS = 15002,
    FRIEND_ADDED_SUCCESS = 15003,
    FRIEND_REMOVED_SUCCESS = 15004,
    CHAT_MESSAGE_SENT_SUCCESS = 15005,
    GUILD_JOIN_SUCCESS = 15006,
    GUILD_LEAVE_SUCCESS = 15007,
    GUILD_CREATE_SUCCESS = 15008,

    // 系统操作成功消息 (16000-16999)
    SETTINGS_SAVE_SUCCESS = 16001,
    DATA_SYNC_SUCCESS = 16002,
    FILE_UPLOAD_SUCCESS = 16003,
    FILE_DOWNLOAD_SUCCESS = 16004,
    BACKUP_CREATE_SUCCESS = 16005,
    RESTORE_SUCCESS = 16006,
}

/**
 * 信息提示消息 (20000-29999)
 */
export enum InfoMessageCode {
    // 系统信息 (20000-20999)
    SYSTEM_MAINTENANCE = 20001,
    SYSTEM_UPDATE = 20002,
    NEW_VERSION_AVAILABLE = 20003,
    CONNECTION_RESTORED = 20004,
    DATA_SYNCING = 20005,
    LOADING = 20006,
    PROCESSING = 20007,

    // 游戏信息 (21000-21999)
    GAME_LOADING = 21001,
    GAME_SAVING = 21002,
    GAME_PAUSED = 21003,
    GAME_RESUMED = 21004,
    TURN_CHANGED = 21005,
    GAME_TIMER_WARNING = 21006,

    // 锦标赛信息 (22000-22999)
    TOURNAMENT_STARTING = 22001,
    TOURNAMENT_ENDING = 22002,
    TOURNAMENT_FULL = 22003,
    TOURNAMENT_WAITING = 22004,
    TOURNAMENT_RANKING_UPDATED = 22005,
    TOURNAMENT_REWARDS_READY = 22006,

    // 社交信息 (23000-23999)
    FRIEND_ONLINE = 23001,
    FRIEND_OFFLINE = 23002,
    FRIEND_PLAYING = 23003,
    NEW_MESSAGE_RECEIVED = 23004,
    GUILD_ACTIVITY = 23005,
    GUILD_WAR_STARTING = 23006,

    // 通知信息 (24000-24999)
    NOTIFICATION_RECEIVED = 24001,
    EMAIL_VERIFICATION_SENT = 24002,
    PASSWORD_RESET_SENT = 24003,
    WELCOME_MESSAGE = 24004,
    TUTORIAL_AVAILABLE = 24005,
    HELP_AVAILABLE = 24006,
}

/**
 * 警告消息 (30000-39999)
 */
export enum WarningMessageCode {
    // 系统警告 (30000-30999)
    CONNECTION_UNSTABLE = 30001,
    LOW_BATTERY = 30002,
    STORAGE_LOW = 30003,
    MEMORY_LOW = 30004,
    NETWORK_SLOW = 30005,

    // 游戏警告 (31000-31999)
    GAME_UNSAVED_CHANGES = 31001,
    GAME_TIMEOUT_WARNING = 31002,
    GAME_DISCONNECT_WARNING = 31003,
    GAME_PERFORMANCE_ISSUE = 31004,

    // 锦标赛警告 (32000-32999)
    TOURNAMENT_ENDING_SOON = 32001,
    TOURNAMENT_FULL_WARNING = 32002,
    TOURNAMENT_LEAVE_WARNING = 32003,
    TOURNAMENT_REWARD_EXPIRING = 32004,

    // 道具警告 (33000-33999)
    INVENTORY_ALMOST_FULL = 33001,
    ITEM_EXPIRING_SOON = 33002,
    CURRENCY_LOW = 33003,
    PREMIUM_FEATURE_WARNING = 33004,

    // 社交警告 (34000-34999)
    FRIEND_REQUEST_PENDING = 34001,
    GUILD_INACTIVITY_WARNING = 34002,
    CHAT_SPAM_WARNING = 34003,
    PRIVACY_SETTING_WARNING = 34004,
}

/**
 * 确认消息 (40000-49999)
 */
export enum ConfirmMessageCode {
    // 操作确认 (40000-40999)
    CONFIRM_DELETE = 40001,
    CONFIRM_LEAVE = 40002,
    CONFIRM_PURCHASE = 40003,
    CONFIRM_TRADE = 40004,
    CONFIRM_RESET = 40005,
    CONFIRM_LOGOUT = 40006,

    // 游戏确认 (41000-41999)
    CONFIRM_GAME_LEAVE = 41001,
    CONFIRM_GAME_RESTART = 41002,
    CONFIRM_GAME_SURRENDER = 41003,
    CONFIRM_GAME_SAVE = 41004,

    // 锦标赛确认 (42000-42999)
    CONFIRM_TOURNAMENT_JOIN = 42001,
    CONFIRM_TOURNAMENT_LEAVE = 42002,
    CONFIRM_SCORE_SUBMIT = 42003,
    CONFIRM_REWARD_CLAIM = 42004,

    // 社交确认 (43000-43999)
    CONFIRM_FRIEND_REMOVE = 43001,
    CONFIRM_GUILD_LEAVE = 43002,
    CONFIRM_MESSAGE_DELETE = 43003,
    CONFIRM_BLOCK_USER = 43004,
}

/**
 * 消息码联合类型
 */
export type MessageCode =
    | SuccessMessageCode
    | InfoMessageCode
    | WarningMessageCode
    | ConfirmMessageCode;

// ==================== 本地化消息信息 ====================

export const MessageTexts = {
    // 中文
    'zh-CN': {
        // 成功消息
        [SuccessMessageCode.LOGIN_SUCCESS]: '登录成功',
        [SuccessMessageCode.LOGOUT_SUCCESS]: '已安全退出登录',
        [SuccessMessageCode.REGISTRATION_SUCCESS]: '注册成功，欢迎加入！',
        [SuccessMessageCode.PROFILE_UPDATE_SUCCESS]: '个人资料更新成功',
        [SuccessMessageCode.PASSWORD_CHANGE_SUCCESS]: '密码修改成功',
        [SuccessMessageCode.EMAIL_VERIFICATION_SUCCESS]: '邮箱验证成功',
        [SuccessMessageCode.AVATAR_UPLOAD_SUCCESS]: '头像上传成功',

        [SuccessMessageCode.GAME_JOIN_SUCCESS]: '成功加入游戏',
        [SuccessMessageCode.GAME_LEAVE_SUCCESS]: '已离开游戏',
        [SuccessMessageCode.GAME_MOVE_SUCCESS]: '操作成功',
        [SuccessMessageCode.GAME_COMPLETE_SUCCESS]: '游戏完成！',
        [SuccessMessageCode.GAME_WIN_SUCCESS]: '恭喜获胜！',

        [SuccessMessageCode.TOURNAMENT_JOIN_SUCCESS]: '成功加入锦标赛',
        [SuccessMessageCode.TOURNAMENT_LEAVE_SUCCESS]: '已离开锦标赛',
        [SuccessMessageCode.SCORE_SUBMIT_SUCCESS]: '分数提交成功',
        [SuccessMessageCode.TOURNAMENT_COMPLETE_SUCCESS]: '锦标赛完成！',
        [SuccessMessageCode.REWARD_RECEIVED_SUCCESS]: '获得奖励：{reward}',
        [SuccessMessageCode.TOURNAMENT_CREATE_SUCCESS]: '锦标赛创建成功',

        [SuccessMessageCode.ITEM_PURCHASE_SUCCESS]: '购买成功：{itemName}',
        [SuccessMessageCode.ITEM_USE_SUCCESS]: '道具使用成功：{itemName}',
        [SuccessMessageCode.ITEM_TRADE_SUCCESS]: '交易成功',
        [SuccessMessageCode.COINS_RECEIVED_SUCCESS]: '获得 {amount} 金币',
        [SuccessMessageCode.GEMS_RECEIVED_SUCCESS]: '获得 {amount} 宝石',
        [SuccessMessageCode.TICKETS_RECEIVED_SUCCESS]: '获得 {amount} 张门票',
        [SuccessMessageCode.INVENTORY_UPDATE_SUCCESS]: '背包更新成功',

        [SuccessMessageCode.TASK_COMPLETE_SUCCESS]: '任务完成：{taskName}',
        [SuccessMessageCode.TASK_REWARD_RECEIVED_SUCCESS]: '任务奖励已领取',
        [SuccessMessageCode.ACHIEVEMENT_UNLOCKED_SUCCESS]: '解锁成就：{achievementName}',
        [SuccessMessageCode.ACHIEVEMENT_REWARD_RECEIVED_SUCCESS]: '成就奖励已领取',
        [SuccessMessageCode.DAILY_REWARD_RECEIVED_SUCCESS]: '每日奖励已领取',
        [SuccessMessageCode.WEEKLY_REWARD_RECEIVED_SUCCESS]: '每周奖励已领取',

        [SuccessMessageCode.FRIEND_REQUEST_SENT_SUCCESS]: '好友请求已发送',
        [SuccessMessageCode.FRIEND_REQUEST_ACCEPTED_SUCCESS]: '好友请求已接受',
        [SuccessMessageCode.FRIEND_ADDED_SUCCESS]: '好友添加成功',
        [SuccessMessageCode.FRIEND_REMOVED_SUCCESS]: '好友已移除',
        [SuccessMessageCode.CHAT_MESSAGE_SENT_SUCCESS]: '消息发送成功',
        [SuccessMessageCode.GUILD_JOIN_SUCCESS]: '成功加入公会',
        [SuccessMessageCode.GUILD_LEAVE_SUCCESS]: '已离开公会',
        [SuccessMessageCode.GUILD_CREATE_SUCCESS]: '公会创建成功',

        [SuccessMessageCode.SETTINGS_SAVE_SUCCESS]: '设置保存成功',
        [SuccessMessageCode.DATA_SYNC_SUCCESS]: '数据同步成功',
        [SuccessMessageCode.FILE_UPLOAD_SUCCESS]: '文件上传成功',
        [SuccessMessageCode.FILE_DOWNLOAD_SUCCESS]: '文件下载成功',
        [SuccessMessageCode.BACKUP_CREATE_SUCCESS]: '备份创建成功',
        [SuccessMessageCode.RESTORE_SUCCESS]: '数据恢复成功',

        // 信息提示消息
        [InfoMessageCode.SYSTEM_MAINTENANCE]: '系统维护中，请稍后再试',
        [InfoMessageCode.SYSTEM_UPDATE]: '系统更新中，请稍候',
        [InfoMessageCode.NEW_VERSION_AVAILABLE]: '有新版本可用，建议更新',
        [InfoMessageCode.CONNECTION_RESTORED]: '网络连接已恢复',
        [InfoMessageCode.DATA_SYNCING]: '数据同步中...',
        [InfoMessageCode.LOADING]: '加载中...',
        [InfoMessageCode.PROCESSING]: '处理中...',

        [InfoMessageCode.GAME_LOADING]: '游戏加载中...',
        [InfoMessageCode.GAME_SAVING]: '游戏保存中...',
        [InfoMessageCode.GAME_PAUSED]: '游戏已暂停',
        [InfoMessageCode.GAME_RESUMED]: '游戏已恢复',
        [InfoMessageCode.TURN_CHANGED]: '轮到 {playerName} 的回合',
        [InfoMessageCode.GAME_TIMER_WARNING]: '剩余时间：{time}',

        [InfoMessageCode.TOURNAMENT_STARTING]: '锦标赛即将开始',
        [InfoMessageCode.TOURNAMENT_ENDING]: '锦标赛即将结束',
        [InfoMessageCode.TOURNAMENT_FULL]: '锦标赛已满员',
        [InfoMessageCode.TOURNAMENT_WAITING]: '等待其他玩家加入...',
        [InfoMessageCode.TOURNAMENT_RANKING_UPDATED]: '排行榜已更新',
        [InfoMessageCode.TOURNAMENT_REWARDS_READY]: '奖励已准备就绪',

        [InfoMessageCode.FRIEND_ONLINE]: '{friendName} 上线了',
        [InfoMessageCode.FRIEND_OFFLINE]: '{friendName} 下线了',
        [InfoMessageCode.FRIEND_PLAYING]: '{friendName} 正在游戏中',
        [InfoMessageCode.NEW_MESSAGE_RECEIVED]: '收到新消息',
        [InfoMessageCode.GUILD_ACTIVITY]: '公会新活动：{activity}',
        [InfoMessageCode.GUILD_WAR_STARTING]: '公会战即将开始',

        [InfoMessageCode.NOTIFICATION_RECEIVED]: '收到新通知',
        [InfoMessageCode.EMAIL_VERIFICATION_SENT]: '验证邮件已发送',
        [InfoMessageCode.PASSWORD_RESET_SENT]: '密码重置邮件已发送',
        [InfoMessageCode.WELCOME_MESSAGE]: '欢迎回来，{username}！',
        [InfoMessageCode.TUTORIAL_AVAILABLE]: '新手教程可用',
        [InfoMessageCode.HELP_AVAILABLE]: '帮助文档可用',

        // 警告消息
        [WarningMessageCode.CONNECTION_UNSTABLE]: '网络连接不稳定',
        [WarningMessageCode.LOW_BATTERY]: '电量不足，建议充电',
        [WarningMessageCode.STORAGE_LOW]: '存储空间不足',
        [WarningMessageCode.MEMORY_LOW]: '内存不足',
        [WarningMessageCode.NETWORK_SLOW]: '网络速度较慢',

        [WarningMessageCode.GAME_UNSAVED_CHANGES]: '有未保存的游戏进度',
        [WarningMessageCode.GAME_TIMEOUT_WARNING]: '游戏即将超时',
        [WarningMessageCode.GAME_DISCONNECT_WARNING]: '网络连接可能断开',
        [WarningMessageCode.GAME_PERFORMANCE_ISSUE]: '游戏性能可能受影响',

        [WarningMessageCode.TOURNAMENT_ENDING_SOON]: '锦标赛即将结束',
        [WarningMessageCode.TOURNAMENT_FULL_WARNING]: '锦标赛即将满员',
        [WarningMessageCode.TOURNAMENT_LEAVE_WARNING]: '离开后将无法重新加入',
        [WarningMessageCode.TOURNAMENT_REWARD_EXPIRING]: '奖励即将过期',

        [WarningMessageCode.INVENTORY_ALMOST_FULL]: '背包即将满员',
        [WarningMessageCode.ITEM_EXPIRING_SOON]: '道具即将过期：{itemName}',
        [WarningMessageCode.CURRENCY_LOW]: '金币不足，建议充值',
        [WarningMessageCode.PREMIUM_FEATURE_WARNING]: '此功能需要会员',

        [WarningMessageCode.FRIEND_REQUEST_PENDING]: '有未处理的好友请求',
        [WarningMessageCode.GUILD_INACTIVITY_WARNING]: '公会长期无活动',
        [WarningMessageCode.CHAT_SPAM_WARNING]: '消息发送过于频繁',
        [WarningMessageCode.PRIVACY_SETTING_WARNING]: '隐私设置已更改',

        // 确认消息
        [ConfirmMessageCode.CONFIRM_DELETE]: '确定要删除吗？此操作不可撤销',
        [ConfirmMessageCode.CONFIRM_LEAVE]: '确定要离开吗？',
        [ConfirmMessageCode.CONFIRM_PURCHASE]: '确定要购买 {itemName} 吗？',
        [ConfirmMessageCode.CONFIRM_TRADE]: '确定要进行此交易吗？',
        [ConfirmMessageCode.CONFIRM_RESET]: '确定要重置吗？所有数据将丢失',
        [ConfirmMessageCode.CONFIRM_LOGOUT]: '确定要退出登录吗？',

        [ConfirmMessageCode.CONFIRM_GAME_LEAVE]: '确定要离开游戏吗？当前进度将丢失',
        [ConfirmMessageCode.CONFIRM_GAME_RESTART]: '确定要重新开始游戏吗？',
        [ConfirmMessageCode.CONFIRM_GAME_SURRENDER]: '确定要认输吗？',
        [ConfirmMessageCode.CONFIRM_GAME_SAVE]: '确定要保存游戏进度吗？',

        [ConfirmMessageCode.CONFIRM_TOURNAMENT_JOIN]: '确定要加入锦标赛吗？需要消耗 {cost}',
        [ConfirmMessageCode.CONFIRM_TOURNAMENT_LEAVE]: '确定要离开锦标赛吗？',
        [ConfirmMessageCode.CONFIRM_SCORE_SUBMIT]: '确定要提交分数吗？',
        [ConfirmMessageCode.CONFIRM_REWARD_CLAIM]: '确定要领取奖励吗？',

        [ConfirmMessageCode.CONFIRM_FRIEND_REMOVE]: '确定要删除好友 {friendName} 吗？',
        [ConfirmMessageCode.CONFIRM_GUILD_LEAVE]: '确定要离开公会吗？',
        [ConfirmMessageCode.CONFIRM_MESSAGE_DELETE]: '确定要删除此消息吗？',
        [ConfirmMessageCode.CONFIRM_BLOCK_USER]: '确定要屏蔽用户 {username} 吗？',
    },

    // 英文
    'en-US': {
        // Success messages
        [SuccessMessageCode.LOGIN_SUCCESS]: 'Login successful',
        [SuccessMessageCode.LOGOUT_SUCCESS]: 'Logged out successfully',
        [SuccessMessageCode.REGISTRATION_SUCCESS]: 'Registration successful, welcome!',
        [SuccessMessageCode.PROFILE_UPDATE_SUCCESS]: 'Profile updated successfully',
        [SuccessMessageCode.PASSWORD_CHANGE_SUCCESS]: 'Password changed successfully',
        [SuccessMessageCode.EMAIL_VERIFICATION_SUCCESS]: 'Email verified successfully',
        [SuccessMessageCode.AVATAR_UPLOAD_SUCCESS]: 'Avatar uploaded successfully',

        [SuccessMessageCode.GAME_JOIN_SUCCESS]: 'Successfully joined game',
        [SuccessMessageCode.GAME_LEAVE_SUCCESS]: 'Left game successfully',
        [SuccessMessageCode.GAME_MOVE_SUCCESS]: 'Move successful',
        [SuccessMessageCode.GAME_COMPLETE_SUCCESS]: 'Game completed!',
        [SuccessMessageCode.GAME_WIN_SUCCESS]: 'Congratulations! You won!',

        [SuccessMessageCode.TOURNAMENT_JOIN_SUCCESS]: 'Successfully joined tournament',
        [SuccessMessageCode.TOURNAMENT_LEAVE_SUCCESS]: 'Left tournament successfully',
        [SuccessMessageCode.SCORE_SUBMIT_SUCCESS]: 'Score submitted successfully',
        [SuccessMessageCode.TOURNAMENT_COMPLETE_SUCCESS]: 'Tournament completed!',
        [SuccessMessageCode.REWARD_RECEIVED_SUCCESS]: 'Reward received: {reward}',
        [SuccessMessageCode.TOURNAMENT_CREATE_SUCCESS]: 'Tournament created successfully',

        [SuccessMessageCode.ITEM_PURCHASE_SUCCESS]: 'Purchase successful: {itemName}',
        [SuccessMessageCode.ITEM_USE_SUCCESS]: 'Item used successfully: {itemName}',
        [SuccessMessageCode.ITEM_TRADE_SUCCESS]: 'Trade successful',
        [SuccessMessageCode.COINS_RECEIVED_SUCCESS]: 'Received {amount} coins',
        [SuccessMessageCode.GEMS_RECEIVED_SUCCESS]: 'Received {amount} gems',
        [SuccessMessageCode.TICKETS_RECEIVED_SUCCESS]: 'Received {amount} tickets',
        [SuccessMessageCode.INVENTORY_UPDATE_SUCCESS]: 'Inventory updated successfully',

        [SuccessMessageCode.TASK_COMPLETE_SUCCESS]: 'Task completed: {taskName}',
        [SuccessMessageCode.TASK_REWARD_RECEIVED_SUCCESS]: 'Task reward claimed',
        [SuccessMessageCode.ACHIEVEMENT_UNLOCKED_SUCCESS]: 'Achievement unlocked: {achievementName}',
        [SuccessMessageCode.ACHIEVEMENT_REWARD_RECEIVED_SUCCESS]: 'Achievement reward claimed',
        [SuccessMessageCode.DAILY_REWARD_RECEIVED_SUCCESS]: 'Daily reward claimed',
        [SuccessMessageCode.WEEKLY_REWARD_RECEIVED_SUCCESS]: 'Weekly reward claimed',

        [SuccessMessageCode.FRIEND_REQUEST_SENT_SUCCESS]: 'Friend request sent',
        [SuccessMessageCode.FRIEND_REQUEST_ACCEPTED_SUCCESS]: 'Friend request accepted',
        [SuccessMessageCode.FRIEND_ADDED_SUCCESS]: 'Friend added successfully',
        [SuccessMessageCode.FRIEND_REMOVED_SUCCESS]: 'Friend removed',
        [SuccessMessageCode.CHAT_MESSAGE_SENT_SUCCESS]: 'Message sent successfully',
        [SuccessMessageCode.GUILD_JOIN_SUCCESS]: 'Successfully joined guild',
        [SuccessMessageCode.GUILD_LEAVE_SUCCESS]: 'Left guild successfully',
        [SuccessMessageCode.GUILD_CREATE_SUCCESS]: 'Guild created successfully',

        [SuccessMessageCode.SETTINGS_SAVE_SUCCESS]: 'Settings saved successfully',
        [SuccessMessageCode.DATA_SYNC_SUCCESS]: 'Data synced successfully',
        [SuccessMessageCode.FILE_UPLOAD_SUCCESS]: 'File uploaded successfully',
        [SuccessMessageCode.FILE_DOWNLOAD_SUCCESS]: 'File downloaded successfully',
        [SuccessMessageCode.BACKUP_CREATE_SUCCESS]: 'Backup created successfully',
        [SuccessMessageCode.RESTORE_SUCCESS]: 'Data restored successfully',

        // Info messages
        [InfoMessageCode.SYSTEM_MAINTENANCE]: 'System maintenance in progress, please try again later',
        [InfoMessageCode.SYSTEM_UPDATE]: 'System updating, please wait',
        [InfoMessageCode.NEW_VERSION_AVAILABLE]: 'New version available, recommended to update',
        [InfoMessageCode.CONNECTION_RESTORED]: 'Network connection restored',
        [InfoMessageCode.DATA_SYNCING]: 'Syncing data...',
        [InfoMessageCode.LOADING]: 'Loading...',
        [InfoMessageCode.PROCESSING]: 'Processing...',

        [InfoMessageCode.GAME_LOADING]: 'Loading game...',
        [InfoMessageCode.GAME_SAVING]: 'Saving game...',
        [InfoMessageCode.GAME_PAUSED]: 'Game paused',
        [InfoMessageCode.GAME_RESUMED]: 'Game resumed',
        [InfoMessageCode.TURN_CHANGED]: "It's {playerName}'s turn",
        [InfoMessageCode.GAME_TIMER_WARNING]: 'Time remaining: {time}',

        [InfoMessageCode.TOURNAMENT_STARTING]: 'Tournament starting soon',
        [InfoMessageCode.TOURNAMENT_ENDING]: 'Tournament ending soon',
        [InfoMessageCode.TOURNAMENT_FULL]: 'Tournament is full',
        [InfoMessageCode.TOURNAMENT_WAITING]: 'Waiting for other players...',
        [InfoMessageCode.TOURNAMENT_RANKING_UPDATED]: 'Rankings updated',
        [InfoMessageCode.TOURNAMENT_REWARDS_READY]: 'Rewards ready',

        [InfoMessageCode.FRIEND_ONLINE]: '{friendName} is online',
        [InfoMessageCode.FRIEND_OFFLINE]: '{friendName} is offline',
        [InfoMessageCode.FRIEND_PLAYING]: '{friendName} is playing',
        [InfoMessageCode.NEW_MESSAGE_RECEIVED]: 'New message received',
        [InfoMessageCode.GUILD_ACTIVITY]: 'New guild activity: {activity}',
        [InfoMessageCode.GUILD_WAR_STARTING]: 'Guild war starting soon',

        [InfoMessageCode.NOTIFICATION_RECEIVED]: 'New notification received',
        [InfoMessageCode.EMAIL_VERIFICATION_SENT]: 'Verification email sent',
        [InfoMessageCode.PASSWORD_RESET_SENT]: 'Password reset email sent',
        [InfoMessageCode.WELCOME_MESSAGE]: 'Welcome back, {username}!',
        [InfoMessageCode.TUTORIAL_AVAILABLE]: 'Tutorial available',
        [InfoMessageCode.HELP_AVAILABLE]: 'Help documentation available',

        // Warning messages
        [WarningMessageCode.CONNECTION_UNSTABLE]: 'Unstable network connection',
        [WarningMessageCode.LOW_BATTERY]: 'Low battery, consider charging',
        [WarningMessageCode.STORAGE_LOW]: 'Low storage space',
        [WarningMessageCode.MEMORY_LOW]: 'Low memory',
        [WarningMessageCode.NETWORK_SLOW]: 'Slow network connection',

        [WarningMessageCode.GAME_UNSAVED_CHANGES]: 'Unsaved game progress',
        [WarningMessageCode.GAME_TIMEOUT_WARNING]: 'Game timeout warning',
        [WarningMessageCode.GAME_DISCONNECT_WARNING]: 'Network may disconnect',
        [WarningMessageCode.GAME_PERFORMANCE_ISSUE]: 'Game performance may be affected',

        [WarningMessageCode.TOURNAMENT_ENDING_SOON]: 'Tournament ending soon',
        [WarningMessageCode.TOURNAMENT_FULL_WARNING]: 'Tournament almost full',
        [WarningMessageCode.TOURNAMENT_LEAVE_WARNING]: 'Cannot rejoin after leaving',
        [WarningMessageCode.TOURNAMENT_REWARD_EXPIRING]: 'Rewards expiring soon',

        [WarningMessageCode.INVENTORY_ALMOST_FULL]: 'Inventory almost full',
        [WarningMessageCode.ITEM_EXPIRING_SOON]: 'Item expiring soon: {itemName}',
        [WarningMessageCode.CURRENCY_LOW]: 'Low coins, consider purchasing',
        [WarningMessageCode.PREMIUM_FEATURE_WARNING]: 'Premium feature requires subscription',

        [WarningMessageCode.FRIEND_REQUEST_PENDING]: 'Pending friend requests',
        [WarningMessageCode.GUILD_INACTIVITY_WARNING]: 'Guild inactive for long time',
        [WarningMessageCode.CHAT_SPAM_WARNING]: 'Sending messages too frequently',
        [WarningMessageCode.PRIVACY_SETTING_WARNING]: 'Privacy settings changed',

        // Confirm messages
        [ConfirmMessageCode.CONFIRM_DELETE]: 'Are you sure you want to delete? This action cannot be undone',
        [ConfirmMessageCode.CONFIRM_LEAVE]: 'Are you sure you want to leave?',
        [ConfirmMessageCode.CONFIRM_PURCHASE]: 'Are you sure you want to purchase {itemName}?',
        [ConfirmMessageCode.CONFIRM_TRADE]: 'Are you sure you want to make this trade?',
        [ConfirmMessageCode.CONFIRM_RESET]: 'Are you sure you want to reset? All data will be lost',
        [ConfirmMessageCode.CONFIRM_LOGOUT]: 'Are you sure you want to logout?',

        [ConfirmMessageCode.CONFIRM_GAME_LEAVE]: 'Are you sure you want to leave the game? Current progress will be lost',
        [ConfirmMessageCode.CONFIRM_GAME_RESTART]: 'Are you sure you want to restart the game?',
        [ConfirmMessageCode.CONFIRM_GAME_SURRENDER]: 'Are you sure you want to surrender?',
        [ConfirmMessageCode.CONFIRM_GAME_SAVE]: 'Are you sure you want to save the game?',

        [ConfirmMessageCode.CONFIRM_TOURNAMENT_JOIN]: 'Are you sure you want to join the tournament? Cost: {cost}',
        [ConfirmMessageCode.CONFIRM_TOURNAMENT_LEAVE]: 'Are you sure you want to leave the tournament?',
        [ConfirmMessageCode.CONFIRM_SCORE_SUBMIT]: 'Are you sure you want to submit your score?',
        [ConfirmMessageCode.CONFIRM_REWARD_CLAIM]: 'Are you sure you want to claim the reward?',

        [ConfirmMessageCode.CONFIRM_FRIEND_REMOVE]: 'Are you sure you want to remove {friendName}?',
        [ConfirmMessageCode.CONFIRM_GUILD_LEAVE]: 'Are you sure you want to leave the guild?',
        [ConfirmMessageCode.CONFIRM_MESSAGE_DELETE]: 'Are you sure you want to delete this message?',
        [ConfirmMessageCode.CONFIRM_BLOCK_USER]: 'Are you sure you want to block {username}?',
    }
}; 