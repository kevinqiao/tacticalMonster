import { getTorontoDate } from "./utils";


export async function validateLimits(ctx: any, { uid, gameType, tournamentType, isSubscribed, limits }: any) {
  const now = getTorontoDate();
  const today = now.localDate.toISOString().split("T")[0];
  const maxParticipations = isSubscribed ? limits.maxParticipations.subscribed : limits.maxParticipations.default;
  const limit = await ctx.db
    .query("player_tournament_limits")
    .withIndex("by_uid_game_type_date", (q: any) =>
      q.eq("uid", uid).eq("gameType", gameType).eq("tournamentType", tournamentType).eq("date", today)
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
  return Array.from(propMap.entries()).map(([key, quantity]) => {
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
  return Array.from(ticketMap.entries()).map(([key, quantity]) => {
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