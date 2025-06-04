import { httpRouter } from "convex/server";
// import jwt from "jsonwebtoken";
import { httpAction } from "./convex/_generated/server";


const http = httpRouter();

http.route({
  path: "/match/join",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authorizaton = request.headers.get("Authorization");
    const token = authorizaton?.split(" ")[1];
    if (!token) return new Response("Unauthorized", { status: 401 });

    const player = await request.json();


    //  const result = await ctx.runAction(api.service.EventReceiver.save, { token,events });

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
  path: "/match/settle",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authorizaton = request.headers.get("Authorization");
    const token = authorizaton?.split(" ")[1];
    if (!token) return new Response("Unauthorized", { status: 401 });


    const game = await request.json();
    console.log("game", game);

    //  const result = await ctx.runAction(api.service.EventReceiver.save, { token,events });

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