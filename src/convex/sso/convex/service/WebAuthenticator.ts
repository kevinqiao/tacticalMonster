"use node"
import { v } from "convex/values";
import jwt from "jsonwebtoken";
import { User } from "../../../../service/UserManager";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { handle } from "./handler/CustomAuthHandler";
const REFRESH_TOKEN_EXPIRE = 600 * 1000;
const ACCESS_TOKEN_SECRET = "12222222";
export interface CUser {
    cid?: string;
    cuid: string;
    name?: string;
    data?: { [k: string]: any };
}
export const authenticate = action({
    args: { cid: v.string(), data: v.any(), platformId: v.number() },
    handler: async (ctx, { cid, data, platformId }): Promise<User | null> => {
        const platformDoc = await ctx.runQuery(internal.dao.platformDao.find, { pid: platformId });
        const cuser = handle(cid, data);

        if (cuser?.cuid && cuser?.cid) {
            await ctx.runMutation(internal.dao.cuserDao.update, { cuid: cuser.cuid, cid: cuser.cid, data: cuser.data });
            const uid = platformId + "-" + cuser.cuid;
            const partner = platformDoc?.partner ?? 0;
            let user: User | null = await ctx.runQuery(internal.dao.userDao.find, { uid });
            if (!user) {
                user = await ctx.runMutation(internal.dao.userDao.create, { cuid: cuser.cuid, partner, token: "", platform: platformId, data: cuser.data });
            }
            if (user?.uid) {
                const token = jwt.sign({ uid: user.uid, cid, expire: REFRESH_TOKEN_EXPIRE }, ACCESS_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });
                await ctx.runMutation(internal.dao.userDao.updateToken, { uid: user.uid, token });
                return Object.assign({}, user, { token, expire: REFRESH_TOKEN_EXPIRE, _id: undefined, _creationTime: undefined });
            }
        }
        return null;
    }
});

