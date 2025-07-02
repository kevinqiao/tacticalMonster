/**
 * 简单的 Mock 测试 - 用于验证 Mock 上下文是否正常工作
 */

import { query } from "../../../_generated/server";
import { TournamentTestUtils } from "./testUtils";

/**
 * 简单 Mock 测试 - 不依赖动态导入
 */
export const testSimpleMock = query({
    args: {},
    handler: async (ctx) => {
        try {
            console.log("🧪 开始简单 Mock 测试...");

            // 创建 Mock 上下文
            const mockCtx = TournamentTestUtils.createMockContext();
            console.log("✅ Mock 上下文创建成功");

            // 设置默认 Mock
            mockCtx.setupDefaultMocks();
            console.log("✅ 默认 Mock 设置完成");

            // 测试玩家查询
            const playerQuery = mockCtx.db.query("players");
            console.log("✅ 玩家查询创建成功:", typeof playerQuery);

            if (!playerQuery) {
                throw new Error("玩家查询对象为空");
            }

            const queryResult = playerQuery.withIndex("by_uid");
            console.log("✅ 查询索引创建成功:", typeof queryResult);

            if (!queryResult) {
                throw new Error("查询索引对象为空");
            }

            const playerResult = await queryResult.first();
            console.log("✅ 玩家查询结果:", playerResult);

            if (!playerResult) {
                throw new Error("玩家查询结果为空");
            }

            if (!playerResult.uid) {
                throw new Error("玩家查询结果缺少 uid 字段");
            }

            // 测试认证
            const identity = await mockCtx.auth.getUserIdentity();
            console.log("✅ 用户身份:", identity);

            if (!identity) {
                throw new Error("用户身份为空");
            }

            if (!identity.subject) {
                throw new Error("用户身份缺少 subject 字段");
            }

            // 测试数据库操作
            const insertResult = await mockCtx.db.insert("players", { uid: "test" });
            console.log("✅ 插入结果:", insertResult);

            if (!insertResult) {
                throw new Error("插入操作返回空结果");
            }

            const patchResult = await mockCtx.db.patch("player1", { name: "test" });
            console.log("✅ 更新结果:", patchResult);

            if (!patchResult) {
                throw new Error("更新操作返回空结果");
            }

            return {
                success: true,
                message: "简单 Mock 测试通过",
                results: {
                    playerQuery: typeof playerQuery,
                    playerResult: playerResult ? "存在" : "不存在",
                    playerUid: playerResult?.uid || "无",
                    identity: identity ? "存在" : "不存在",
                    identitySubject: identity?.subject || "无",
                    insertResult: insertResult ? "成功" : "失败",
                    patchResult: patchResult ? "成功" : "失败"
                }
            };

        } catch (error) {
            console.error("❌ 简单 Mock 测试失败:", error);
            return {
                success: false,
                message: `简单 Mock 测试失败: ${error instanceof Error ? error.message : "未知错误"}`,
                error: error instanceof Error ? error.stack : "未知错误",
                debugInfo: {
                    errorType: error instanceof Error ? error.constructor.name : typeof error,
                    errorMessage: error instanceof Error ? error.message : String(error)
                }
            };
        }
    }
});

/**
 * 测试 Mock 框架基础功能
 */
export const testMockFramework = query({
    args: {},
    handler: async (ctx) => {
        try {
            console.log("🧪 测试 Mock 框架基础功能...");

            // 测试 TournamentTestUtils 是否可用
            if (typeof TournamentTestUtils === 'undefined') {
                throw new Error("TournamentTestUtils 未定义");
            }

            if (typeof TournamentTestUtils.createMockContext !== 'function') {
                throw new Error("TournamentTestUtils.createMockContext 不是函数");
            }

            // 创建 Mock 上下文
            const mockCtx = TournamentTestUtils.createMockContext();
            console.log("✅ Mock 上下文创建成功");

            // 检查基本属性
            if (!mockCtx) {
                throw new Error("Mock 上下文为空");
            }

            if (!mockCtx.db) {
                throw new Error("Mock 数据库为空");
            }

            if (!mockCtx.auth) {
                throw new Error("Mock 认证为空");
            }

            if (typeof mockCtx.setupDefaultMocks !== 'function') {
                throw new Error("setupDefaultMocks 不是函数");
            }

            // 设置默认 Mock
            mockCtx.setupDefaultMocks();
            console.log("✅ 默认 Mock 设置完成");

            return {
                success: true,
                message: "Mock 框架基础功能测试通过",
                results: {
                    TournamentTestUtils: typeof TournamentTestUtils,
                    createMockContext: typeof TournamentTestUtils.createMockContext,
                    mockCtx: mockCtx ? "创建成功" : "创建失败",
                    mockDb: mockCtx?.db ? "存在" : "不存在",
                    mockAuth: mockCtx?.auth ? "存在" : "不存在",
                    setupDefaultMocks: typeof mockCtx?.setupDefaultMocks
                }
            };

        } catch (error) {
            console.error("❌ Mock 框架基础功能测试失败:", error);
            return {
                success: false,
                message: `Mock 框架基础功能测试失败: ${error instanceof Error ? error.message : "未知错误"}`,
                error: error instanceof Error ? error.stack : "未知错误"
            };
        }
    }
}); 