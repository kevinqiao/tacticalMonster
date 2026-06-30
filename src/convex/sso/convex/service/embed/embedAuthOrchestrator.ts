"use node";

import type { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { User } from "../../../../host/service/UserManager";
import type { EmbedAuthMethod } from "./embedAuthConstants";
import { resolveEmbedAuthProvider } from "./embedAuthRegistry";
import type { PartnerEmbedContext } from "./embedAuthTypes";
import { completeEmbedSession } from "./completeEmbedSession";

export async function performEmbedCredentialExchange(
  ctx: ActionCtx,
  args: {
    pid: number;
    credential: string;
    method?: EmbedAuthMethod;
    merchantSlug?: string;
  }
): Promise<User | null> {
  if (args.merchantSlug?.trim()) {
    const { resolveMerchantPartnerId } = await import("../bridge/merchantCampaignResolve");
    const expected = await resolveMerchantPartnerId(args.merchantSlug);
    if (expected == null || expected !== args.pid) {
      return null;
    }
  }

  const partner = (await ctx.runQuery(internal.service.PartnerManager.findInternal, {
    pid: args.pid,
  })) as PartnerEmbedContext | null;
  if (!partner) return null;

  const provider = resolveEmbedAuthProvider(partner, args.method);
  if (!provider) return null;

  const identity = await provider.verify({
    pid: args.pid,
    credential: args.credential,
    partner,
  });
  if (!identity) return null;

  return completeEmbedSession(ctx, args.pid, identity);
}
