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

function buildPassLevels(maxLevel: number): PassLevelRewardRow[] {
  const rows: PassLevelRewardRow[] = [];
  for (let level = 1; level <= maxLevel; level++) {
    const free: PassGrant[] = [];
    const standard: PassGrant[] = [];
    const deluxe: PassGrant[] = [];

    if (level % 5 === 1) {
      free.push({ kind: "seasonVoucher", amount: 1 });
      standard.push({ kind: "seasonVoucher", amount: 2 });
      deluxe.push({ kind: "seasonVoucher", amount: 3 });
    }
    if (level % 3 === 0) {
      free.push({ kind: "coins", amount: 20 + level * 2 });
      standard.push({ kind: "coins", amount: 40 + level * 3 });
      deluxe.push({ kind: "coins", amount: 80 + level * 4 });
    }
    if (level % 4 === 2) {
      standard.push({ kind: "gems", amount: 1 });
      deluxe.push({ kind: "gems", amount: 2 });
    }
    if (level % 10 === 0) {
      deluxe.push({ kind: "gems", amount: 5 });
    }

    rows.push({ level, free, standard, deluxe });
  }
  return rows;
}

/** Pass 1～20 级；豪华 ≥ 标准 ≥ 免费 */
export const PASS_LEVEL_REWARDS: PassLevelRewardRow[] = buildPassLevels(20);

export const PASS_MAX_LEVEL = PASS_LEVEL_REWARDS.length;

export function passRewardForLevel(
  track: "free" | "standard" | "deluxe",
  level: number
): { grants: PassGrant[] } | null {
  const row = PASS_LEVEL_REWARDS.find((r) => r.level === level);
  if (!row) return null;
  const grants = row[track];
  return grants.length > 0 ? { grants } : null;
}
