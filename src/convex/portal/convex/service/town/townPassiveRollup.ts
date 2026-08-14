import { ZONE_GLOBAL } from "./zoneEconomyConfig";

function utcDayKey(ts = Date.now()): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function dayKeysRolling(days: number, now = Date.now()): string[] {
  const keys: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(now - i * 86_400_000);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

type PassiveCtx = { db: any; uid: string; townId: string };

export async function recordTownCoinIncome(
  ctx: PassiveCtx,
  uid: string,
  townId: string,
  amount: number,
  kind: "passive" | "other",
  now = Date.now()
): Promise<void> {
  const coins = Math.max(0, Math.floor(amount));
  if (coins <= 0) return;

  const dayKey = utcDayKey(now);
  const row = await ctx.db
    .query("town_passive_state")
    .withIndex("by_uid_townId_dayKey", (q: any) =>
      q.eq("uid", uid).eq("townId", townId).eq("dayKey", dayKey)
    )
    .unique();

  if (row) {
    await ctx.db.patch(row._id, {
      passiveCoins: Math.max(0, (row.passiveCoins ?? 0) + (kind === "passive" ? coins : 0)),
      otherCoins: Math.max(0, (row.otherCoins ?? 0) + (kind === "other" ? coins : 0)),
      updatedAt: now,
    });
    return;
  }

  await ctx.db.insert("town_passive_state", {
    uid,
    townId,
    dayKey,
    passiveCoins: kind === "passive" ? coins : 0,
    otherCoins: kind === "other" ? coins : 0,
    updatedAt: now,
  });
}

export async function passiveCapAllowance(
  ctx: PassiveCtx,
  uid: string,
  townId: string,
  now = Date.now()
): Promise<number> {
  const keys = dayKeysRolling(ZONE_GLOBAL.passiveCapRollingDays, now);
  let sumPassive = 0;
  let sumOther = 0;

  for (const dayKey of keys) {
    const row = await ctx.db
      .query("town_passive_state")
      .withIndex("by_uid_townId_dayKey", (q: any) =>
        q.eq("uid", uid).eq("townId", townId).eq("dayKey", dayKey)
      )
      .unique();
    if (!row) continue;
    sumPassive += row.passiveCoins ?? 0;
    sumOther += row.otherCoins ?? 0;
  }

  const share = ZONE_GLOBAL.passiveCapWeeklyShare;
  const ratio = share / (1 - share);
  return Math.max(0, Math.floor(ratio * sumOther - sumPassive));
}

export function townIdFromScopeKey(scopeKey: string): string | undefined {
  if (!scopeKey.startsWith("town:")) return undefined;
  const townId = scopeKey.slice("town:".length);
  return townId.length > 0 ? townId : undefined;
}
