import { defineSchema } from "convex/server";
import { battlePassSchema } from "./battlePassSchema";
import { leaderboardSchema } from "./leaderboardSchema";
import { playerSchema } from "./playerSchema";
import { segmentSchema } from "./segmentSchema";
import { taskSchema } from "./taskSchema";
import { ticketSchema } from "./ticketSchema";
import { tournamentSchema } from "./tournamentSchema";

export default defineSchema({
    ...tournamentSchema,
    ...playerSchema,
    ...taskSchema,
    ...ticketSchema,
    ...battlePassSchema,
    ...leaderboardSchema,
    ...segmentSchema,
}); 