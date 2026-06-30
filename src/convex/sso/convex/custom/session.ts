import { customAction, customMutation, customQuery } from "convex-helpers/server/customFunctions";

import { action, mutation, query } from "../_generated/server";
import { findIdentityByUid } from "../dao/authIdentityHelpers";



async function resolveUserFromIdentity(ctx: {

  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };

  db: any;

}) {

  const identity = await ctx.auth.getUserIdentity();

  if (!identity?.subject) {

    throw new Error("unauthenticated");

  }

  const row = await findIdentityByUid(ctx, identity.subject);

  if (!row?.uid) {

    throw new Error("unauthenticated");

  }

  return row;

}



/** Convex JWT (platform setAuth) → ctx.user from auth_identities (uid = JWT subject). */

export const authedQuery = customQuery(query, {

  args: {},

  input: async (ctx, args) => {

    const user = await resolveUserFromIdentity(ctx);

    return { ctx: { ...ctx, user }, args };

  },

});



export const authedMutation = customMutation(mutation, {

  args: {},

  input: async (ctx, args) => {

    const user = await resolveUserFromIdentity(ctx);

    return { ctx: { ...ctx, user }, args };

  },

});



export const authedAction = customAction(action, {

  args: {},

  input: async (ctx, args) => {

    const identity = await ctx.auth.getUserIdentity();

    if (!identity?.subject) {

      throw new Error("unauthenticated");

    }

    return { ctx: { ...ctx, identity }, args };

  },

});



export const whoami = authedQuery({

  args: {},

  handler: async (ctx) => {

    return {

      uid: ctx.user.uid,

      email: ctx.user.email,

    };

  },

});

