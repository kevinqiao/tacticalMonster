import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getTorontoDate } from "../utils";

// 锦标赛配置规则
export interface TournamentRules {
  // 基础限制
  maxAttempts?: number; // 总尝试次数限制
  dailyLimit?: number; // 每日参与次数限制

  // 锦标赛模式选择
  allowReuse?: boolean; // 是否允许复用锦标赛（多人共享）
  independentAttempts?: boolean; // 每次尝试创建独立锦标赛

  // 提交次数控制（仅在 allowReuse 模式下有效）
  maxSubmissionsPerTournament?: number; // 单个锦标赛中最大提交次数

  // 每日限制
  maxTournamentsPerDay?: number; // 每日最大锦标赛参与数量

  // 其他规则
  createInitialMatch?: boolean; // 是否创建初始match记录
  minPlayers?: number; // 最小玩家数
  maxPlayers?: number; // 最大玩家数
  timeLimit?: number; // 时间限制（分钟）
  autoClose?: boolean; // 是否自动关闭
  autoCloseDelay?: number; // 自动关闭延迟（分钟）
}

// 注意：锦标赛配置已移至 data/tournamentConfigs.ts

export async function validateLimits(ctx: any, { uid, gameType, tournamentType, isSubscribed, limits, seasonId }: any) {
  const now = getTorontoDate();
  const today = now.localDate.toISOString().split("T")[0];
  const weekStart = getWeekStart(today);

  // 验证每日限制
  await validateDailyLimits(ctx, { uid, gameType, tournamentType, isSubscribed, limits, today });

  // 验证每周限制
  await validateWeeklyLimits(ctx, { uid, gameType, tournamentType, isSubscribed, limits, weekStart });

  // 验证赛季限制
  if (seasonId) {
    await validateSeasonalLimits(ctx, { uid, gameType, tournamentType, isSubscribed, limits, seasonId });
  }

  // 验证总限制
  await validateTotalLimits(ctx, { uid, gameType, tournamentType, isSubscribed, limits });
}

// 验证每日限制
async function validateDailyLimits(ctx: any, { uid, gameType, tournamentType, isSubscribed, limits, today }: any) {
  const now = getTorontoDate();
  const maxDailyParticipations = isSubscribed ?
    limits.daily.subscribed.maxParticipations :
    limits.daily.maxParticipations;

  const dailyLimit = await ctx.db
    .query("player_tournament_limits")
    .withIndex("by_uid_tournament_date", (q: any) =>
      q.eq("uid", uid).eq("tournamentType", tournamentType).eq("date", today)
    )
    .first();

  if (dailyLimit && dailyLimit.participationCount >= maxDailyParticipations) {
    throw new Error(`今日 ${tournamentType} 已达最大参与次数 (${maxDailyParticipations})`);
  }

  // 更新或创建每日限制记录
  if (dailyLimit) {
    await ctx.db.patch(dailyLimit._id, {
      participationCount: dailyLimit.participationCount + 1,
      updatedAt: now.iso,
    });
  } else {
    await ctx.db.insert("player_tournament_limits", {
      uid,
      gameType,
      tournamentType,
      date: today,
      participationCount: 1,
      tournamentCount: 0,
      submissionCount: 0,
      createdAt: now.iso,
      updatedAt: now.iso,
    });
  }
}

// 验证每周限制
async function validateWeeklyLimits(ctx: any, { uid, gameType, tournamentType, isSubscribed, limits, weekStart }: any) {
  const now = getTorontoDate();
  const maxWeeklyParticipations = isSubscribed ?
    limits.weekly.subscribed.maxParticipations :
    limits.weekly.maxParticipations;

  const weeklyLimit = await ctx.db
    .query("player_tournament_limits")
    .withIndex("by_uid_tournament_week", (q: any) =>
      q.eq("uid", uid).eq("tournamentType", tournamentType).eq("weekStart", weekStart)
    )
    .first();

  if (weeklyLimit && weeklyLimit.participationCount >= maxWeeklyParticipations) {
    throw new Error(`本周 ${tournamentType} 已达最大参与次数 (${maxWeeklyParticipations})`);
  }

  // 更新或创建每周限制记录
  if (weeklyLimit) {
    await ctx.db.patch(weeklyLimit._id, {
      participationCount: weeklyLimit.participationCount + 1,
      updatedAt: now.iso,
    });
  } else {
    await ctx.db.insert("player_tournament_limits", {
      uid,
      gameType,
      tournamentType,
      date: weekStart, // Use weekStart as the date for weekly limits
      weekStart,
      participationCount: 1,
      tournamentCount: 0,
      submissionCount: 0,
      createdAt: now.iso,
      updatedAt: now.iso,
    });
  }
}

