import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

const crons = cronJobs();

// crons.interval(
//     "settle match",
//     { seconds: 2 }, // every minute
//     internal.matchqueue.settleMatch,
// );
crons.interval(
    "battle settle",
    { seconds: 30 }, // every minute
    api.battle.schedule,
);
crons.interval(
    "tournament settle",
    { seconds: 30 }, // every minute
    internal.tournaments.schedule,
);


//  
export default crons