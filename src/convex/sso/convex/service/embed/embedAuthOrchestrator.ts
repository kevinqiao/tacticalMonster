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
    partnerSlug?: string;
  }
): Promise<User | null> {
  if (args.partnerSlug?.trim()) {
    const { resolvePartnerIdByPartnerSlug } = await import("../bridge/merchantCampaignResolve");
    const { api } = await import("../../_generated/api");
    const slug = args.partnerSlug.trim();
    const fromBrand = await resolvePartnerIdByPartnerSlug(slug);
    const storeRow =
      fromBrand == null
        ? ((await ctx.runQuery(api.service.partner.storeAdmin.resolvePartnerByStoreSlug, {
            storeSlug: slug,
          })) as { partnerId: number } | null)
        : null;
    const expected = fromBrand ?? storeRow?.partnerId ?? null;
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
