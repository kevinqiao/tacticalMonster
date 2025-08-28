/**
 * 段位管理器
 * 核心业务逻辑，负责段位升降、保护机制和规则检查
 */

import { getSegmentRule, SEGMENT_SYSTEM_CONFIG } from './config';
import {
  DatabaseContext,
  MatchRecordAccess,
  PlayerProtectionDataAccess,
  PlayerSegmentDataAccess,
  SegmentChangeRecordAccess
} from './dataAccess';
import {
  DemotionCheckResult,
  GracePeriodCheckResult,
  PlayerProtectionData,
  PlayerSegmentData,
  PromotionCheckResult,
  ProtectionLevel,
  SegmentChangeResult,
  SegmentName,
  StabilityCheckResult
} from './types';

export class SegmentManager {
  private ctx: DatabaseContext;

  constructor(ctx: DatabaseContext) {
    this.ctx = ctx;
  }

  // ==================== 主要方法 ====================

  /**
   * 检查并处理段位变化
   * @param uid 玩家ID
   * @param pointsDelta 积分增量（正数表示获得，负数表示失去）
   */
  async checkAndProcessSegmentChange(
    uid: string,
    pointsDelta: number,
  ): Promise<SegmentChangeResult> {
    try {
      // 获取玩家当前数据
      const playerData = await PlayerSegmentDataAccess.getPlayerSegmentData(this.ctx, uid);
      if (!playerData) {
        return this.createErrorResult("无法获取玩家数据");
      }

      const currentSegment = playerData.currentSegment;
      const segmentRule = getSegmentRule(currentSegment);
      if (!segmentRule) {
        return this.createErrorResult("段位规则未找到");
      }

      // 计算新的总积分
      const newTotalPoints = playerData.points + pointsDelta;

      // 记录积分变化过程（调试用）
      console.log(`[段位检查] 玩家 ${uid}: ${playerData.points} + ${pointsDelta} = ${newTotalPoints}`);

      // 🆕 检查段位保护状态
      const protectionResult = await this.checkSegmentProtection(uid, currentSegment, newTotalPoints);

      // 如果玩家处于保护状态，阻止降级
      if (protectionResult.isProtected && protectionResult.protectionType === 'demotion_protection') {
        return {
          changed: false,
          changeType: "none",
          oldSegment: currentSegment,
          newSegment: currentSegment,
          pointsConsumed: 0,
          message: `段位保护中：${protectionResult.reason}`,
          reason: protectionResult.reason,
          timestamp: new Date().toISOString(),
          protectionInfo: protectionResult
        };
      }

      // 检查升级（使用新积分）
      const promotionResult = await this.checkPromotion(playerData, segmentRule, newTotalPoints);
      if (promotionResult.shouldPromote) {
        const result = await this.executePromotion(playerData, promotionResult);

        // 🆕 晋升后设置保护状态
        if (result.changed) {
          await this.setNewSegmentProtection(uid, result.newSegment);
        }

        return result;
      }

      // 检查降级（使用新积分）
      const demotionResult = await this.checkDemotion(playerData, segmentRule, newTotalPoints);
      if (demotionResult.shouldDemote) {
        const result = await this.executeDemotion(playerData, demotionResult);

        // 🆕 降级后设置宽限期保护
        if (result.changed) {
          await this.setGracePeriodProtection(uid, result.oldSegment);
        }

        return result;
      }

      // 无变化
      return {
        changed: false,
        changeType: "none",
        oldSegment: currentSegment,
        newSegment: currentSegment,
        pointsConsumed: 0,
        message: "段位无变化",
        reason: "不满足升降级条件",
        timestamp: new Date().toISOString(),
        protectionInfo: protectionResult
      };

    } catch (error) {
      console.error("检查段位变化时发生错误:", error);
      return this.createErrorResult(`系统错误: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ==================== 升级检查 ====================

  /**
   * 检查升级条件
   */
  private async checkPromotion(
    playerData: PlayerSegmentData,
    segmentRule: any,
    newTotalPoints: number
  ): Promise<PromotionCheckResult> {
    const { promotion } = segmentRule;
    const missingRequirements: string[] = [];

    // 检查积分要求（使用新积分）
    if (newTotalPoints < promotion.pointsRequired) {
      missingRequirements.push(`积分不足，需要 ${promotion.pointsRequired}，当前 ${newTotalPoints}`);
    }

    // 检查胜率要求
    const winRate = playerData.totalMatches > 0
      ? playerData.totalWins / playerData.totalMatches
      : 0;
    if (winRate < promotion.winRateRequired) {
      missingRequirements.push(`胜率不足，需要 ${(promotion.winRateRequired * 100).toFixed(1)}%，当前 ${(winRate * 100).toFixed(1)}%`);
    }

    // 检查比赛场次
    if (playerData.totalMatches < promotion.minMatches) {
      missingRequirements.push(`比赛场次不足，需要 ${promotion.minMatches} 场，当前 ${playerData.totalMatches} 场`);
    }

    // 检查连续胜利要求
    if (promotion.consecutiveWinsRequired &&
      playerData.currentWinStreak < promotion.consecutiveWinsRequired) {
      missingRequirements.push(`连续胜利不足，需要 ${promotion.consecutiveWinsRequired} 场，当前 ${playerData.currentWinStreak} 场`);
    }

    // 检查稳定期
    if (SEGMENT_SYSTEM_CONFIG.enableStabilityCheck) {
      const stabilityCheck = await this.checkStabilityPeriod(
        playerData.uid,
        playerData.currentSegment,
        promotion.stabilityPeriod
      );
      if (!stabilityCheck.stable) {
        missingRequirements.push(`稳定期未满足，需要 ${stabilityCheck.requiredPeriod} 场，当前 ${stabilityCheck.currentPeriod} 场`);
      }
    }

    const shouldPromote = missingRequirements.length === 0;

    return {
      shouldPromote,
      nextSegment: shouldPromote ? segmentRule.nextSegment : null,
      pointsConsumed: shouldPromote ? promotion.pointsRequired : 0,
      reason: shouldPromote ? "满足所有升级条件" : "不满足升级条件",
      missingRequirements
    };
  }

  // ==================== 降级检查 ====================

  /**
   * 检查降级条件
   */
  private async checkDemotion(
    playerData: PlayerSegmentData,
    segmentRule: any,
    newTotalPoints: number
  ): Promise<DemotionCheckResult> {
    const { demotion } = segmentRule;

    // 检查保护状态
    if (SEGMENT_SYSTEM_CONFIG.enableProtection) {
      const protectionData = await PlayerProtectionDataAccess.getPlayerProtectionData(this.ctx, playerData.uid);
      if (protectionData && protectionData.protectionLevel > 0) {
        return {
          shouldDemote: false,
          previousSegment: null,
          reason: `处于保护状态，保护等级 ${protectionData.protectionLevel}`,
          protectionActive: true
        };
      }
    }

    // 检查积分阈值（使用新积分）
    if (newTotalPoints > demotion.pointsThreshold) {
      return {
        shouldDemote: false,
        previousSegment: null,
        reason: `积分未达到降级阈值，当前 ${newTotalPoints}，阈值 ${demotion.pointsThreshold}`,
        protectionActive: false
      };
    }

    // 检查连续失败
    if (playerData.currentLoseStreak >= demotion.consecutiveLosses) {
      return {
        shouldDemote: false,
        previousSegment: null,
        reason: `连续失败次数过多，触发保护，当前 ${playerData.currentLoseStreak} 场`,
        protectionActive: true
      };
    }

    // 检查胜率阈值
    if (demotion.winRateThreshold) {
      const winRate = playerData.totalMatches > 0
        ? playerData.totalWins / playerData.totalMatches
        : 0;
      if (winRate >= demotion.winRateThreshold) {
        return {
          shouldDemote: false,
          previousSegment: null,
          reason: `胜率未达到降级阈值，当前 ${(winRate * 100).toFixed(1)}%，阈值 ${(demotion.winRateThreshold * 100).toFixed(1)}%`,
          protectionActive: false
        };
      }
    }

    // 检查宽限期
    if (SEGMENT_SYSTEM_CONFIG.enableGracePeriod) {
      const gracePeriodCheck = await this.checkGracePeriod(
        playerData.uid,
        playerData.currentSegment,
        demotion.gracePeriod
      );
      if (gracePeriodCheck.inGracePeriod) {
        return {
          shouldDemote: false,
          previousSegment: null,
          reason: `处于降级宽限期，剩余 ${gracePeriodCheck.daysRemaining} 天`,
          protectionActive: true
        };
      }
    }

    return {
      shouldDemote: true,
      previousSegment: segmentRule.previousSegment,
      reason: "满足降级条件",
      protectionActive: false
    };
  }

  // ==================== 辅助检查方法 ====================

  /**
   * 检查稳定期
   */
  private async checkStabilityPeriod(
    uid: string,
    segmentName: SegmentName,
    requiredPeriod: number
  ): Promise<StabilityCheckResult> {
    const result = await MatchRecordAccess.checkPlayerStabilityInSegment(
      this.ctx, uid, segmentName, requiredPeriod
    );

    return {
      ...result,
      progress: Math.min(result.currentPeriod / result.requiredPeriod, 1)
    };
  }

  /**
   * 检查宽限期
   */
  private async checkGracePeriod(
    uid: string,
    segmentName: SegmentName,
    gracePeriod: number
  ): Promise<GracePeriodCheckResult> {
    try {
      const protectionData = await PlayerProtectionDataAccess.getPlayerProtectionData(this.ctx, uid);

      if (!protectionData || protectionData.gracePeriodRemaining <= 0) {
        return {
          inGracePeriod: false,
          remainingGrace: 0,
          daysRemaining: 0
        };
      }

      const lastChange = new Date(protectionData.lastSegmentChange);
      const currentTime = new Date();
      const daysSinceChange = (currentTime.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
      const remainingDays = Math.max(0, gracePeriod - daysSinceChange);

      return {
        inGracePeriod: remainingDays > 0,
        remainingGrace: Math.ceil(remainingDays),
        daysRemaining: Math.ceil(remainingDays)
      };
    } catch (error) {
      console.error("检查宽限期失败:", error);
      return {
        inGracePeriod: false,
        remainingGrace: 0,
        daysRemaining: 0
      };
    }
  }

  // ==================== 执行方法 ====================

  /**
   * 执行升级
   */
  private async executePromotion(
    playerData: PlayerSegmentData,
    promotionResult: PromotionCheckResult
  ): Promise<SegmentChangeResult> {
    const { nextSegment, pointsConsumed } = promotionResult;

    if (!nextSegment) {
      return this.createErrorResult("已达到最高段位");
    }

    try {
      // 更新玩家段位数据
      const updateSuccess = await PlayerSegmentDataAccess.updatePlayerSegmentData(
        this.ctx,
        playerData.uid,
        {
          currentSegment: nextSegment,
          points: playerData.points - pointsConsumed
        }
      );

      if (!updateSuccess) {
        return this.createErrorResult("更新段位数据失败");
      }

      // 重置保护状态
      if (SEGMENT_SYSTEM_CONFIG.enableProtection) {
        await PlayerProtectionDataAccess.resetProtectionStatus(this.ctx, playerData.uid);
      }

      // 记录段位变化
      await SegmentChangeRecordAccess.recordSegmentChange(this.ctx, {
        uid: playerData.uid,
        oldSegment: playerData.currentSegment,
        newSegment: nextSegment,
        changeType: "promotion",
        pointsConsumed,
        reason: "满足升级条件"
      });

      return {
        changed: true,
        changeType: "promotion",
        oldSegment: playerData.currentSegment,
        newSegment: nextSegment,
        pointsConsumed,
        message: `🎉 恭喜！您已从 ${playerData.currentSegment} 升级到 ${nextSegment}！`,
        reason: "满足升级条件",
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error("执行升级失败:", error);
      return this.createErrorResult(`升级失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 执行降级
   */
  private async executeDemotion(
    playerData: PlayerSegmentData,
    demotionResult: DemotionCheckResult
  ): Promise<SegmentChangeResult> {
    const { previousSegment } = demotionResult;

    if (!previousSegment) {
      return this.createErrorResult("已达到最低段位");
    }

    try {
      // 更新玩家段位数据
      const updateSuccess = await PlayerSegmentDataAccess.updatePlayerSegmentData(
        this.ctx,
        playerData.uid,
        { currentSegment: previousSegment }
      );

      if (!updateSuccess) {
        return this.createErrorResult("更新段位数据失败");
      }

      // 设置保护状态
      if (SEGMENT_SYSTEM_CONFIG.enableProtection) {
        const segmentRule = getSegmentRule(previousSegment);
        if (segmentRule) {
          await PlayerProtectionDataAccess.setProtectionStatus(
            this.ctx,
            playerData.uid,
            previousSegment,
            Math.min(1, segmentRule.demotion.maxProtectionLevel) as ProtectionLevel,
            segmentRule.demotion.gracePeriod
          );
        }
      }

      // 记录段位变化
      await SegmentChangeRecordAccess.recordSegmentChange(this.ctx, {
        uid: playerData.uid,
        oldSegment: playerData.currentSegment,
        newSegment: previousSegment,
        changeType: "demotion",
        pointsConsumed: 0,
        reason: "满足降级条件"
      });

      return {
        changed: true,
        changeType: "demotion",
        oldSegment: playerData.currentSegment,
        newSegment: previousSegment,
        pointsConsumed: 0,
        message: `📉 很遗憾，您从 ${playerData.currentSegment} 降级到 ${previousSegment}，继续努力！`,
        reason: "满足降级条件",
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error("执行降级失败:", error);
      return this.createErrorResult(`降级失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 创建错误结果
   */
  private createErrorResult(reason: string): SegmentChangeResult {
    return {
      changed: false,
      changeType: "none",
      oldSegment: "bronze" as SegmentName,
      newSegment: "bronze" as SegmentName,
      pointsConsumed: 0,
      message: "操作失败",
      reason,
      timestamp: new Date().toISOString()
    };
  }

  // ==================== 公共查询方法 ====================

  /**
   * 获取玩家段位信息
   */
  async getPlayerSegmentInfo(uid: string): Promise<PlayerSegmentData | null> {
    return await PlayerSegmentDataAccess.getPlayerSegmentData(this.ctx, uid);
  }

  /**
   * 获取玩家保护状态
   */
  async getPlayerProtectionStatus(uid: string): Promise<PlayerProtectionData | null> {
    return await PlayerProtectionDataAccess.getPlayerProtectionData(this.ctx, uid);
  }

  /**
   * 获取玩家段位变化历史
   */
  async getPlayerSegmentHistory(uid: string, limit: number = 10) {
    return await SegmentChangeRecordAccess.getPlayerSegmentChangeHistory(this.ctx, uid, limit);
  }

  /**
   * 获取段位分布统计
   */
  async getSegmentStatistics() {
    const { StatisticsAccess } = await import('./dataAccess');
    const distribution = await StatisticsAccess.getSegmentDistribution(this.ctx);
    const totalPlayers = await StatisticsAccess.getTotalPlayerCount(this.ctx);

    return {
      totalPlayers,
      segmentDistribution: distribution,
      timestamp: new Date().toISOString()
    };
  }

  // ==================== 段位保护机制 ====================

  /**
   * 检查段位保护状态
   */
  private async checkSegmentProtection(
    uid: string,
    currentSegment: string,
    newPoints: number
  ): Promise<{
    isProtected: boolean;
    protectionType: 'new_segment' | 'performance' | 'grace_period' | 'demotion_protection' | 'none';
    reason: string;
    remainingDays: number;
    protectionLevel: number;
  }> {
    try {
      // 获取玩家保护数据
      const protectionData = await this.getPlayerProtectionData(uid);

      // 1. 新段位保护检查
      const newSegmentProtection = this.checkNewSegmentProtection(protectionData, currentSegment);
      if (newSegmentProtection.isProtected) {
        return newSegmentProtection;
      }

      // 2. 宽限期保护检查
      const gracePeriodProtection = this.checkGracePeriodProtection(protectionData, currentSegment);
      if (gracePeriodProtection.isProtected) {
        return gracePeriodProtection;
      }

      // 3. 表现保护检查（基于积分）
      const performanceProtection = this.checkPerformanceProtection(newPoints, currentSegment);
      if (performanceProtection.isProtected) {
        return performanceProtection;
      }

      // 4. 无保护状态
      return {
        isProtected: false,
        protectionType: 'none',
        reason: '不满足保护条件',
        remainingDays: 0,
        protectionLevel: 0
      };

    } catch (error) {
      console.error(`检查段位保护失败: ${uid}`, error);
      return {
        isProtected: false,
        protectionType: 'none',
        reason: '保护检查失败',
        remainingDays: 0,
        protectionLevel: 0
      };
    }
  }

  /**
   * 新段位保护检查
   */
  private checkNewSegmentProtection(
    protectionData: any,
    currentSegment: string
  ): {
    isProtected: boolean;
    protectionType: 'new_segment' | 'performance' | 'grace_period' | 'demotion_protection' | 'none';
    reason: string;
    remainingDays: number;
    protectionLevel: number;
  } {
    if (!protectionData?.lastPromotionDate || !protectionData?.promotionSegment) {
      return { isProtected: false, protectionType: 'none', reason: '', remainingDays: 0, protectionLevel: 0 };
    }

    const lastPromotion = new Date(protectionData.lastPromotionDate);
    const currentDate = new Date();
    const daysSincePromotion = Math.floor((currentDate.getTime() - lastPromotion.getTime()) / (1000 * 60 * 60 * 24));

    // 新段位保护期：7天
    const NEW_SEGMENT_PROTECTION_DAYS = 7;

    if (daysSincePromotion < NEW_SEGMENT_PROTECTION_DAYS && protectionData.promotionSegment === currentSegment) {
      const remainingDays = NEW_SEGMENT_PROTECTION_DAYS - daysSincePromotion;
      return {
        isProtected: true,
        protectionType: 'new_segment',
        reason: `新段位保护期，剩余 ${remainingDays} 天`,
        remainingDays,
        protectionLevel: 2
      };
    }

    return { isProtected: false, protectionType: 'none', reason: '', remainingDays: 0, protectionLevel: 0 };
  }

  /**
   * 宽限期保护检查
   */
  private checkGracePeriodProtection(
    protectionData: any,
    currentSegment: string
  ): {
    isProtected: boolean;
    protectionType: 'new_segment' | 'performance' | 'grace_period' | 'demotion_protection' | 'none';
    reason: string;
    remainingDays: number;
    protectionLevel: number;
  } {
    if (!protectionData?.gracePeriodStart || !protectionData?.gracePeriodSegment) {
      return { isProtected: false, protectionType: 'none', reason: '', remainingDays: 0, protectionLevel: 0 };
    }

    const graceStart = new Date(protectionData.gracePeriodStart);
    const currentDate = new Date();
    const daysInGrace = Math.floor((currentDate.getTime() - graceStart.getTime()) / (1000 * 60 * 60 * 24));

    // 宽限期：5天
    const GRACE_PERIOD_DAYS = 5;

    if (daysInGrace < GRACE_PERIOD_DAYS && protectionData.gracePeriodSegment === currentSegment) {
      const remainingDays = GRACE_PERIOD_DAYS - daysInGrace;
      return {
        isProtected: true,
        protectionType: 'grace_period',
        reason: `段位适应宽限期，剩余 ${remainingDays} 天`,
        remainingDays,
        protectionLevel: 1
      };
    }

    return { isProtected: false, protectionType: 'none', reason: '', remainingDays: 0, protectionLevel: 0 };
  }

  /**
   * 表现保护检查
   * 基于积分表现、段位等级和连胜情况综合评估
   */
  private checkPerformanceProtection(
    newPoints: number,
    currentSegment: string
  ): {
    isProtected: boolean;
    protectionType: 'new_segment' | 'performance' | 'grace_period' | 'demotion_protection' | 'none';
    reason: string;
    remainingDays: number;
    protectionLevel: number;
  } {
    try {
      const segmentName = currentSegment as SegmentName;
      const segmentRule = getSegmentRule(segmentName);

      if (!segmentRule) {
        return { isProtected: false, protectionType: 'none', reason: '段位规则未找到', remainingDays: 0, protectionLevel: 0 };
      }

      const { promotion, demotion } = segmentRule;
      const pointsThreshold = promotion.pointsRequired;
      const maxProtectionLevel = demotion.maxProtectionLevel;

      // 1. 积分表现保护：积分远超升级要求
      const pointsMultiplier = SEGMENT_SYSTEM_CONFIG.performanceProtectionMultiplier || 1.5;
      if (newPoints >= pointsThreshold * pointsMultiplier) {
        const protectionDays = SEGMENT_SYSTEM_CONFIG.performanceProtectionDays || 3;
        const protectionLevel = Math.min(2, maxProtectionLevel) as ProtectionLevel;

        return {
          isProtected: true,
          protectionType: 'performance',
          reason: `积分表现优秀（${newPoints}/${pointsThreshold}），给予保护`,
          remainingDays: protectionDays,
          protectionLevel
        };
      }

      // 2. 段位稳定性保护：积分接近升级要求
      const stabilityMultiplier = SEGMENT_SYSTEM_CONFIG.stabilityProtectionMultiplier || 1.2;
      if (newPoints >= pointsThreshold * stabilityMultiplier) {
        const protectionDays = SEGMENT_SYSTEM_CONFIG.stabilityProtectionDays || 2;
        const protectionLevel = Math.min(1, maxProtectionLevel) as ProtectionLevel;

        return {
          isProtected: true,
          protectionType: 'performance',
          reason: `积分表现稳定（${newPoints}/${pointsThreshold}），给予保护`,
          remainingDays: protectionDays,
          protectionLevel
        };
      }

      // 3. 无保护状态
      return {
        isProtected: false,
        protectionType: 'none',
        reason: '积分表现未达到保护标准',
        remainingDays: 0,
        protectionLevel: 0
      };

    } catch (error) {
      console.error(`检查表现保护失败: ${currentSegment}`, error);
      return {
        isProtected: false,
        protectionType: 'none',
        reason: '保护检查失败',
        remainingDays: 0,
        protectionLevel: 0
      };
    }
  }

  /**
   * 获取玩家保护数据
   */
  private async getPlayerProtectionData(uid: string): Promise<any> {
    try {
      // 这里应该查询专门的保护数据表
      // 暂时返回模拟数据，实际实现时需要创建相应的数据库表
      return {
        lastPromotionDate: null,
        promotionSegment: null,
        gracePeriodStart: null,
        gracePeriodSegment: null,
        protectionHistory: []
      };
    } catch (error) {
      console.error(`获取玩家保护数据失败: ${uid}`, error);
      return null;
    }
  }

  /**
   * 设置新段位保护
   */
  private async setNewSegmentProtection(uid: string, newSegment: string): Promise<void> {
    try {
      // 这里应该更新数据库中的保护数据
      console.log(`设置玩家 ${uid} 的新段位保护: ${newSegment}`);
    } catch (error) {
      console.error(`设置新段位保护失败: ${uid}`, error);
    }
  }

  /**
   * 设置宽限期保护
   */
  private async setGracePeriodProtection(uid: string, oldSegment: string): Promise<void> {
    try {
      // 这里应该更新数据库中的宽限期数据
      console.log(`设置玩家 ${uid} 的宽限期保护: ${oldSegment}`);
    } catch (error) {
      console.error(`设置宽限期保护失败: ${uid}`, error);
    }
  }




}
