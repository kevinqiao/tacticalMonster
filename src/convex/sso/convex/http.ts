import { httpRouter } from "convex/server";
// import jwt from "jsonwebtoken";
import { api, internal } from "./_generated/api";
import { httpAction } from "./_generated/server";


const http = httpRouter();

http.route({
  path: "/event/sync",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authorizaton = request.headers.get("Authorization");
    const token = authorizaton?.split(" ")[1];
    if (!token) return new Response("Unauthorized", { status: 401 });


    const events = await request.json();
    console.log("events", events);
    const result = await ctx.runAction(api.service.EventManager.save, { events });

    // console.log("result",result);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      })
    });
  }),
});
http.route({
  path: "/asset/debit",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    console.log("debit");
    const debit = await request.json();
    console.log("debit: ", debit);
    const user = await ctx.runQuery(internal.dao.userDao.find, { uid: debit.uid });
    console.log("user: ", user);
    // if (!user) return new Response("Unauthorized", { status: 401 });
    // if (!user || user.token !== debit.token) return new Response("Unauthorized", { status: 401 });
    // console.log("result",result);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      })
    });
  }),
});
http.route({
  path: "/asset/credit",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const credit = await request.json();
    const user = await ctx.runQuery(internal.dao.userDao.find, { uid: credit.uid });
    // if (!user) return new Response("Unauthorized", { status: 401 });
    if (!user || user.token !== credit.token) return new Response("Unauthorized", { status: 401 });

    // console.log("result",result);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      })
    });
  }),
});


// Convex expects the router to be the default export of `convex/http.js`.
export default http;