/**
 * 简单测试 - 验证 Mock 上下文修复
 */

import { query } from "../../../_generated/server";

export const testJestFunction = query({
    args: {},
    handler: async (ctx) => {
        try {
            console.log("🧪 测试 jest 函数...");

            // 导入 jest 函数
            const { jest } = await import("./simpleTestFramework");
            console.log("✅ jest 函数导入成功");

            // 创建 mock 函数
            const mockFn = jest().fn();
            console.log("✅ mock 函数创建成功");

            // 设置返回值
            mockFn.mockReturnValue("test_value");
            console.log("✅ mock 函数设置返回值成功");

            // 调用函数
            const result = mockFn("test_arg");
            console.log("✅ mock 函数调用成功，结果:", result);

            // 验证结果
            if (result !== "test_value") {
                throw new Error(`期望返回 "test_value"，但得到 "${result}"`);
            }

            return {
                success: true,
                message: "jest 函数测试通过",
                result: {
                    returnValue: result,
                    callCount: mockFn.mock.calls.length,
                    callArgs: mockFn.mock.calls[0]
                }
            };

        } catch (error) {
            console.error("❌ jest 函数测试失败:", error);
            return {
                success: false,
                message: `jest 函数测试失败: ${error instanceof Error ? error.message : "未知错误"}`,
                error: error instanceof Error ? error.stack : "未知错误"
            };
        }
    }
});

export const testSimpleMockContext = query({
    args: {},
    handler: async (ctx) => {
        try {
            console.log("🧪 测试简单 Mock 上下文...");

            // 导入必要的模块
            const { jest } = await import("./simpleTestFramework");
            const { TournamentTestUtils } = await import("./testUtils");

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

            return {
                success: true,
                message: "简单 Mock 上下文测试通过",
                result: {
                    playerQuery: typeof playerQuery,
                    playerResult: playerResult ? "存在" : "不存在",
                    playerUid: playerResult?.uid || "无"
                }
            };

        } catch (error) {
            console.error("❌ 简单 Mock 上下文测试失败:", error);
            return {
                success: false,
                message: `简单 Mock 上下文测试失败: ${error instanceof Error ? error.message : "未知错误"}`,
                error: error instanceof Error ? error.stack : "未知错误"
            };
        }
    }
}); 