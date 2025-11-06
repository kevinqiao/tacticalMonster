import { defineSchema } from "convex/server";
import { battlePassSchema } from "./battlePassSchema";
import { leaderboardSchema } from "./leaderboardSchema";
import { segmentSchema } from "./segmentSchema";
import { taskSchema } from "./taskSchema";
import { ticketSchema } from "./ticketSchema";
import { tournamentSchema } from "./tournamentSchema";

export default defineSchema({
    ...tournamentSchema,
    ...taskSchema,
    ...ticketSchema,
    ...battlePassSchema,
    ...leaderboardSchema,
    ...segmentSchema,
}); 