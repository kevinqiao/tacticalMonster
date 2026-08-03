"use node";

import * as https from "node:https";
import { SignJWT, importPKCS8 } from "jose";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { getPasskitApnsConfig, passkitPassTypeId } from "./passkitEnv";

async function sendApnsSilent(pushToken: string): Promise<void> {
  const apns = getPasskitApnsConfig();
  const passTypeId = passkitPassTypeId();
  if (!apns || !passTypeId) return;

  const key = await importPKCS8(apns.keyPem, "ES256");
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: apns.keyId })
    .setIssuer(apns.teamId)
    .setIssuedAt()
    .sign(key);

  const body = JSON.stringify({ aps: { "content-available": 1 } });
  const path = `/3/device/${pushToken}`;

  await new Promise<void>((resolve) => {
    const req = https.request(
      {
        hostname: "api.push.apple.com",
        port: 443,
        path,
        method: "POST",
        headers: {
          authorization: `bearer ${jwt}`,
          "apns-topic": passTypeId,
          "apns-push-type": "background",
          "apns-priority": "5",
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        },
      },
      (res) => {
        res.on("data", () => {});
        res.on("end", () => resolve());
      }
    );
    req.on("error", (err) => {
      console.warn("[passkit] APNs push failed", err);
      resolve();
    });
    req.write(body);
    req.end();
  });
}

/** After redeem/void/expire: notify registered devices (no-op if APNs unset). */
export const notifyPassUpdate = internalAction({
  args: { couponId: v.string() },
  handler: async (ctx, { couponId }) => {
    const tokens = await ctx.runQuery(
      internal.service.wallet.applePassMutations.listPushTokensForSerial,
      { serialNumber: couponId }
    );
    if (!tokens.length) return { sent: 0 };
    if (!getPasskitApnsConfig()) {
      console.info("[passkit] APNs not configured; devices will refresh on next pull");
      return { sent: 0 };
    }
    await Promise.all(tokens.map((t) => sendApnsSilent(t)));
    return { sent: tokens.length };
  },
});
