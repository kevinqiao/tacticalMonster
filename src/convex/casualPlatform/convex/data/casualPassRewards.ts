import type { CasualRewardKind } from "../service/reward/casualRewardTypes.js";

export interface PassGrant {
  kind: CasualRewardKind;
  amount: number;
  skinId?: string;
  skinToken?: string;
}

export interface PassLevelRewardRow {
  level: number;
  free: PassGrant[];
  standard: PassGrant[];
  deluxe: PassGrant[];
}

/** 多游戏 Web 平台 Pass · 20 级（见 docs/casual-platform-multi-game-pass-design.md §4） */
const MULTI_GAME_PASS_LEVELS: PassLevelRewardRow[] = [
  {
    level: 1,
    free: [{ kind: "seasonVoucher", amount: 1 }],
    standard: [{ kind: "seasonVoucher", amount: 2 }],
    deluxe: [{ kind: "seasonVoucher", amount: 3 }],
  },
  {
    level: 2,
    free: [{ kind: "coins", amount: 24 }],
    standard: [{ kind: "coins", amount: 46 }],
    deluxe: [{ kind: "coins", amount: 88 }],
  },
  {
    level: 3,
    free: [{ kind: "coins", amount: 26 }],
    standard: [{ kind: "coins", amount: 49 }],
    deluxe: [{ kind: "coins", amount: 92 }],
  },
  {
    level: 4,
    free: [{ kind: "seasonVoucher", amount: 1 }],
    standard: [{ kind: "seasonVoucher", amount: 1 }],
    deluxe: [{ kind: "seasonVoucher", amount: 2 }],
  },
  {
    level: 5,
    free: [],
    standard: [{ kind: "skin", amount: 0, skinToken: "solitaire_card_back_standard" }],
    deluxe: [{ kind: "skin", amount: 0, skinToken: "block_piece_standard" }],
  },
  {
    level: 6,
    free: [{ kind: "coins", amount: 32 }],
    standard: [{ kind: "coins", amount: 58 }],
    deluxe: [{ kind: "coins", amount: 104 }],
  },
  {
    level: 7,
    free: [{ kind: "seasonVoucher", amount: 1 }],
    standard: [
      { kind: "skin", amount: 0, skinToken: "solitaire_table_rare" },
      { kind: "gems", amount: 1 },
    ],
    deluxe: [
      { kind: "skin", amount: 0, skinToken: "block_board_rare" },
      { kind: "gems", amount: 2 },
    ],
  },
  {
    level: 8,
    free: [{ kind: "coins", amount: 36 }],
    standard: [{ kind: "coins", amount: 64 }],
    deluxe: [{ kind: "coins", amount: 112 }],
  },
  {
    level: 9,
    free: [{ kind: "seasonVoucher", amount: 1 }],
    standard: [{ kind: "seasonVoucher", amount: 2 }],
    deluxe: [{ kind: "seasonVoucher", amount: 3 }],
  },
  {
    level: 10,
    free: [{ kind: "coins", amount: 40 }],
    standard: [{ kind: "skin", amount: 0, skinToken: "platform_avatar_standard" }],
    deluxe: [{ kind: "skin", amount: 0, skinToken: "platform_avatar_deluxe" }],
  },
  {
    level: 11,
    free: [{ kind: "coins", amount: 42 }],
    standard: [{ kind: "coins", amount: 72 }],
    deluxe: [{ kind: "coins", amount: 120 }],
  },
  {
    level: 12,
    free: [{ kind: "seasonVoucher", amount: 1 }],
    standard: [{ kind: "skin", amount: 0, skinToken: "solitaire_card_back_standard" }],
    deluxe: [{ kind: "skin", amount: 0, skinToken: "block_piece_standard" }],
  },
  {
    level: 13,
    free: [{ kind: "coins", amount: 46 }],
    standard: [{ kind: "coins", amount: 76 }],
    deluxe: [{ kind: "coins", amount: 128 }],
  },
  {
    level: 14,
    free: [{ kind: "coins", amount: 48 }],
    standard: [{ kind: "skin", amount: 0, skinToken: "town_standard" }],
    deluxe: [{ kind: "skin", amount: 0, skinToken: "town_deluxe" }],
  },
  {
    level: 15,
    free: [{ kind: "seasonVoucher", amount: 1 }],
    standard: [{ kind: "seasonVoucher", amount: 2 }],
    deluxe: [{ kind: "seasonVoucher", amount: 3 }],
  },
  {
    level: 16,
    free: [{ kind: "coins", amount: 52 }],
    standard: [{ kind: "gems", amount: 2 }],
    deluxe: [{ kind: "gems", amount: 4 }],
  },
  {
    level: 17,
    free: [{ kind: "coins", amount: 54 }],
    standard: [{ kind: "coins", amount: 84 }],
    deluxe: [{ kind: "coins", amount: 136 }],
  },
  {
    level: 18,
    free: [{ kind: "skin", amount: 0, skinToken: "finale_fragment" }],
    standard: [{ kind: "skin", amount: 0, skinToken: "platform_finale_standard" }],
    deluxe: [{ kind: "skin", amount: 0, skinToken: "platform_mvp_deluxe" }],
  },
  {
    level: 19,
    free: [{ kind: "coins", amount: 60 }],
    standard: [
      { kind: "seasonVoucher", amount: 2 },
      { kind: "coins", amount: 80 },
    ],
    deluxe: [{ kind: "skin", amount: 0, skinToken: "explorer_bonus_deluxe" }],
  },
  {
    level: 20,
    free: [{ kind: "seasonVoucher", amount: 2 }],
    standard: [{ kind: "gems", amount: 5 }],
    deluxe: [
      { kind: "skin", amount: 0, skinToken: "platform_finale_deluxe" },
      { kind: "gems", amount: 3 },
    ],
  },
];

/** Pass 1～20 级；豪华 ≥ 标准 ≥ 免费 */
export const PASS_LEVEL_REWARDS: PassLevelRewardRow[] = MULTI_GAME_PASS_LEVELS;

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
