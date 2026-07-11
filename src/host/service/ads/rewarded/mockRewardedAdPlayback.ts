import type { RewardedAdShowResult } from "./types";

type PlaybackRequest = {
  durationMs: number;
  resolve: (result: RewardedAdShowResult) => void;
};

let active: PlaybackRequest | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeMockRewardedAdPlayback(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getActiveMockRewardedAdPlayback(): { durationMs: number } | null {
  if (!active) return null;
  return { durationMs: active.durationMs };
}

export function runMockRewardedAdPlayback(durationMs: number): Promise<RewardedAdShowResult> {
  if (active) {
    return Promise.resolve({ ok: false, reason: "sdk_error" });
  }
  return new Promise((resolve) => {
    active = { durationMs, resolve };
    notify();
  });
}

export function finishMockRewardedAdPlayback(success: boolean): void {
  if (!active) return;
  const { resolve } = active;
  active = null;
  notify();
  resolve(
    success
      ? { ok: true, channel: "dev", clientProof: "mock" }
      : { ok: false, reason: "user_dismissed" },
  );
}
