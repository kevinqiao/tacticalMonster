import { mutation } from "../../../_generated/server";
import { TaskSystem } from "../taskSystem";

export const testProcessTaskEvent = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        await TaskSystem.processTaskEvent(ctx, {
            uid: "2-22222",
            action: "login",
            actionData: { increment: 1 }
        });
    },
});