// 验证赛季限制
async function validateSeasonalLimits(ctx: any, { uid, gameType, tournamentType, isSubscribed, limits, seasonId }: any) {
  const now = getTorontoDate();
  const maxSeasonalParticipations = isSubscribed ?
    limits.seasonal.subscribed.maxParticipations :
    limits.seasonal.maxParticipations;

  const seasonalLimit = await ctx.db
    .query("player_tournament_limits")
    .withIndex("by_uid_tournament_season", (q: any) =>
      q.eq("uid", uid).eq("tournamentType", tournamentType).eq("seasonId", seasonId)
    )
    .first();

  if (seasonalLimit && seasonalLimit.participationCount >= maxSeasonalParticipations) {
    throw new Error(`本赛季 ${tournamentType} 已达最大参与次数 (${maxSeasonalParticipations})`);
  }

  // 更新或创建赛季限制记录
  if (seasonalLimit) {
    await ctx.db.patch(seasonalLimit._id, {
      participationCount: seasonalLimit.participationCount + 1,
      updatedAt: now.iso,
    });
  } else {
    await ctx.db.insert("player_tournament_limits", {
      uid,
      gameType,
      tournamentType,
      date: now.localDate.toISOString().split("T")[0], // Use current date for seasonal limits
      seasonId,
      participationCount: 1,
      tournamentCount: 0,
      submissionCount: 0,
      createdAt: now.iso,
      updatedAt: now.iso,
    });
  }
}

// 验证总限制
async function validateTotalLimits(ctx: any, { uid, gameType, tournamentType, isSubscribed, limits }: any) {
  const now = getTorontoDate();
  const maxTotalParticipations = isSubscribed ?
    limits.total.subscribed.maxParticipations :
    limits.total.maxParticipations;

  // 获取总参与次数
  const totalParticipations = await ctx.db
    .query("player_tournament_limits")
    .withIndex("by_uid_tournament", (q: any) =>
      q.eq("uid", uid).eq("tournamentType", tournamentType)
    )
    .collect();

  const totalCount = totalParticipations.reduce((sum: number, limit: any) => sum + limit.participationCount, 0);

  if (totalCount >= maxTotalParticipations) {
    throw new Error(`总参与次数已达上限 (${maxTotalParticipations})`);
  }
}

// 获取本周开始日期（周一）
function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - (day - 1));
  return date.toISOString().split("T")[0];
}

export async function deductEntryFee(ctx: any, { uid, gameType, tournamentType, entryFee, inventory }: any) {
  const now = getTorontoDate();
  const ticket = entryFee.ticket
    ? inventory.tickets?.find(
      (t: any) => t.gameType === gameType && t.tournamentType === tournamentType && t.quantity >= entryFee.ticket.quantity
    )
    : null;

  if (ticket) {
    await ctx.db.patch(inventory._id, {
      tickets: inventory.tickets.map((t: any) =>
        t.gameType === gameType && t.tournamentType === tournamentType
          ? { ...t, quantity: t.quantity - entryFee.ticket.quantity }
          : t
      ),
      updatedAt: now.iso,
    });
    return { method: "ticket", amount: entryFee.ticket.quantity };
  } else if (inventory.coins >= entryFee.coins) {
    await ctx.db.patch(inventory._id, {
      coins: inventory.coins - entryFee.coins,
      updatedAt: now.iso,
    });
    return { method: "coins", amount: entryFee.coins };
  } else {
    throw new Error("金币或门票不足");
  }
}

