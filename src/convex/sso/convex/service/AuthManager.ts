"use node"

import { v } from "convex/values";

import type { User } from "../../../../host/service/UserManager";

import { internal } from "../_generated/api";

import { action } from "../_generated/server";

import { authenticateWithChannel } from "./auth/authenticateWithChannel";

import { verifyPlatformAccessToken } from "./auth/platformJwtVerify";



export const authenticate = action({

    args: { cid: v.number(), partner: v.optional(v.number()), data: v.any() },

    handler: async (ctx, { cid, partner, data }): Promise<User | null> => {

        return authenticateWithChannel(ctx, cid, partner, data);

    }

});



export const signUp = action({

    args: { cid: v.number(), partner: v.optional(v.number()), data: v.any() },

    handler: async (ctx, { cid, partner, data }) => {

        const channel = await ctx.runQuery(internal.dao.authChannelDao.find, { cid });

        if (!channel) return null;



        const { AuthenticatorFactory } = await import("./provider/AuthenticatorFactory");

        const authenticator = AuthenticatorFactory.createAuthenticator(channel);

        if (!authenticator?.signUp) return null;



        const user = await authenticator.signUp(ctx, partner, data);

        if (user?.uid) {

            const { attachPlatformAccess, stripUserForClient } = await import("./auth/platformClientUser");

            return attachPlatformAccess(stripUserForClient(user as Record<string, unknown>));

        }

        return user;

    }

});



export const signOut = action({

    args: { platformAccessToken: v.string() },

    handler: async (ctx, { platformAccessToken }): Promise<boolean> => {

        const uid = verifyPlatformAccessToken(platformAccessToken);

        if (!uid) return false;

        await ctx.runMutation(internal.dao.authIdentityDao.logout, { uid });

        return true;

    }

});



export const updateData = action({

    args: { platformAccessToken: v.string(), data: v.any() },

    handler: async (ctx, { platformAccessToken, data }): Promise<boolean> => {

        const uid = verifyPlatformAccessToken(platformAccessToken);

        if (!uid) return false;



        const payload = data && typeof data === "object" ? data as Record<string, unknown> : {};

        const name = typeof payload.name === "string" ? payload.name : undefined;

        const phone = typeof payload.phone === "string" ? payload.phone : undefined;



        const { name: _n, phone: _p, ...rest } = payload;



        const identity = await ctx.runQuery(internal.dao.authIdentityDao.findByUid, { uid });

        if (

            identity?.provider === "web" &&

            typeof identity.subject === "string" &&

            (name !== undefined || phone !== undefined)

        ) {

            await ctx.runMutation(internal.dao.userDao.updateProfile, {

                accountId: identity.subject,

                name,

                phone,

            });

        }



        await ctx.runMutation(internal.dao.authIdentityDao.updateIdentityProfile, {

            uid,

            name,

            phone,

            ...(Object.keys(rest).length > 0 ? { data: rest } : {}),

        });

        return true;

    }

});
