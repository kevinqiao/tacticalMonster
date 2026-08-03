import type { ConvexReactClient } from "convex/react";
import type { FunctionReference } from "convex/server";

export type WalletPassProviderId = "apple" | "google";

export type RequestWalletPassResult =
  | { ok: true; provider: "apple"; downloadUrl: string }
  | { ok: false; provider: WalletPassProviderId; error: string };

/**
 * Player-facing wallet pass entry. Apple downloads a .pkpass; Google is a stub.
 */
export async function requestWalletPass(opts: {
  provider: WalletPassProviderId;
  couponId: string;
  http: ConvexReactClient;
  createAppleWalletPass: FunctionReference<"action">;
}): Promise<RequestWalletPassResult> {
  if (opts.provider === "google") {
    return { ok: false, provider: "google", error: "not_implemented" };
  }

  const res = (await opts.http.action(opts.createAppleWalletPass, {
    couponId: opts.couponId,
  })) as { ok: true; downloadUrl: string } | { ok: false; error: string };
  if (!res.ok) {
    return { ok: false, provider: "apple", error: res.error };
  }
  return { ok: true, provider: "apple", downloadUrl: res.downloadUrl };
}
