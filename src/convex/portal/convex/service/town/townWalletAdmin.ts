import { internalMutation } from "../../_generated/server";
import { applyWalletDelta } from "../economy/portalWalletDao";
import {
  collectTownTicketGrantTargets,
  TOWN_COIN_GRANT_V1_AMOUNT,
  TOWN_COIN_GRANT_V1_REASON,
  TOWN_TICKET_GRANT_V1_AMOUNT,
  TOWN_TICKET_GRANT_V1_REASON,
} from "./townTicketGrant";

async function alreadyGrantedTownWallet(
  ctx: { db: { query: (table: "portal_coin_ledger") => any } },
  uid: string,
  scopeKey: string,
  reason: string,
  kind: "coins" | "tickets"
): Promise<boolean> {
  const rows = await ctx.db
    .query("portal_coin_ledger")
    .withIndex("by_uid_scopeKey_created", (q: any) =>
      q.eq("uid", uid).eq("scopeKey", scopeKey)
    )
    .collect();
  return rows.some(
    (row: { reason?: string; kind?: string }) =>
      row.reason === reason && row.kind === kind
  );
}

/** One-time +1000 tickets to every Town wallet / town_progress account. Idempotent. */
export const grantTownTicketsToAllAccounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const wallets = await ctx.db.query("portal_player_wallets").collect();
    const progress = await ctx.db.query("town_progress").collect();
    const targets = collectTownTicketGrantTargets({ wallets, progress });

    let granted = 0;
    let skipped = 0;
    let failed = 0;
    for (const target of targets) {
      if (
        await alreadyGrantedTownWallet(
          ctx,
          target.uid,
          target.scopeKey,
          TOWN_TICKET_GRANT_V1_REASON,
          "tickets"
        )
      ) {
        skipped += 1;
        continue;
      }
      const result = await applyWalletDelta(ctx, {
        uid: target.uid,
        scopeKey: target.scopeKey,
        kind: "tickets",
        delta: TOWN_TICKET_GRANT_V1_AMOUNT,
        reason: TOWN_TICKET_GRANT_V1_REASON,
      });
      if (result.ok) granted += 1;
      else failed += 1;
    }

    return {
      ok: true as const,
      amount: TOWN_TICKET_GRANT_V1_AMOUNT,
      targets: targets.length,
      granted,
      skipped,
      failed,
    };
  },
});

/** One-time +3000 coins to every Town wallet / town_progress account. Idempotent. */
export const grantTownCoinsToAllAccounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const wallets = await ctx.db.query("portal_player_wallets").collect();
    const progress = await ctx.db.query("town_progress").collect();
    const targets = collectTownTicketGrantTargets({ wallets, progress });

    let granted = 0;
    let skipped = 0;
    let failed = 0;
    for (const target of targets) {
      if (
        await alreadyGrantedTownWallet(
          ctx,
          target.uid,
          target.scopeKey,
          TOWN_COIN_GRANT_V1_REASON,
          "coins"
        )
      ) {
        skipped += 1;
        continue;
      }
      const result = await applyWalletDelta(ctx, {
        uid: target.uid,
        scopeKey: target.scopeKey,
        kind: "coins",
        delta: TOWN_COIN_GRANT_V1_AMOUNT,
        reason: TOWN_COIN_GRANT_V1_REASON,
      });
      if (result.ok) granted += 1;
      else failed += 1;
    }

    return {
      ok: true as const,
      amount: TOWN_COIN_GRANT_V1_AMOUNT,
      targets: targets.length,
      granted,
      skipped,
      failed,
    };
  },
});
