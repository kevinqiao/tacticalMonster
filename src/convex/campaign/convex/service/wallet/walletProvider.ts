/**
 * Wallet delivery port — Apple implemented; Google stub for later.
 */

import { isPasskitConfigured } from "./passkitEnv";

export type WalletProviderId = "apple" | "google";

export type CreateWalletPassResult =
  | { ok: true; provider: WalletProviderId; downloadUrl: string }
  | { ok: false; provider: WalletProviderId; error: string };

export interface WalletPassProvider {
  readonly id: WalletProviderId;
  isConfigured(): boolean;
}

export class ApplePassKitProvider implements WalletPassProvider {
  readonly id = "apple" as const;
  isConfigured(): boolean {
    return isPasskitConfigured();
  }
}

export class GoogleWalletProvider implements WalletPassProvider {
  readonly id = "google" as const;
  isConfigured(): boolean {
    return false;
  }
  createPass(): CreateWalletPassResult {
    return { ok: false, provider: "google", error: "not_implemented" };
  }
}

export function resolveWalletProvider(id: WalletProviderId): WalletPassProvider {
  if (id === "google") return new GoogleWalletProvider();
  return new ApplePassKitProvider();
}
