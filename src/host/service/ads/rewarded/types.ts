export type RewardedAdChannel = "crazygames" | "poki" | "partner" | "dev";

export type RewardedAdShowResult =
  | { ok: true; channel: RewardedAdChannel; clientProof?: string }
  | {
      ok: false;
      reason: "unfilled" | "adblock" | "user_dismissed" | "sdk_error" | "unsupported";
    };

export interface RewardedAdProvider {
  readonly id: string;
  readonly channel: RewardedAdChannel;
  readonly priority: number;
  isSupported(): boolean;
  showRewardedAd(): Promise<RewardedAdShowResult>;
}
