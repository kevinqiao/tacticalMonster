/**
 * 登录触发画像更新使用示例
 */

import { RankingRecommendationManagerOptimized } from '../RankingRecommendationManagerOptimized';
import { checkProfileUpdateNeeded, onUserLogin, updatePlayerProfileOnLogin } from '../services/loginTriggeredProfileUpdate';

/**
 * 示例1: 基本登录触发
 */
export async function basicLoginTriggerExample(ctx: any) {
    console.log('=== 基本登录触发示例 ===');

    const uid = 'player_001';

    // 模拟用户登录
    const loginResult = await ctx.runMutation(onUserLogin, {
        uid,
        loginData: {
            timestamp: new Date().toISOString(),
            deviceInfo: 'mobile_ios',
            loginMethod: 'oauth_google'
        }
    });

    console.log('登录结果:', loginResult);

    // 检查是否触发了画像更新
    if (loginResult.profileUpdateTriggered) {
        console.log(`玩家 ${uid} 的画像更新已触发`);
    } else {
        console.log(`玩家 ${uid} 的画像无需更新`);
    }

    return loginResult;
}

/**
 * 示例2: 检查更新需求
 */
export async function checkUpdateNeededExample(ctx: any) {
    console.log('=== 检查更新需求示例 ===');

    const testUsers = ['player_001', 'player_002', 'player_003'];

    for (const uid of testUsers) {
        const needsUpdate = await ctx.runQuery(checkProfileUpdateNeeded, { uid });
        console.log(`玩家 ${uid} 是否需要更新: ${needsUpdate}`);
    }
}

/**
 * 示例3: 直接触发画像更新
 */
export async function directProfileUpdateExample(ctx: any) {
    console.log('=== 直接触发画像更新示例 ===');

    const uid = 'player_001';

    try {
        const updateResult = await ctx.runMutation(updatePlayerProfileOnLogin, { uid });
        console.log('画像更新结果:', updateResult);

        return updateResult;
    } catch (error) {
        console.error('画像更新失败:', error);
        throw error;
    }
}

/**
 * 示例4: 批量用户登录处理
 */
