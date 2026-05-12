import type { CasualRewardKind } from "../service/reward/casualRewardTypes.js";

export interface PassGrant {
  kind: CasualRewardKind;
  amount: number;
}

export interface PassLevelRewardRow {
  level: number;
  free: PassGrant[];
  standard: PassGrant[];
  deluxe: PassGrant[];
}

/** 示例配表：豪华 ≥ 标准 ≥ 免费（券） */
export const PASS_LEVEL_REWARDS: PassLevelRewardRow[] = [
  {
    level: 1,
    free: [{ kind: "seasonVoucher", amount: 1 }],
    standard: [
      { kind: "seasonVoucher", amount: 2 },
      { kind: "coins", amount: 50 },
    ],
    deluxe: [
      { kind: "seasonVoucher", amount: 3 },
      { kind: "coins", amount: 120 },
      { kind: "gems", amount: 2 },
    ],
  },
  {
    level: 2,
    free: [{ kind: "coins", amount: 30 }],
    standard: [
      { kind: "seasonVoucher", amount: 1 },
      { kind: "gems", amount: 1 },
    ],
    deluxe: [
      { kind: "seasonVoucher", amount: 2 },
      { kind: "gems", amount: 3 },
    ],
  },
  {
    level: 3,
    free: [{ kind: "seasonXp", amount: 50 }],
    standard: [{ kind: "seasonVoucher", amount: 2 }],
    deluxe: [
      { kind: "seasonVoucher", amount: 4 },
      { kind: "coins", amount: 200 },
    ],
  },
];

export function passRewardForLevel(
  track: "free" | "standard" | "deluxe",
  level: number
): { grants: PassGrant[] } | null {
  const row = PASS_LEVEL_REWARDS.find((r) => r.level === level);
  if (!row) return null;
  return { grants: row[track] };
}
