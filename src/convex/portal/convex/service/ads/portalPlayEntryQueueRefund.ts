/**
 * Refund ad/ticket ladder payment when a matchmaking queue row is abandoned
 * before a table opens (leave queue, expire-exit, open failed, etc.).
 */

import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { PORTAL_AD_ENTRY_GRANT_TTL_MS } from "../../data/portalAdEntryConfig";
import { getPortalTournamentDefinition } from "../../data/portalTournamentConfigs";
import { dailyPeriodKey } from "../../utils/casualTaskPeriod";
import { applyWalletDelta } from "../economy/portalWalletDao";
import { resolveEconomyScope } from "../economy/resolveEconomyScope";
import { partnerIdFromUid } from "./partnerAdReplayConfig";
import {
  decrementAdEntryUsedToday,
  decrementTicketEntryUsedToday,
} from "./portalEntryDailyUsage";
import { lobbyIdFromRun } from "../../data/portalPlayContext";
import type { PlayEntryContext } from "./portalEntryUsageScope";
import {
  quotaScopeFromSettings,
  resolvePlayEntrySettings,
  ticketConfigFromSettings,
} from "./resolvePlayEntrySettings";

function randomHexId(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * If the queue row paid via ad/ticket and never matched, restore that payment.
 * Clears `playEntryLane` on the row so a later delete cannot double-refund.
 */
export async function refundAbandonedQueuePlayEntry(
  ctx: MutationCtx,
  row: Doc<"portal_match_queue">
): Promise<{ refunded: boolean; lane?: "ad" | "ticket" }> {
  const lane = row.playEntryLane;
  if (lane !== "ad" && lane !== "ticket") {
    return { refunded: false };
  }
  // Already matched / settled — payment sticks with the opened run.
  if (row.status === "matched") {
    return { refunded: false };
  }

  const def = getPortalTournamentDefinition(row.templateId);
  const mode =
    def?.matchType === "solo_p75"
      ? ("solo" as const)
      : def?.matchType === "multi_ranked"
        ? ("multi" as const)
        : null;
  if (!mode) {
    await ctx.db.patch(row._id, { playEntryLane: undefined });
    return { refunded: false };
  }

  const now = Date.now();
  const entryCtx: PlayEntryContext = {
    lobbyId: lobbyIdFromRun(row) ?? null,
    tournamentId: row.templateId,
  };
  const { settings } = await resolvePlayEntrySettings(ctx, {
    partnerId: partnerIdFromUid(row.uid),
    lobbyId: entryCtx.lobbyId,
    tournamentId: entryCtx.tournamentId,
  });
  const quotaScope = quotaScopeFromSettings(settings);
  const dayKey = dailyPeriodKey(now);

  if (lane === "ad") {
    await decrementAdEntryUsedToday(ctx, {
      uid: row.uid,
      dayKey,
      mode,
      now,
      entryCtx,
      quotaScope,
    });
    // Restore a ready grant so the player need not re-watch the ad.
    const grantId = randomHexId(16);
    await ctx.db.insert("portal_ad_entry_grants", {
      grantId,
      uid: row.uid,
      mode,
      sessionId: `queue_refund:${row._id}`,
      dayKey,
      status: "ready",
      createdAt: now,
      expiresAt: now + PORTAL_AD_ENTRY_GRANT_TTL_MS,
    });
  } else {
    await decrementTicketEntryUsedToday(ctx, {
      uid: row.uid,
      dayKey,
      mode,
      now,
      entryCtx,
      quotaScope,
    });
    const price =
      typeof row.ticketEntryPriceTickets === "number" &&
      Number.isFinite(row.ticketEntryPriceTickets)
        ? Math.max(0, Math.floor(row.ticketEntryPriceTickets))
        : ticketConfigFromSettings(settings, mode).priceTickets;
    if (price > 0) {
      let scopeKey = "shared";
      let lobbyId: typeof entryCtx.lobbyId = entryCtx.lobbyId;
      try {
        const scope = await resolveEconomyScope(ctx, {
          partnerId: partnerIdFromUid(row.uid),
          lobbyId: entryCtx.lobbyId,
        });
        scopeKey = scope.scopeKey;
        lobbyId = scope.lobbyId;
      } catch {
        scopeKey = "shared";
        lobbyId = null;
      }
      await applyWalletDelta(ctx, {
        uid: row.uid,
        scopeKey,
        lobbyId: lobbyId ?? null,
        kind: "tickets",
        delta: price,
        reason: `ticket_entry_queue_refund:${mode}`,
      });
    }
  }

  await ctx.db.patch(row._id, {
    playEntryLane: undefined,
    ticketEntryPriceTickets: undefined,
  });
  return { refunded: true, lane };
}
