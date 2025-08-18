import { defineSchema } from "convex/server";
import { battlePassSchema } from "./schemas/battlePassSchema";
import { segmentSchema } from "./schemas/segmentSchema";
import { taskSchema } from "./schemas/taskSchema";
import { ticketSchema } from "./schemas/ticketSchema";
import { tournamentRulesSchema } from "./schemas/tournamentRulesSchema";
import { tournamentSchema } from "./schemas/tournamentSchema";
import { userSchema } from "./schemas/userSchema";
import scoreThresholdSchema from "./service/tournament/scoreThresholdControl/scoreThresholdSchema";

// 合并所有模块的schema
export default defineSchema({
  // 用户系统
  ...userSchema,

  // 锦标赛系统
  ...tournamentSchema,

  // 段位系统
  ...segmentSchema,

  // 道具系统
  // ...propSchema,

  // 门票系统
  ...ticketSchema,

  // 任务系统
  ...taskSchema,

  // 战斗通行证系统
  ...battlePassSchema,

  // 分数门槛控制系统
  ...scoreThresholdSchema,

  // 锦标赛规则系统
  ...tournamentRulesSchema,

});