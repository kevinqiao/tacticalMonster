/**
 * 段位管理器
 * 核心业务逻辑，负责段位升降、保护机制和规则检查
 */

import { 
  SegmentName, 
  ChangeType, 
  PlayerSegmentData, 
  PlayerProtectionData,
  SegmentChangeResult,
  PromotionCheckResult,
  DemotionCheckResult,
  StabilityCheckResult,
  GracePeriodCheckResult
} from './types';
import { getSegmentRule, SEGMENT_SYSTEM_CONFIG } from './config';
import { 
  PlayerSegmentDataAccess, 
  PlayerProtectionDataAccess, 
  SegmentChangeRecordAccess, 
  MatchRecordAccess,
  DatabaseContext 
} from './dataAccess';

export class SegmentManager {
  private ctx: DatabaseContext;

  constructor(ctx: DatabaseContext) {
    this.ctx = ctx;
  }

  // ==================== 主要方法 ====================

  /**
   * 检查并处理段位变化
   */
  async checkAndProcessSegmentChange(
    uid: string,
    newPoints: number,
    matchId?: string
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

      // 检查升级
      const promotionResult = await this.checkPromotion(playerData, segmentRule);
      if (promotionResult.shouldPromote) {
        return await this.executePromotion(playerData, promotionResult, matchId);
      }

      // 检查降级
      const demotionResult = await this.checkDemotion(playerData, segmentRule);
      if (demotionResult.shouldDemote) {
        return await this.executeDemotion(playerData, demotionResult, matchId);
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
        timestamp: new Date().toISOString()
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
    segmentRule: any
  ): Promise<PromotionCheckResult> {
    const { promotion } = segmentRule;
    const missingRequirements: string[] = [];

    // 检查积分要求
    if (playerData.points < promotion.pointsRequired) {
      missingRequirements.push(`积分不足，需要 ${promotion.pointsRequired}，当前 ${playerData.points}`);
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
    segmentRule: any
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

    // 检查积分阈值
    if (playerData.points > demotion.pointsThreshold) {
      return {
        shouldDemote: false,
        previousSegment: null,
        reason: `积分未达到降级阈值，当前 ${playerData.points}，阈值 ${demotion.pointsThreshold}`,
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
    promotionResult: PromotionCheckResult,
    matchId?: string
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
        reason: "满足升级条件",
        matchId
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
    demotionResult: DemotionCheckResult,
    matchId?: string
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
            Math.min(1, segmentRule.demotion.maxProtectionLevel),
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
        reason: "满足降级条件",
        matchId
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
}
