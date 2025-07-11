import { defineSchema } from "convex/server";
import { propSchema } from "./propSchema";
import { segmentSchema } from "./segmentSchema";
import { taskSchema } from "./taskSchema";
import { ticketSchema } from "./ticketSchema";
import { tournamentSchema } from "./tournamentSchema";
import { userSchema } from "./userSchema";

// 合并所有模块的schema
export const schema = defineSchema({
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
}); 