export async function deductProps(ctx: any, { uid, gameType, propsUsed, inventory }: any) {
  const now = getTorontoDate();
  const propCounts = new Map<string, number>();
  for (const prop of propsUsed) {
    propCounts.set(prop, (propCounts.get(prop) || 0) + 1);
  }

  const updatedProps = inventory.props.map((p: any) => {
    if (p.gameType === gameType && propCounts.has(p.propType)) {
      const used = propCounts.get(p.propType)!;
      if (p.quantity < used) throw new Error(`道具 ${p.propType} 不足`);
      return { ...p, quantity: p.quantity - used };
    }
    return p;
  });

  await ctx.db.patch(inventory._id, {
    props: updatedProps,
    updatedAt: now.iso,
  });
}

export async function applyRules(ctx: any, { tournament, uid, matches, player, inventory, playerSeason }: any) {
  const now = getTorontoDate();
  const config = tournament.config;
  const highestScore = Math.max(...matches.map((m: any) => m.score));
  let rank: number = 0, reward: any = {}, pointsEarned: number = 0;

  if (config.matchRules.rankingMethod === "threshold") {
    rank = highestScore >= config.matchRules.scoreThreshold ? 1 : 2;
    pointsEarned = highestScore >= config.matchRules.scoreThreshold ? config.rewards.baseRewards.gamePoints : config.rewards.baseRewards.gamePoints * 0.5;
    reward = config.rewards.rankRewards.find((r: any) => r.rankRange[0] === rank);
  } else if (config.matchRules.rankingMethod === "highest_score") {
    const playerScores = new Map<string, number>();
    for (const match of matches) {
      const currentScore = playerScores.get(match.uid) || 0;
      playerScores.set(match.uid, Math.max(currentScore, match.score));
    }
    const sortedPlayers = [...playerScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([uid], index) => ({ uid, rank: index + 1 }));
    const playerRank = sortedPlayers.find((p: any) => p.uid === uid);
    rank = playerRank?.rank || 0;
    reward = config.rewards.rankRewards.find((r: any) => rank >= r.rankRange[0] && rank <= r.rankRange[1]);
    pointsEarned = config.rewards.baseRewards.gamePoints * (reward?.multiplier || 1);
  }

  let finalReward = {
    coins: config.rewards.baseRewards.coins * (reward?.multiplier || 1),
    props: [...config.rewards.baseRewards.props, ...(reward?.bonusProps || [])],
    gamePoints: pointsEarned,
    tickets: [...config.rewards.baseRewards.tickets, ...(reward?.bonusTickets || [])]
  };

  if (player.isSubscribed) {
    finalReward.coins *= config.rewards.subscriptionBonus || 1.2;
    finalReward.gamePoints *= config.rewards.subscriptionBonus || 1.2;
  }

  // 应用段位加成
  const segmentBonus = config.rewards.segmentBonus?.[player.segmentName.toLowerCase()] || 1.0;
  finalReward.coins *= segmentBonus;
  finalReward.gamePoints *= segmentBonus;

  await ctx.db.patch(inventory._id, {
    coins: inventory.coins + finalReward.coins,
    props: updateProps(inventory.props, finalReward.props),
    tickets: updateTickets(inventory.tickets, finalReward.tickets),
    updatedAt: now.iso,
  });

  await ctx.db.patch(playerSeason._id, {
    seasonPoints: playerSeason.seasonPoints + finalReward.gamePoints,
    gamePoints: {
      ...playerSeason.gamePoints,
      [tournament.gameType]: playerSeason.gamePoints[tournament.gameType] + finalReward.gamePoints,
    },
    updatedAt: now.iso,
  });

  const newSegment = determineSegment(playerSeason.gamePoints[tournament.gameType]);
  if (newSegment !== player.segmentName) {
    await ctx.db.patch(player._id, { segmentName: newSegment });
  }

  // 检查是否需要分享（如果配置了分享功能）
  if (config.advanced?.custom?.share && Math.random() < config.advanced.custom.share.probability && rank >= config.advanced.custom.share.rankRange[0] && rank <= config.advanced.custom.share.rankRange[1]) {
    await ctx.db.insert("player_shares", {
      uid,
      gameType: tournament.gameType,
      content: `我在 ${tournament.gameType} ${tournament.tournamentType} 锦标赛中排名第${rank}！#GamePlatform`,
      platform: "x",
      createdAt: now.iso,
    });
  }

  return { rank, finalReward };
}

