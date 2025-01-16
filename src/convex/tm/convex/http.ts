import { httpRouter } from "convex/server";
// import jwt from "jsonwebtoken";
import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";


const http = httpRouter();

http.route({
  path: "/signin",
  method: "POST",
handler: httpAction(async (ctx, request) => {
  
    const body = await request.json();
    const accessToken = body.access_token;
    const result = await ctx.runAction(api.service.auth.signin, { access_token: accessToken });
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


// Convex expects the router to be the default export of `convex/http.js`.
export default http;