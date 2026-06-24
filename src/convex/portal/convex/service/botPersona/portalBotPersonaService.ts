import type { MutationCtx, QueryCtx } from "../../_generated/server";
import {
  PORTAL_BOT_PERSONA_DEFAULTS,
  PORTAL_BOT_PERSONA_POOL_SIZE,
} from "./portalBotPersonaDefaults";

function hashAnchorSlot(anchorKey: string, slot: number): number {
  let h = 2166136261;
  const s = `${anchorKey}:${slot}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % PORTAL_BOT_PERSONA_POOL_SIZE;
}

/** 确定性从 persona 池选人（对局 matchId / 周榜 cohortKey + slot）。 */
export function pickBotPersonaId(anchorKey: string, slot: number): string {
  const idx = hashAnchorSlot(anchorKey, slot);
  return PORTAL_BOT_PERSONA_DEFAULTS[idx]?.botPersonaId ?? `pp_${idx}`;
}

export async function ensureBotPersonasSeeded(
  ctx: MutationCtx,
  now: number = Date.now()
): Promise<void> {
  const existing = await ctx.db.query("portal_bot_personas").first();
  if (existing) return;

  for (const p of PORTAL_BOT_PERSONA_DEFAULTS) {
    await ctx.db.insert("portal_bot_personas", {
      botPersonaId: p.botPersonaId,
      poolIndex: p.poolIndex,
      displayName: p.displayName,
      ...(p.avatarUrl ? { avatarUrl: p.avatarUrl } : {}),
      createdAt: now,
    });
  }
}

export async function getBotPersonaById(
  ctx: QueryCtx | MutationCtx,
  botPersonaId: string
) {
  return await ctx.db
    .query("portal_bot_personas")
    .withIndex("by_personaId", (q) => q.eq("botPersonaId", botPersonaId))
    .unique();
}

export async function loadBotPersonaDisplayMap(
  ctx: QueryCtx,
  personaIds: string[]
): Promise<Map<string, { displayName: string; avatarUrl?: string }>> {
  const unique = [...new Set(personaIds)];
  const map = new Map<string, { displayName: string; avatarUrl?: string }>();
  for (const id of unique) {
    const row = await getBotPersonaById(ctx, id);
    if (row) {
      map.set(id, {
        displayName: row.displayName,
        ...(row.avatarUrl ? { avatarUrl: row.avatarUrl } : {}),
      });
    } else {
      map.set(id, { displayName: id });
    }
  }
  return map;
}
