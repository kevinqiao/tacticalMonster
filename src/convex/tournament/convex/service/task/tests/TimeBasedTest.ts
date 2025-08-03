import { mutation } from "../../../_generated/server";
import { TaskSystem } from "../taskSystem";

export const testTimeBased = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        await TaskSystem.processTaskEvent(ctx, {
            uid: "2-22222",
            action: "complete_match",
            actionData: { increment: 1 }
        });
    },
});
