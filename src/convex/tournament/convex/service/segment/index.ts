/**
 * 段位系统主入口文件
 * 导出所有段位相关的函数和类型
 */

// 导出所有 Convex 函数
export * from "./segmentFunctions";

// 导出锦标赛集成函数
export * from "./tournamentIntegrationFunctions";

// 导出测试函数
export * from "./segmentSystemTest";

// 导出核心类
export { SegmentManager } from "./SegmentManager";
export { TournamentSegmentIntegration } from "./tournamentIntegration";

// 导出类型定义
export * from "./types";

// 导出配置
export * from "./config";

// 导出数据访问层
export * from "./dataAccess";
