import { defineSchema } from "convex/server";
import { battlePassSchema } from "./schemas/battlePassSchema";
import { propSchema } from "./schemas/propSchema";
import { segmentSchema } from "./schemas/segmentSchema";
import { taskSchema } from "./schemas/taskSchema";
import { ticketSchema } from "./schemas/ticketSchema";
import { tournamentSchema } from "./schemas/tournamentSchema";
import { userSchema } from "./schemas/userSchema";

// 合并所有模块的schema
export default defineSchema({
  // 用户系统
  ...userSchema,

  // 锦标赛系统
  ...tournamentSchema,

  // 段位系统
  ...segmentSchema,

  // 道具系统
  ...propSchema,

  // 门票系统
  ...ticketSchema,

  // 任务系统
  ...taskSchema,

  // 战斗通行证系统
  ...battlePassSchema,

});