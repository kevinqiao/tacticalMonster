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

// 示例配置
export const tournamentConfigs: Record<string, any> = {
  // 普通锦标赛 - 允许复用，每人只能提交一次
  normal: {
    rules: {
      allowReuse: true,
      maxSubmissionsPerTournament: 1, // 每人每个锦标赛只能提交1次
      dailyLimit: 5,
      maxTournamentsPerDay: 3,
      createInitialMatch: true,
      minPlayers: 2,
      maxPlayers: 50,
      timeLimit: 60,
      autoClose: true,
      autoCloseDelay: 30
    }
  },

  // 练习锦标赛 - 允许复用，可以多次提交
  practice: {
    rules: {
      allowReuse: true,
      maxSubmissionsPerTournament: 3, // 每人每个锦标赛可以提交3次
      dailyLimit: 10,
      maxTournamentsPerDay: 5,
      createInitialMatch: false,
      minPlayers: 1,
      maxPlayers: 100,
      timeLimit: 120,
      autoClose: false
    }
  },

  // 精英锦标赛 - 独立尝试，严格限制
  elite: {
    rules: {
      independentAttempts: true,
      maxAttempts: 3,
      dailyLimit: 2,
      createInitialMatch: true,
      minPlayers: 1,
      maxPlayers: 1,
      timeLimit: 90,
      autoClose: true,
      autoCloseDelay: 15
    }
  },

  // 每日挑战 - 复用模式，每日限制
  daily_challenge: {
    rules: {
      allowReuse: true,
      maxSubmissionsPerTournament: 1, // 每人每个锦标赛只能提交1次
      dailyLimit: 1,
      maxTournamentsPerDay: 1,
      createInitialMatch: true,
      minPlayers: 2,
      maxPlayers: 30,
      timeLimit: 45,
      autoClose: true,
      autoCloseDelay: 20
    }
  },

  // 无限练习 - 允许复用，无限制提交
  unlimited_practice: {
    rules: {
      allowReuse: true,
      maxSubmissionsPerTournament: -1, // -1 表示无限制
      dailyLimit: 20,
      maxTournamentsPerDay: 10,
      createInitialMatch: false,
      minPlayers: 1,
      maxPlayers: 200,
      timeLimit: 180,
      autoClose: false
    }
  }
};

export async function validateLimits(ctx: any, { uid, gameType, tournamentType, isSubscribed, limits }: any) {
  const now = getTorontoDate();
  const today = now.localDate.toISOString().split("T")[0];
  const maxParticipations = isSubscribed ? limits.maxParticipations.subscribed : limits.maxParticipations.default;
  const limit = await ctx.db
    .query("player_tournament_limits")
    .withIndex("by_uid_tournament_date", (q: any) =>
      q.eq("uid", uid).eq("tournamentType", tournamentType).eq("date", today)
    )
    .first();
  if (limit && limit.participationCount >= maxParticipations) {
    throw new Error(`今日 ${tournamentType} 已达最大参与次数 (${maxParticipations})`);
  }
  if (!limit) {
    await ctx.db.insert("player_tournament_limits", {
      uid,
      gameType,
      tournamentType,
      date: today,
      participationCount: 0,
      tournamentCount: 0,
      submissionCount: 0,
      createdAt: now.iso,
      updatedAt: now.iso,
    });
  } else {
    await ctx.db.patch(limit._id, {
      participationCount: limit.participationCount + 1,
      updatedAt: now.iso,
    });
  }
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

  if (config.rules.ranking === "threshold") {
    rank = highestScore >= config.rules.scoreThreshold ? 1 : 2;
    pointsEarned = highestScore >= config.rules.scoreThreshold ? config.rewards[0].gamePoints : config.rewards[1].gamePoints;
    reward = config.rewards.find((r: any) => r.rankRange[0] === rank);
  } else if (config.rules.ranking === "highest_score") {
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
    reward = config.rewards.find((r: any) => rank >= r.rankRange[0] && rank <= r.rankRange[1]);
    pointsEarned = reward.gamePoints;
  }

  let finalReward = { coins: reward.coins, props: reward.props, gamePoints: pointsEarned, tickets: [] };
  if (player.isSubscribed) {
    finalReward.coins *= config.subscriberBonus?.coins || 1.2;
    finalReward.gamePoints *= config.subscriberBonus?.gamePoints || 1.5;
  }
  if (player.segmentName === "Gold") {
    finalReward.coins *= 1.1;
    finalReward.gamePoints *= 1.1;
  } else if (player.segmentName === "Platinum") {
    finalReward.coins *= 1.2;
    finalReward.gamePoints *= 1.2;
  }

  await ctx.db.patch(inventory._id, {
    coins: inventory.coins + finalReward.coins,
    props: updateProps(inventory.props, finalReward.props),
    tickets: updateTickets(inventory.tickets, finalReward.tickets ? finalReward.tickets : []),
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

  if (config.share && Math.random() < config.share.probability && rank >= config.share.rankRange[0] && rank <= config.share.rankRange[1]) {
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