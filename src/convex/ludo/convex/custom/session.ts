import { customAction, customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { action, mutation, query } from "../_generated/server";
import { requireIdentityUid } from "../../../shared/platformAuth/requireIdentity";

type AuthedCtx = { uid: string };

async function authedInput(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }, args: unknown) {
  const uid = await requireIdentityUid(ctx);
  return { ctx: { ...ctx, uid } as typeof ctx & AuthedCtx, args };
}

export const authedQuery = customQuery(query, {
  args: {},
  input: authedInput,
});

export const authedMutation = customMutation(mutation, {
  args: {},
  input: authedInput,
});

export const authedAction = customAction(action, {
  args: {},
  input: authedInput,
});
