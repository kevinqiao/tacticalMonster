import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
    "clearmatch queue table",
    { seconds: 15 }, // every 5 seconds
    internal.service.match.match,
);
const seasonCronJobs = cronJobs();

seasonCronJobs.daily(
    "season start",
    {
        hourUTC: 16, // 9:30am Pacific (UTC-7 during DST, UTC-8 during standard time)
        minuteUTC: 30,
    },
    internal.service.season.createNextSeason
)

export default seasonCronJobs;