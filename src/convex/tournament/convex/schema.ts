import { defineSchema } from "convex/server";
import { activitySchema } from "./schemas/activitySchema";
import { battlePassSchema } from "./schemas/battlePassSchema";
import { rankingSchema } from "./schemas/rankingSchema";
import { rewardSchema } from "./schemas/rewardSchema";
import { tournamentRulesSchema } from "./schemas/tournamentRulesSchema";
import { tournamentSchema } from "./schemas/tournamentSchema";
import { userSchema } from "./schemas/userSchema";

// 合并所有模块的schema
export default defineSchema({
  // 用户系统
  ...userSchema,

  // 锦标赛系统
  ...tournamentSchema,

  // 道具系统
  // ...propSchema,

  // // 任务系统
  // ...taskSchema,

  // 战斗通行证系统
  ...battlePassSchema,

  // 排名推荐系统
  ...rankingSchema,

  // 锦标赛规则系统
  ...tournamentRulesSchema,

  // 统一奖励系统
  ...rewardSchema,

  // 活动系统
  ...activitySchema,

});