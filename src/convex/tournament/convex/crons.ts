import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
    "clear messages table",
    { seconds: 15 }, // every 15 seconds
    internal.service.matchService.match,
);

export default crons;