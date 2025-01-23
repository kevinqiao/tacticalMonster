import { httpRouter } from "convex/server";
// import jwt from "jsonwebtoken";
import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";


const http = httpRouter();

http.route({
  path: "/event/sync",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
     const authorizaton = request.headers.get("Authorization");
     const token = authorizaton?.split(" ")[1];
     if(!token) return new Response("Unauthorized", { status: 401 });
     
 
     const events = await request.json();
     const result = await ctx.runAction(api.service.EventReceiver.save, { token,events });

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