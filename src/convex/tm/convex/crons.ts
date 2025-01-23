import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "sync game events",
  { minutes: 1 }, 
  internal.service.GlobalEventSync.sync,
  { appid: "combat" }, 
);



export default crons;