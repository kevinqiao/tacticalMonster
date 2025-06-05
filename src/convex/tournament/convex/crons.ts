import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
    "clearmatch queue table",
    { seconds: 15 }, // every 5 seconds
    internal.service.match.match,
);

export default crons;