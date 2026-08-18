import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

const http = httpRouter();

http.route({
  path: "/findMatchGame",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 200, headers: new Headers(cors) })),
});

http.route({
  path: "/findMatchGame",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body: { gameId: string } = await request.json();
    const match = await ctx.runQuery(internal.service.rpg.controller.findMatchGame, { gameId: body.gameId });
    return new Response(JSON.stringify({ ok: Boolean(match), match }), {
      status: 200,
      headers: new Headers(cors),
    });
  }),
});

http.route({
  path: "/submitGameScore",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 200, headers: new Headers(cors) })),
});

http.route({
  path: "/submitGameScore",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body: { gameId: string; score: number } = await request.json();
    const res = await ctx.runMutation(internal.service.rpg.controller.submitGameScore, {
      gameId: body.gameId,
      score: body.score,
    });
    return new Response(JSON.stringify(res), {
      status: 200,
      headers: new Headers(cors),
    });
  }),
});

export default http;