export async function batchLoginProcessingExample(ctx: any) {
    console.log('=== 批量用户登录处理示例 ===');

    const users = [
        { uid: 'player_001', deviceInfo: 'mobile_android' },
        { uid: 'player_002', deviceInfo: 'desktop_web' },
        { uid: 'player_003', deviceInfo: 'mobile_ios' },
        { uid: 'player_004', deviceInfo: 'tablet_android' }
    ];

    const results = [];

    for (const user of users) {
        try {
            const result = await ctx.runMutation(onUserLogin, {
                uid: user.uid,
                loginData: {
                    timestamp: new Date().toISOString(),
                    deviceInfo: user.deviceInfo,
                    loginMethod: 'oauth_google'
                }
            });

            results.push(result);
            console.log(`用户 ${user.uid} 登录处理完成`);

        } catch (error) {
            console.error(`用户 ${user.uid} 登录处理失败:`, error);
            results.push({
                success: false,
                uid: user.uid,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    // 统计结果
    const successCount = results.filter(r => r.success).length;
    const updateTriggeredCount = results.filter(r => r.profileUpdateTriggered).length;

    console.log(`批量处理完成: ${successCount}/${users.length} 成功, ${updateTriggeredCount} 个触发了画像更新`);

    return results;
}

/**
 * 示例5: 与排名系统集成
 */
export async function rankingSystemIntegrationExample(ctx: any) {
    console.log('=== 与排名系统集成示例 ===');

    const uid = 'player_001';

    // 1. 用户登录，触发画像更新
    const loginResult = await ctx.runMutation(onUserLogin, {
        uid,
        loginData: {
            timestamp: new Date().toISOString(),
            deviceInfo: 'mobile_ios',
            loginMethod: 'oauth_google'
        }
    });

    console.log('登录结果:', loginResult);

    // 2. 等待画像更新完成（实际应用中可能需要轮询或回调）
    if (loginResult.profileUpdateTriggered) {
        console.log('等待画像更新完成...');
        // 这里可以添加等待逻辑或轮询检查
        await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟等待
    }

    // 3. 使用更新后的画像进行排名推荐
    const rankingManager = new RankingRecommendationManagerOptimized(ctx, {
        personalizedStrategy: {
            enabled: true,
            minMatchesForPersonalization: 15,
            profileUpdateInterval: 24,
            maxAdjustmentRange: 0.3,
            confidenceThreshold: 0.6,
            fallbackToVeteran: true
        }
    });

    const humanPlayers = [
        { uid: 'player_001', score: 1500 },
        { uid: 'player_002', score: 1200 },
        { uid: 'player_003', score: 1800 }
    ];

    const rankingResult = await rankingManager.generateMatchRankings(humanPlayers, 3);

    console.log('排名推荐结果:', rankingResult);

    // 显示个性化推理
    rankingResult.humanPlayerRankings.forEach(ranking => {
        if (ranking.uid === uid) {
            console.log(`玩家 ${uid} 的个性化排名: ${ranking.recommendedRank}`);
            console.log(`推理: ${ranking.reasoning}`);
            console.log(`信心度: ${ranking.confidence.toFixed(2)}`);
        }
    });

    return {
        loginResult,
        rankingResult
    };
}

/**
 * 示例6: 错误处理测试
 */
export async function errorHandlingExample(ctx: any) {
    console.log('=== 错误处理测试示例 ===');

    // 测试无效用户ID
    try {
        await ctx.runMutation(onUserLogin, {
            uid: '', // 空用户ID
            loginData: {
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.log('空用户ID错误处理:', error instanceof Error ? error.message : String(error));
    }

    // 测试无效登录数据
    try {
        await ctx.runMutation(onUserLogin, {
            uid: 'player_001',
            loginData: {
                timestamp: 'invalid_date' // 无效时间戳
            }
        });
    } catch (error) {
        console.log('无效登录数据错误处理:', error instanceof Error ? error.message : String(error));
    }

    // 测试不存在的用户
    try {
        const result = await ctx.runMutation(onUserLogin, {
            uid: 'non_existent_user',
            loginData: {
                timestamp: new Date().toISOString()
            }
        });
        console.log('不存在用户处理结果:', result);
    } catch (error) {
        console.log('不存在用户错误处理:', error instanceof Error ? error.message : String(error));
    }
}

/**
 * 示例7: 性能测试
 */
export async function performanceTestExample(ctx: any) {
    console.log('=== 性能测试示例 ===');

    const testUsers = Array.from({ length: 10 }, (_, i) => `test_user_${i + 1}`);

    // 测试并发登录处理
    console.time('并发登录处理');

    const promises = testUsers.map(uid =>
        ctx.runMutation(onUserLogin, {
            uid,
            loginData: {
                timestamp: new Date().toISOString(),
                deviceInfo: 'test_device',
                loginMethod: 'test_method'
            }
        })
    );

    const results = await Promise.all(promises);

    console.timeEnd('并发登录处理');

    // 统计结果
    const successCount = results.filter(r => r.success).length;
    const updateTriggeredCount = results.filter(r => r.profileUpdateTriggered).length;

    console.log(`性能测试结果: ${successCount}/${testUsers.length} 成功, ${updateTriggeredCount} 个触发了画像更新`);

    return results;
}

/**
 * 示例8: 监控和统计
 */
export async function monitoringExample(ctx: any) {
    console.log('=== 监控和统计示例 ===');

    // 模拟一段时间内的登录数据
    const loginEvents = [
        { uid: 'player_001', timestamp: new Date(Date.now() - 3600000).toISOString() }, // 1小时前
        { uid: 'player_002', timestamp: new Date(Date.now() - 1800000).toISOString() }, // 30分钟前
        { uid: 'player_003', timestamp: new Date(Date.now() - 900000).toISOString() },  // 15分钟前
        { uid: 'player_001', timestamp: new Date(Date.now() - 300000).toISOString() },  // 5分钟前
        { uid: 'player_004', timestamp: new Date().toISOString() }                      // 现在
    ];

    const results = [];

    for (const event of loginEvents) {
        const result = await ctx.runMutation(onUserLogin, {
            uid: event.uid,
            loginData: {
                timestamp: event.timestamp,
                deviceInfo: 'monitoring_test',
                loginMethod: 'monitoring'
            }
        });

        results.push({
            ...result,
            originalTimestamp: event.timestamp
        });
    }

    // 分析结果
    const analysis = {
        totalLogins: results.length,
        successfulLogins: results.filter(r => r.success).length,
        profileUpdatesTriggered: results.filter(r => r.profileUpdateTriggered).length,
        uniqueUsers: new Set(results.map(r => r.uid)).size,
        averageResponseTime: 'N/A', // 实际应用中可以测量响应时间
        errorRate: results.filter(r => !r.success).length / results.length
    };

    console.log('监控分析结果:', analysis);

    return {
        results,
        analysis
    };
}

/**
 * 主函数：运行所有示例
 */
export async function runAllLoginTriggerExamples(ctx: any) {
    console.log('=== 登录触发画像更新使用示例 ===\n');

    try {
        console.log('1. 基本登录触发示例');
        await basicLoginTriggerExample(ctx);

        console.log('\n2. 检查更新需求示例');
        await checkUpdateNeededExample(ctx);

        console.log('\n3. 直接触发画像更新示例');
        await directProfileUpdateExample(ctx);

        console.log('\n4. 批量用户登录处理示例');
        await batchLoginProcessingExample(ctx);

        console.log('\n5. 与排名系统集成示例');
        await rankingSystemIntegrationExample(ctx);

        console.log('\n6. 错误处理测试示例');
        await errorHandlingExample(ctx);

        console.log('\n7. 性能测试示例');
        await performanceTestExample(ctx);

        console.log('\n8. 监控和统计示例');
        await monitoringExample(ctx);

        console.log('\n=== 所有示例执行完成 ===');

    } catch (error) {
        console.error('示例执行失败:', error);
    }
}

/**
 * 快速测试函数
 */
export async function quickTest(ctx: any) {
    console.log('=== 快速测试 ===');

    const uid = 'test_user_001';

    // 1. 登录触发
    const loginResult = await ctx.runMutation(onUserLogin, {
        uid,
        loginData: {
            timestamp: new Date().toISOString(),
            deviceInfo: 'test_device',
            loginMethod: 'test_method'
        }
    });

    console.log('登录结果:', loginResult);

    // 2. 检查更新需求
    const needsUpdate = await ctx.runQuery(checkProfileUpdateNeeded, { uid });
    console.log('是否需要更新:', needsUpdate);

    return {
        loginResult,
        needsUpdate
    };
}
