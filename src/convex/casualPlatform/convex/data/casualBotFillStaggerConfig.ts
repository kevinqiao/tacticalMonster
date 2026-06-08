/** 虚拟 bot 分批入场：revealAt 随机延迟（ms） */
export const CASUAL_BOT_REVEAL_DELAY_MIN_MS = 3_000;
export const CASUAL_BOT_REVEAL_DELAY_MAX_MS = 12_000;
export const CASUAL_BOT_REVEAL_STAGGER_GAP_MS = 800;

/** rollout 缺失时 bot 对局时长 fallback（ms） */
export const CASUAL_BOT_DURATION_FALLBACK_MIN_MS = 2_000;
export const CASUAL_BOT_DURATION_FALLBACK_MAX_MS = 8_000;

function pseudoUnit(seed: number, i: number): number {
  let x = Math.imul(seed ^ (i * 374761393), 2654435761);
  x ^= x >>> 13;
  x ^= x << 17;
  x ^= x >>> 5;
  return (x >>> 0) / 4294967296;
}

export function pickInitialBotRevealCount(
  targetBotCount: number,
  sessionSeed: number
): number {
  if (targetBotCount <= 1) return targetBotCount;
  const min = 1;
  const max = targetBotCount - 1;
  const span = max - min + 1;
  return min + Math.floor(pseudoUnit(sessionSeed, 53) * span);
}

export function pickDurationFallbackMs(sessionSeed: number, slotIndex: number): number {
  const min = CASUAL_BOT_DURATION_FALLBACK_MIN_MS;
  const max = CASUAL_BOT_DURATION_FALLBACK_MAX_MS;
  const span = max - min + 1;
  return min + Math.floor(pseudoUnit(sessionSeed, slotIndex + 61) * span);
}

/** 确定性 shuffle 后取前 count 个 uid */
export function pickUidsForInitialReveal(
  virtualUids: string[],
  count: number,
  sessionSeed: number
): Set<string> {
  const sorted = [...virtualUids].sort((a, b) => a.localeCompare(b));
  const shuffled = sorted
    .map((uid, i) => ({ uid, k: pseudoUnit(sessionSeed, i + 71) }))
    .sort((a, b) => a.k - b.k)
    .map((e) => e.uid);
  return new Set(shuffled.slice(0, count));
}

function pickRevealDelayMs(sessionSeed: number, slotIndex: number): number {
  const min = CASUAL_BOT_REVEAL_DELAY_MIN_MS;
  const max = CASUAL_BOT_REVEAL_DELAY_MAX_MS;
  const span = max - min + 1;
  return min + Math.floor(pseudoUnit(sessionSeed, slotIndex + 83) * span);
}

/** 为每个虚拟 uid 分配 revealAt；首批 instant，其余 stagger */
export function planBotRevealSchedule(args: {
  virtualUids: string[];
  sessionSeed: number;
  now: number;
}): Array<{ uid: string; revealAt: number }> {
  const { virtualUids, sessionSeed, now } = args;
  if (virtualUids.length === 0) return [];

  const initialCount = pickInitialBotRevealCount(virtualUids.length, sessionSeed);
  const initialSet = pickUidsForInitialReveal(virtualUids, initialCount, sessionSeed);

  const delayed: Array<{ uid: string; revealAt: number }> = [];
  let delayIdx = 0;
  for (const uid of virtualUids) {
    if (initialSet.has(uid)) {
      delayed.push({ uid, revealAt: now });
    } else {
      delayed.push({
        uid,
        revealAt: now + pickRevealDelayMs(sessionSeed, delayIdx++),
      });
    }
  }

  delayed.sort((a, b) => a.revealAt - b.revealAt);
  for (let i = 1; i < delayed.length; i++) {
    const prev = delayed[i - 1]!.revealAt;
    if (delayed[i]!.revealAt - prev < CASUAL_BOT_REVEAL_STAGGER_GAP_MS) {
      delayed[i]!.revealAt = prev + CASUAL_BOT_REVEAL_STAGGER_GAP_MS;
    }
  }
  return delayed;
}

export type AsyncLeaderboardRowInput =
  | { kind: "human"; status: string }
  | { kind: "bot"; revealAt?: number; duration?: number };

export function resolveAsyncLeaderboardRowState(
  row: AsyncLeaderboardRowInput,
  now: number
): "matching" | "playing" | "scored" {
  if (row.kind === "human") {
    const submitted =
      row.status === "finished" || row.status === "confirmed" || row.status === "settled";
    return submitted ? "scored" : "playing";
  }
  const at = row.revealAt;
  if (at == null || now < at) return "matching";
  const doneAt = at + (row.duration ?? 0);
  if (now < doneAt) return "playing";
  return "scored";
}