export async function distributeSeasonRewards(ctx: any, seasonId: string) {
  const now = getTorontoDate();
  const playerSeasons = await ctx.db
    .query("player_seasons")
    .filter((q: any) => q.eq(q.field("seasonId"), seasonId))
    .order("desc")
    .take(10); // Top 10 玩家

  let rewardedPlayers = 0;
  for (const ps of playerSeasons) {
    const inventory = await ctx.db
      .query("player_inventory")
      .withIndex("by_uid", (q: any) => q.eq("uid", ps.uid))
      .first();
    await ctx.db.patch(inventory._id, {
      coins: inventory.coins + 1000,
      tickets: updateTickets(inventory.tickets, [
        { gameType: "solitaire", tournamentType: "daily_special", quantity: 2 },
      ]),
      updatedAt: now.iso,
    });
    rewardedPlayers++;
  }

  return rewardedPlayers;
}

function updateProps(existing: any[], newProps: any[]) {
  const propMap = new Map(existing.map((p) => [`${p.gameType}_${p.propType}`, p.quantity]));
  for (const prop of newProps) {
    const key = `${prop.gameType}_${prop.propType}`;
    propMap.set(key, (propMap.get(key) || 0) + prop.quantity);
  }
  return Array.from(propMap.entries()).map((entry: any) => {
    const [key, quantity] = entry;
    const [gameType, propType] = key.split("_");
    return { gameType, propType, quantity };
  });
}

function updateTickets(existing: any[], newTickets: any[]) {
  const ticketMap = new Map(existing.map((t) => [`${t.gameType}_${t.tournamentType}`, t.quantity]));
  for (const ticket of newTickets) {
    const key = `${ticket.gameType}_${ticket.tournamentType}`;
    ticketMap.set(key, (ticketMap.get(key) || 0) + ticket.quantity);
  }
  return Array.from(ticketMap.entries()).map((entry: any) => {
    const [key, quantity] = entry;
    const [gameType, tournamentType] = key.split("_");
    return { gameType, tournamentType, quantity };
  });
}

function determineSegment(gamePoints: number): string {
  if (gamePoints >= 10000) return "Platinum";
  if (gamePoints >= 5000) return "Gold";
  if (gamePoints >= 1000) return "Silver";
  return "Bronze";
}

// Convex 函数接口
export const deductEntryFeeMutation = (mutation as any)({
  args: {
    uid: v.string(),
    gameType: v.string(),
    tournamentType: v.string(),
    entryFee: v.any(),
    inventory: v.any(),
  },
  handler: async (ctx: any, args: any): Promise<any> => {
    return await deductEntryFee(ctx, args);
  },
});

export const deductPropsMutation = (mutation as any)({
  args: {
    uid: v.string(),
    gameType: v.string(),
    propsUsed: v.any(),
    inventory: v.any(),
  },
  handler: async (ctx: any, args: any): Promise<any> => {
    return await deductProps(ctx, args);
  },
});

export const applyRulesMutation = (mutation as any)({
  args: {
    tournament: v.any(),
    uid: v.string(),
    matches: v.any(),
    player: v.any(),
    inventory: v.any(),
    playerSeason: v.any(),
  },
  handler: async (ctx: any, args: any): Promise<any> => {
    return await applyRules(ctx, args);
  },
});

export const distributeSeasonRewardsMutation = (mutation as any)({
  args: {
    seasonId: v.id("seasons"),
  },
  handler: async (ctx: any, args: any): Promise<any> => {
    return await distributeSeasonRewards(ctx, args.seasonId);
  },
});