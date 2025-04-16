import { httpRouter } from "convex/server";
// import jwt from "jsonwebtoken";
import { api, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";


const http = httpRouter();

// http.route({
//   path: "/signin",
//   method: "POST",
//   handler: httpAction(async (ctx, request) => {
//     console.log("signin");

//     const body = await request.json();
//     const accessToken = body.access_token;
//     const result = await ctx.runAction(api.service.auth.signin, { access_token: accessToken, expire: body.expire + Date.now() });
//     console.log("result", result);
//     return new Response(JSON.stringify(result), {
//       status: 200,
//       headers: new Headers({
//         "Content-Type": "application/json",
//         "Access-Control-Allow-Origin": "*",
//       })
//     });
//   }),
// });




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
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
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
  path: "/signin",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    console.log("signin", body);
    const accessToken = body.access_token;
    const player = await ctx.runAction(api.service.auth.signin, {
      access_token: accessToken,
      expire: body.expire + Date.now()
    });

    return new Response(JSON.stringify({ ok: player !== null, player }), {
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
http.route({
  path: "/signout",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    console.log("signout", body);
    try {

      const player: any = await ctx.runQuery(internal.dao.gamePlayerDao.find, { uid: body.uid });
      console.log("player", player);
      if (player) {
        await ctx.runMutation(internal.dao.gamePlayerDao.update, {
          uid: body.uid,
          data: { token: "" }
        });
      }
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