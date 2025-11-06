import { httpRouter } from "convex/server";
// import jwt from "jsonwebtoken";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";


const http = httpRouter();

http.route({
  path: "/match/check",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // const body = await request.json();
    // console.log("check match", body);
    // const mid = body.matchId;
    // const match = await ctx.runQuery(internal.dao.matchDao.find, { mid });
    // console.log("match", match);
    // const status = match?.status ?? 0;
    // const result = { ok: status < 2 };

    // return new Response(JSON.stringify(result), {
    //   status: 200,
    //   headers: new Headers({
    //     "Access-Control-Allow-Origin": "*",
    //     "Content-Type": "application/json",
    //   }),
    // });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }),
    });
  }),
});




// 添加 OPTIONS 处理
http.route({
  path: "/signin",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    return new Response(null, {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      }),
    });
  }),
});
http.route({
  path: "/signout",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    return new Response(null, {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      }),
    });
  }),
});
http.route({
  path: "/findMatchGame",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body: { gameId: string } = await request.json();
    const match = await ctx.runQuery(internal.service.tournament.matchManager.findMatchGame, { gameId: body.gameId });
    const result = { ok: match ? true : false, match };
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",

      }),
    });
  }),
});
http.route({
  path: "/test",
  method: "POST",
  handler: httpAction(async (_, request) => {
    const body = await request.json();
    console.log("test", body);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }),
    });
  }),
});
http.route({
  path: "/signin",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    console.log("signin", body);
    const accessToken = body.access_token;
    const player = await ctx.runAction(internal.service.auth.signin, {
      access_token: accessToken,
      expire: body.expire
    });

    return new Response(JSON.stringify({ ok: player !== null, player }), {
      status: 200,
      headers: new Headers({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      })
    });
  }),
});
http.route({
  path: "/signout",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    console.log("signout", body);
    try {

      const player: any = await ctx.runQuery(internal.dao.playerDao.find, { uid: body.uid });
      console.log("player", player);
      // if (player) {
      //   await ctx.runMutation(internal.dao.gamePlayerDao.update, {
      //     uid: body.uid,
      //     data: { token: null }
      //   });
      // }
    } catch (error) {
      console.error("signout error", error);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: new Headers({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      })
    });
  }),
});
// Convex expects the router to be the default export of `convex/http.js`.
export default http;