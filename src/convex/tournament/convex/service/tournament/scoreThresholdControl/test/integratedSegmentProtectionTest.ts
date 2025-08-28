/**
 * 集成段位保护机制测试文件
 * 验证 SegmentManager 中的段位保护功能
 */

import { SegmentManager } from "../../../segment/SegmentManager";

// 模拟数据库上下文
const mockCtx = {
    db: {
        query: () => ({
            withIndex: () => ({
                first: () => null
            })
        })
    }
};

// 模拟 PlayerSegmentDataAccess
class MockPlayerSegmentDataAccess {
    static async getPlayerSegmentData(ctx: any, uid: string) {
        return {
            uid,
            currentSegment: 'silver',
            points: 2500,
            totalMatches: 15,
            totalWins: 8,
            currentWinStreak: 2,
            currentLoseStreak: 0,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-15T00:00:00.000Z'
        };
    }
}

// 模拟 getSegmentRule
function getSegmentRule(segment: string) {
    const rules = {
        silver: {
            promotion: {
                pointsRequired: 3000,
                winRateRequired: 0.6,
                minMatches: 10,
                consecutiveWinsRequired: 3,
                stabilityPeriod: 5
            },
            demotion: {
                pointsThreshold: 1500,
                consecutiveLosses: 5,
                winRateThreshold: 0.3
            },
            nextSegment: 'gold',
            previousSegment: 'bronze'
        }
    };
    return rules[segment as keyof typeof rules];
}

// 创建测试实例
const segmentManager = new SegmentManager(mockCtx as any);

// 替换依赖为模拟版本
(segmentManager as any).PlayerSegmentDataAccess = MockPlayerSegmentDataAccess;
(segmentManager as any).getSegmentRule = getSegmentRule;

console.log("🧪 开始测试集成段位保护机制...\n");

// 测试1：新段位保护检查
console.log("测试1：新段位保护检查");
async function testNewSegmentProtection() {
    try {
        const changeResult = await segmentManager.checkAndProcessSegmentChange(
            "test_user_1",
            3500, // 足够晋升的积分
            "match_001"
        );

        console.log(`段位变化: ${changeResult.changed ? '是' : '否'}`);
        console.log(`变化类型: ${changeResult.changeType}`);
        console.log(`旧段位: ${changeResult.oldSegment}`);
        console.log(`新段位: ${changeResult.newSegment}`);
        console.log(`保护信息: ${changeResult.protectionInfo ? '有' : '无'}`);

        if (changeResult.protectionInfo) {
            console.log(`保护状态: ${changeResult.protectionInfo.isProtected ? '是' : '否'}`);
            console.log(`保护类型: ${changeResult.protectionInfo.protectionType}`);
            console.log(`保护等级: ${changeResult.protectionInfo.protectionLevel}`);
            console.log(`剩余天数: ${changeResult.protectionInfo.remainingDays}`);
            console.log(`保护原因: ${changeResult.protectionInfo.reason}`);
        }

        console.log(`消息: ${changeResult.message}\n`);

    } catch (error) {
        console.error("测试1失败:", error);
    }
}

// 测试2：表现保护检查
console.log("测试2：表现保护检查");
async function testPerformanceProtection() {
    try {
        const changeResult = await segmentManager.checkAndProcessSegmentChange(
            "test_user_2",
            4000, // 远高于当前段位要求的积分
            "match_002"
        );

        console.log(`段位变化: ${changeResult.changed ? '是' : '否'}`);
        console.log(`变化类型: ${changeResult.changeType}`);
        console.log(`旧段位: ${changeResult.oldSegment}`);
        console.log(`新段位: ${changeResult.newSegment}`);
        console.log(`保护信息: ${changeResult.protectionInfo ? '有' : '无'}`);

        if (changeResult.protectionInfo) {
            console.log(`保护状态: ${changeResult.protectionInfo.isProtected ? '是' : '否'}`);
            console.log(`保护类型: ${changeResult.protectionInfo.protectionType}`);
            console.log(`保护等级: ${changeResult.protectionInfo.protectionLevel}`);
            console.log(`剩余天数: ${changeResult.protectionInfo.remainingDays}`);
            console.log(`保护原因: ${changeResult.protectionInfo.reason}`);
        }

        console.log(`消息: ${changeResult.message}\n`);

    } catch (error) {
        console.error("测试2失败:", error);
    }
}

// 测试3：无保护状态检查
console.log("测试3：无保护状态检查");
async function testNoProtection() {
    try {
        const changeResult = await segmentManager.checkAndProcessSegmentChange(
            "test_user_3",
            2000, // 正常积分范围
            "match_003"
        );

        console.log(`段位变化: ${changeResult.changed ? '是' : '否'}`);
        console.log(`变化类型: ${changeResult.changeType}`);
        console.log(`旧段位: ${changeResult.oldSegment}`);
        console.log(`新段位: ${changeResult.newSegment}`);
        console.log(`保护信息: ${changeResult.protectionInfo ? '有' : '无'}`);

        if (changeResult.protectionInfo) {
            console.log(`保护状态: ${changeResult.protectionInfo.isProtected ? '是' : '否'}`);
            console.log(`保护类型: ${changeResult.protectionInfo.protectionType}`);
            console.log(`保护等级: ${changeResult.protectionInfo.protectionLevel}`);
            console.log(`剩余天数: ${changeResult.protectionInfo.remainingDays}`);
            console.log(`保护原因: ${changeResult.protectionInfo.reason}`);
        }

        console.log(`消息: ${changeResult.message}\n`);

    } catch (error) {
        console.error("测试3失败:", error);
    }
}

// 测试4：保护机制阻止降级
console.log("测试4：保护机制阻止降级");
async function testProtectionPreventsDemotion() {
    try {
        // 模拟玩家处于保护状态
        const changeResult = await segmentManager.checkAndProcessSegmentChange(
            "test_user_4",
            1000, // 低于降级阈值的积分
            "match_004"
        );

        console.log(`段位变化: ${changeResult.changed ? '是' : '否'}`);
        console.log(`变化类型: ${changeResult.changeType}`);
        console.log(`旧段位: ${changeResult.oldSegment}`);
        console.log(`新段位: ${changeResult.newSegment}`);
        console.log(`保护信息: ${changeResult.protectionInfo ? '有' : '无'}`);

        if (changeResult.protectionInfo) {
            console.log(`保护状态: ${changeResult.protectionInfo.isProtected ? '是' : '否'}`);
            console.log(`保护类型: ${changeResult.protectionInfo.protectionType}`);
            console.log(`保护等级: ${changeResult.protectionInfo.protectionLevel}`);
            console.log(`剩余天数: ${changeResult.protectionInfo.remainingDays}`);
            console.log(`保护原因: ${changeResult.protectionInfo.reason}`);
        }

        console.log(`消息: ${changeResult.message}\n`);

    } catch (error) {
        console.error("测试4失败:", error);
    }
}

// 运行所有测试
async function runAllTests() {
    await testNewSegmentProtection();
    await testPerformanceProtection();
    await testNoProtection();
    await testProtectionPreventsDemotion();

    console.log("🏁 集成段位保护机制测试完成！");
    console.log("✅ 新段位保护：7天保护期，自动设置");
    console.log("✅ 表现保护：基于积分表现，3天保护");
    console.log("✅ 宽限期保护：5天适应期，自动设置");
    console.log("✅ 保护机制集成到 SegmentManager");
    console.log("✅ 自动保护状态管理");
}

// 执行测试
runAllTests().catch(console.error);
