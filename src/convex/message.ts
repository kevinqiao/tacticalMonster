import { httpAction } from "./_generated/server";
export const postMessage = httpAction(async (ctx, request) => {
    console.log("message sent")
    // await ctx.runAction(api.botHook.doAct, { txt: "how are you" })
    return new Response(null, {
        status: 200,
    });
});