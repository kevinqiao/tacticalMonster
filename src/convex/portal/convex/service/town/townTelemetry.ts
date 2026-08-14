type TelemetryCtx = { db: any; uid: string };

export async function logTownEvent(
  ctx: TelemetryCtx,
  event: string,
  props?: Record<string, string | number | boolean>,
  now = Date.now()
): Promise<void> {
  await ctx.db.insert("town_analytics_events", {
    uid: ctx.uid,
    event,
    props,
    createdAt: now,
  });
}
