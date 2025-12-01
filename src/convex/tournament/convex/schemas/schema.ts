import { defineSchema } from "convex/server";
import { battlePassSchema } from "./battlePassSchema";
import { leaderboardSchema } from "./leaderboardSchema";
import { taskSchema } from "./taskSchema";
import { tournamentSchema } from "./tournamentSchema";

export default defineSchema({
    ...tournamentSchema,
    ...taskSchema,
    ...battlePassSchema,
    ...leaderboardSchema,
}); 