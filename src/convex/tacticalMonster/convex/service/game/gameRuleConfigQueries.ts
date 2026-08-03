/**
 * 关卡规则配置相关 Convex queries
 */

import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";
import { GameRuleConfigService } from "./gameRuleConfigService";

export const getGameRuleConfigWithOverrides = internalQuery({
  args: { ruleId: v.string() },
  handler: async (ctx, args) => {
    return await GameRuleConfigService.getGameRuleConfigWithOverrides(ctx, args.ruleId);
  },
});
