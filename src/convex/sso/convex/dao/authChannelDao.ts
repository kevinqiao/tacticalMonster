import { v } from "convex/values";

import { internalQuery } from "../_generated/server";
import { getAuthChannelByCid } from "../service/auth/authChannelCatalog";

export const find = internalQuery({
  args: { cid: v.number() },
  handler: async (_ctx, { cid }) => {
    const channel = getAuthChannelByCid(cid);
    if (!channel) return null;
    return { cid: channel.cid, provider: channel.provider };
  },
});
