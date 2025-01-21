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
      const result = await ctx.runAction(api.service.auth.signin, { access_token: accessToken,expire:body.expire+Date.now()});
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
// http.route({
//   path: "/refresh",
//   method: "POST",
//   handler: httpAction(async (ctx, request) => {     
//       const body = await request.json();
//       const {uid,token} = body;
//       const result = await ctx.runAction(api.service.auth.refresh, { uid,token });
//       // console.log("result",result);
//       return new Response(JSON.stringify(result), {
//         status: 200,
//         headers: new Headers({
//           "Access-Control-Allow-Origin": "*",
//           "Content-Type": "application/json"
//         })
//       });
//     }),
// });
http.route({
  path: "/signout",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
     
      const body = await request.json();
      const {uid,token} = body;
      const result = await ctx.runAction(api.service.auth.signout, { uid,token });
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