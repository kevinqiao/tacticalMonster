import { mutation } from "../../../_generated/server";
import { TaskSystem } from "../taskSystem";

export const testInviteFriend = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        await TaskSystem.processTaskEvent(ctx, {
            uid: "2-22222",
            action: "invite_friend",
            actionData: { increment: 1 }
        });
    },
});
export const testShareGame = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        await TaskSystem.processTaskEvent(ctx, {
            uid: "2-22222",
            action: "share_game",
            actionData: { increment: 1 }
        });
    },
});
export const testJoinClan = (mutation as any)({
    args: {},
    handler: async (ctx: any) => {
        await TaskSystem.processTaskEvent(ctx, {
            uid: "2-22222",
            action: "join_clan",
            actionData: { increment: 1 }
        });
    },
});