/**
 * 段位管理器
 * 核心业务逻辑，负责段位升降、保护机制和规则检查
 */

import { getSegmentRule, SEASON_RESET_CONFIG, SEGMENT_SYSTEM_CONFIG } from './config';
import {
  DatabaseContext,
  PlayerProtectionDataAccess,
  PlayerSegmentDataAccess,
  SegmentChangeRecordAccess
} from './dataAccess';
import {
  PlayerProtectionData,
  PlayerSegmentData,
  PromotionCheckResult,
  SegmentChangeResult,
  SegmentName
} from './types';

export class SegmentManager {
  private ctx: DatabaseContext;

  constructor(ctx: DatabaseContext) {
    this.ctx = ctx;
  }

  // ==================== 主要方法 ====================

  /**
   * 检查并处理段位变化（仅升级，无降级）
   * @param uid 玩家ID
   * @param pointsDelta 积分增量（正数表示获得积分）
   */
  async updatePoints(
    uid: string,
    pointsDelta: number,
  ): Promise<SegmentChangeResult> {
    try {
      // 只处理正数积分增量
      if (pointsDelta <= 0) {
        return {
          changed: false,
          changeType: "none",
          oldSegment: "bronze" as SegmentName,
          newSegment: "bronze" as SegmentName,
          pointsConsumed: 0,
          message: "积分增量必须为正数",
          reason: "段位系统只支持升级，不支持降级",
          timestamp: new Date().toISOString()
        };
      }

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

      // 检查升级（使用新积分）
      const promotionResult = await this.checkPromotion(playerData, segmentRule, newTotalPoints);
      if (promotionResult.shouldPromote) {
        const result = await this.executePromotion(playerData, promotionResult);
        return result;
      }

      // 无变化，只更新积分
      await PlayerSegmentDataAccess.updatePlayerSegmentData(
        this.ctx,
        uid,
        {
          points: newTotalPoints,
          lastMatchDate: new Date().toISOString()
        }
      );

      return {
        changed: false,
        changeType: "none",
        oldSegment: currentSegment,
        newSegment: currentSegment,
        pointsConsumed: 0,
        message: "积分已更新，段位无变化",
        reason: "不满足升级条件",
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error("检查段位变化时发生错误:", error);
      return this.createErrorResult(`系统错误: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ==================== 升级检查 ====================

  /**
   * 检查升级条件（仅积分要求）
   */
  private async checkPromotion(
    playerData: PlayerSegmentData,
    segmentRule: any,
    newTotalPoints: number
  ): Promise<PromotionCheckResult> {
    const { promotion } = segmentRule;
    const missingRequirements: string[] = [];

    // 只检查积分要求
    if (newTotalPoints < promotion.pointsRequired) {
      missingRequirements.push(`积分不足，需要 ${promotion.pointsRequired}，当前 ${newTotalPoints}`);
    }

    const shouldPromote = missingRequirements.length === 0;

    return {
      shouldPromote,
      nextSegment: shouldPromote ? segmentRule.nextSegment : null,
      pointsConsumed: shouldPromote ? promotion.pointsRequired : 0,
      reason: shouldPromote ? "满足升级条件" : "积分不足",
      missingRequirements
    };
  }

  // ==================== 降级检查（已禁用） ====================
  // 根据 systemdesign.pdf，段位系统不支持降级，因此移除所有降级相关逻辑

  // ==================== 辅助检查方法 ====================

  // 由于只检查积分要求，移除了稳定期和宽限期检查方法

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

  // ==================== 降级执行（已禁用） ====================
  // 根据 systemdesign.pdf，段位系统不支持降级，因此移除降级执行逻辑

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

  // ==================== 赛季重置功能 ====================

  /**
   * 执行赛季软重置
   * @param seasonId 赛季ID
   * @param resetReason 重置原因
   */
  async performSeasonReset(
    seasonId: string,
    resetReason: string = "赛季结束"
  ): Promise<{
    success: boolean;
    resetCount: number;
    errors: string[];
    timestamp: string;
  }> {
    const results = {
      success: true,
      resetCount: 0,
      errors: [] as string[],
      timestamp: new Date().toISOString()
    };

    try {
      // 获取所有玩家段位数据
      const allPlayers = await PlayerSegmentDataAccess.getAllPlayerSegments(this.ctx);

      for (const player of allPlayers) {
        try {
          await this.resetPlayerForNewSeason(player.uid, seasonId, resetReason);
          results.resetCount++;
        } catch (error) {
          const errorMsg = `重置玩家 ${player.uid} 失败: ${error instanceof Error ? error.message : String(error)}`;
          results.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // 记录赛季重置日志
      await this.recordSeasonReset(seasonId, results.resetCount, resetReason);

      return results;

    } catch (error) {
      results.success = false;
      results.errors.push(`赛季重置失败: ${error instanceof Error ? error.message : String(error)}`);
      console.error("赛季重置失败:", error);
      return results;
    }
  }

  /**
   * 重置单个玩家的段位（新赛季）
   */
  private async resetPlayerForNewSeason(
    uid: string,
    seasonId: string,
    resetReason: string
  ): Promise<void> {
    // 获取玩家当前段位数据
    const playerData = await PlayerSegmentDataAccess.getPlayerSegmentData(this.ctx, uid);
    if (!playerData) {
      throw new Error("玩家数据不存在");
    }

    const currentSegment = playerData.currentSegment;
    const currentPoints = playerData.points;

    // 根据重置规则确定新段位
    const newSegment = (SEASON_RESET_CONFIG.resetRules[currentSegment] || SEASON_RESET_CONFIG.resetBaseSegment) as SegmentName;

    // 计算保留的积分
    const retainedPoints = this.calculateRetainedPoints(currentPoints);

    // 更新玩家段位数据
    await PlayerSegmentDataAccess.updatePlayerSegmentData(
      this.ctx,
      uid,
      {
        currentSegment: newSegment,
        points: retainedPoints,
        lastMatchDate: new Date().toISOString()
      }
    );

    // 记录段位变化
    await SegmentChangeRecordAccess.recordSegmentChange(this.ctx, {
      uid,
      oldSegment: currentSegment,
      newSegment: newSegment,
      changeType: "promotion", // 使用promotion类型记录重置
      pointsConsumed: 0,
      reason: `${resetReason} - 赛季重置`
    });

    console.log(`玩家 ${uid} 赛季重置: ${currentSegment}(${currentPoints}) -> ${newSegment}(${retainedPoints})`);
  }

  /**
   * 计算保留的积分
   */
  private calculateRetainedPoints(currentPoints: number): number {
    const { pointsRetentionRate, minRetainedPoints, maxRetainedPoints } = SEASON_RESET_CONFIG;

    // 计算保留积分
    let retainedPoints = Math.floor(currentPoints * pointsRetentionRate);

    // 应用最小和最大限制
    retainedPoints = Math.max(retainedPoints, minRetainedPoints);
    retainedPoints = Math.min(retainedPoints, maxRetainedPoints);

    return retainedPoints;
  }

  /**
   * 记录赛季重置日志
   */
  private async recordSeasonReset(
    seasonId: string,
    resetCount: number,
    resetReason: string
  ): Promise<void> {
    try {
      // 这里可以记录到专门的赛季重置日志表
      console.log(`赛季 ${seasonId} 重置完成: ${resetCount} 名玩家被重置, 原因: ${resetReason}`);
    } catch (error) {
      console.error("记录赛季重置日志失败:", error);
    }
  }

  /**
   * 获取赛季重置预览
   */
  async getSeasonResetPreview(): Promise<{
    totalPlayers: number;
    resetPreview: Array<{
      segment: SegmentName;
      count: number;
      avgPoints: number;
      newSegment: SegmentName;
      avgRetainedPoints: number;
    }>;
  }> {
    try {
      const allPlayers = await PlayerSegmentDataAccess.getAllPlayerSegments(this.ctx);
      const segmentStats = new Map<SegmentName, { count: number; totalPoints: number }>();

      // 统计各段位玩家数据
      for (const player of allPlayers) {
        const segment = player.currentSegment;
        if (!segmentStats.has(segment)) {
          segmentStats.set(segment, { count: 0, totalPoints: 0 });
        }
        const stats = segmentStats.get(segment)!;
        stats.count++;
        stats.totalPoints += player.points;
      }

      // 生成重置预览
      const resetPreview = Array.from(segmentStats.entries()).map(([segment, stats]) => {
        const newSegment = (SEASON_RESET_CONFIG.resetRules[segment] || SEASON_RESET_CONFIG.resetBaseSegment) as SegmentName;
        const avgPoints = stats.count > 0 ? Math.floor(stats.totalPoints / stats.count) : 0;
        const avgRetainedPoints = this.calculateRetainedPoints(avgPoints);

        return {
          segment,
          count: stats.count,
          avgPoints,
          newSegment,
          avgRetainedPoints
        };
      });

      return {
        totalPlayers: allPlayers.length,
        resetPreview
      };

    } catch (error) {
      console.error("获取赛季重置预览失败:", error);
      return {
        totalPlayers: 0,
        resetPreview: []
      };
    }
  }

  // ==================== 段位保护机制（已禁用） ====================
  // 根据 systemdesign.pdf，段位系统不支持降级，因此移除所有保护机制




}
